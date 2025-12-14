import Foundation

public enum ClawdisChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(ClawdisChatEventPayload)
    case seqGap
}

public protocol ClawdisChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> ClawdisChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [ClawdisChatAttachmentPayload]) async throws -> ClawdisChatSendResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<ClawdisChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension ClawdisChatTransport {
    public func setActiveSessionKey(_: String) async throws {}
}
