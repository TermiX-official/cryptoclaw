import ClawdisChatUI
import ClawdisKit
import Foundation

struct IOSBridgeChatTransport: ClawdisChatTransport, Sendable {
    private let bridge: BridgeSession

    init(bridge: BridgeSession) {
        self.bridge = bridge
    }

    func setActiveSessionKey(_ sessionKey: String) async throws {
        struct Subscribe: Codable { var sessionKey: String }
        let data = try JSONEncoder().encode(Subscribe(sessionKey: sessionKey))
        let json = String(data: data, encoding: .utf8)
        try await self.bridge.sendEvent(event: "chat.subscribe", payloadJSON: json)
    }

    func requestHistory(sessionKey: String) async throws -> ClawdisChatHistoryPayload {
        struct Params: Codable { var sessionKey: String }
        let data = try JSONEncoder().encode(Params(sessionKey: sessionKey))
        let json = String(data: data, encoding: .utf8)
        let res = try await self.bridge.request(method: "chat.history", paramsJSON: json, timeoutSeconds: 15)
        return try JSONDecoder().decode(ClawdisChatHistoryPayload.self, from: res)
    }

    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [ClawdisChatAttachmentPayload]) async throws -> ClawdisChatSendResponse
    {
        struct Params: Codable {
            var sessionKey: String
            var message: String
            var thinking: String
            var attachments: [ClawdisChatAttachmentPayload]?
            var timeoutMs: Int
            var idempotencyKey: String
        }

        let params = Params(
            sessionKey: sessionKey,
            message: message,
            thinking: thinking,
            attachments: attachments.isEmpty ? nil : attachments,
            timeoutMs: 30000,
            idempotencyKey: idempotencyKey)
        let data = try JSONEncoder().encode(params)
        let json = String(data: data, encoding: .utf8)
        let res = try await self.bridge.request(method: "chat.send", paramsJSON: json, timeoutSeconds: 35)
        return try JSONDecoder().decode(ClawdisChatSendResponse.self, from: res)
    }

    func requestHealth(timeoutMs: Int) async throws -> Bool {
        let seconds = max(1, Int(ceil(Double(timeoutMs) / 1000.0)))
        let res = try await self.bridge.request(method: "health", paramsJSON: nil, timeoutSeconds: seconds)
        return (try? JSONDecoder().decode(ClawdisGatewayHealthOK.self, from: res))?.ok ?? true
    }

    func events() -> AsyncStream<ClawdisChatTransportEvent> {
        AsyncStream { continuation in
            let task = Task {
                let stream = await self.bridge.subscribeServerEvents()
                for await evt in stream {
                    if Task.isCancelled { return }
                    switch evt.event {
                    case "tick":
                        continuation.yield(.tick)
                    case "seqGap":
                        continuation.yield(.seqGap)
                    case "health":
                        guard let json = evt.payloadJSON, let data = json.data(using: .utf8) else { break }
                        let ok = (try? JSONDecoder().decode(ClawdisGatewayHealthOK.self, from: data))?.ok ?? true
                        continuation.yield(.health(ok: ok))
                    case "chat":
                        guard let json = evt.payloadJSON, let data = json.data(using: .utf8) else { break }
                        if let payload = try? JSONDecoder().decode(ClawdisChatEventPayload.self, from: data) {
                            continuation.yield(.chat(payload))
                        }
                    default:
                        break
                    }
                }
            }

            continuation.onTermination = { @Sendable _ in
                task.cancel()
            }
        }
    }
}
