import AppKit
import Foundation
import SwiftUI

enum DebugActions {
    private static let verboseDefaultsKey = "clawdis.debug.verboseMain"
    private static let sessionMenuLimit = 12

    @MainActor
    static func openAgentEventsWindow() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 620, height: 420),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false)
        window.title = "Agent Events"
        window.isReleasedWhenClosed = false
        window.contentView = NSHostingView(rootView: AgentEventsWindow())
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @MainActor
    static func openLog() {
        let path = self.pinoLogPath()
        let url = URL(fileURLWithPath: path)
        guard FileManager.default.fileExists(atPath: path) else {
            let alert = NSAlert()
            alert.messageText = "Log file not found"
            alert.informativeText = path
            alert.runModal()
            return
        }
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }

    @MainActor
    static func openConfigFolder() {
        let url = FileManager.default
            .homeDirectoryForCurrentUser
            .appendingPathComponent(".clawdis", isDirectory: true)
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }

    @MainActor
    static func openSessionStore() {
        let path = self.resolveSessionStorePath()
        let url = URL(fileURLWithPath: path)
        if FileManager.default.fileExists(atPath: path) {
            NSWorkspace.shared.activateFileViewerSelecting([url])
        } else {
            NSWorkspace.shared.open(url.deletingLastPathComponent())
        }
    }

    static func sendTestNotification() async {
        _ = await NotificationManager().send(title: "Clawdis", body: "Test notification", sound: nil)
    }

    static func sendDebugVoice() async -> Result<String, DebugActionError> {
        let message = """
        This is a debug test from the Mac app. Reply with "Debug test works (and a funny pun)" \
        if you received that.
        """
        let config = await MainActor.run { AppStateStore.shared.voiceWakeForwardConfig }
        let shouldForward = config.enabled

        if shouldForward {
            let result = await VoiceWakeForwarder.forward(transcript: message, config: config)
            switch result {
            case .success:
                return .success("Forwarded. Await reply.")
            case let .failure(error):
                let detail = error.localizedDescription.trimmingCharacters(in: .whitespacesAndNewlines)
                return .failure(.message("Forward failed: \(detail)"))
            }
        }

        do {
            let status = await AgentRPC.shared.status()
            if !status.ok {
                try await AgentRPC.shared.start()
            }

            let rpcResult = await AgentRPC.shared.send(
                text: message,
                thinking: "low",
                session: "main",
                deliver: true,
                to: nil)

            if rpcResult.ok {
                return .success("Sent locally via voice wake path.")
            } else {
                let reason = rpcResult.error?.trimmingCharacters(in: .whitespacesAndNewlines)
                let detail = (reason?.isEmpty == false)
                    ? reason!
                    : "No error returned. Check /tmp/clawdis.log or rpc output."
                return .failure(.message("Local send failed: \(detail)"))
            }
        } catch {
            let detail = error.localizedDescription.trimmingCharacters(in: .whitespacesAndNewlines)
            return .failure(.message("Local send failed: \(detail)"))
        }
    }

    static func restartGateway() {
        Task { @MainActor in
            GatewayProcessManager.shared.stop()
            try? await Task.sleep(nanoseconds: 300_000_000)
            GatewayProcessManager.shared.setActive(true)
        }
    }

    static func pinoLogPath() -> String {
        let df = DateFormatter()
        df.calendar = Calendar(identifier: .iso8601)
        df.locale = Locale(identifier: "en_US_POSIX")
        df.dateFormat = "yyyy-MM-dd"
        let today = df.string(from: Date())
        let rolling = URL(fileURLWithPath: "/tmp/clawdis/clawdis-\(today).log").path
        if FileManager.default.fileExists(atPath: rolling) { return rolling }
        return "/tmp/clawdis.log"
    }

    @MainActor
    static func runHealthCheckNow() async {
        await HealthStore.shared.refresh(onDemand: true)
    }

    static func sendTestHeartbeat() async -> Result<ControlHeartbeatEvent?, Error> {
        do {
            _ = await AgentRPC.shared.setHeartbeatsEnabled(true)
            await ControlChannel.shared.configure()
            let data = try await ControlChannel.shared.request(method: "last-heartbeat")
            if let evt = try? JSONDecoder().decode(ControlHeartbeatEvent.self, from: data) {
                return .success(evt)
            }
            return .success(nil)
        } catch {
            return .failure(error)
        }
    }

    static var verboseLoggingEnabledMain: Bool {
        UserDefaults.standard.bool(forKey: self.verboseDefaultsKey)
    }

    static func toggleVerboseLoggingMain() async -> Bool {
        let newValue = !self.verboseLoggingEnabledMain
        UserDefaults.standard.set(newValue, forKey: self.verboseDefaultsKey)
        _ = try? await ControlChannel.shared.request(
            method: "system-event",
            params: ["text": AnyHashable("verbose-main:\(newValue ? "on" : "off")")])
        return newValue
    }

    @MainActor
    static func restartApp() {
        let url = Bundle.main.bundleURL
        let task = Process()
        task.launchPath = "/usr/bin/open"
        task.arguments = [url.path]
        try? task.run()
        task.waitUntilExit()
        NSApp.terminate(nil)
    }

    private static func resolveSessionStorePath() -> String {
        let defaultPath = SessionLoader.defaultStorePath
        let configURL = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".clawdis/clawdis.json")
        guard
            let data = try? Data(contentsOf: configURL),
            let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let inbound = parsed["inbound"] as? [String: Any],
            let reply = inbound["reply"] as? [String: Any],
            let session = reply["session"] as? [String: Any],
            let path = session["store"] as? String,
            !path.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else {
            return defaultPath
        }
        return path
    }

    // MARK: - Sessions (thinking / verbose)

    static func recentSessions(limit: Int = sessionMenuLimit) async -> [SessionRow] {
        let hints = SessionLoader.configHints()
        let store = SessionLoader.resolveStorePath(override: hints.storePath)
        let defaults = SessionDefaults(
            model: hints.model ?? SessionLoader.fallbackModel,
            contextTokens: hints.contextTokens ?? SessionLoader.fallbackContextTokens)
        guard let rows = try? await SessionLoader.loadRows(at: store, defaults: defaults) else { return [] }
        return Array(rows.prefix(limit))
    }

    static func updateSession(
        key: String,
        thinking: String?,
        verbose: String?) async throws
    {
        let hints = SessionLoader.configHints()
        let store = SessionLoader.resolveStorePath(override: hints.storePath)
        let url = URL(fileURLWithPath: store)
        guard FileManager.default.fileExists(atPath: store) else {
            throw DebugActionError.message("Session store missing at \(store)")
        }

        let data = try Data(contentsOf: url)
        var decoded = try JSONDecoder().decode([String: SessionEntryRecord].self, from: data)
        var entry = decoded[key] ?? SessionEntryRecord(
            sessionId: nil,
            updatedAt: Date().timeIntervalSince1970 * 1000,
            systemSent: nil,
            abortedLastRun: nil,
            thinkingLevel: nil,
            verboseLevel: nil,
            inputTokens: nil,
            outputTokens: nil,
            totalTokens: nil,
            model: nil,
            contextTokens: nil)

        entry = SessionEntryRecord(
            sessionId: entry.sessionId,
            updatedAt: Date().timeIntervalSince1970 * 1000,
            systemSent: entry.systemSent,
            abortedLastRun: entry.abortedLastRun,
            thinkingLevel: thinking,
            verboseLevel: verbose,
            inputTokens: entry.inputTokens,
            outputTokens: entry.outputTokens,
            totalTokens: entry.totalTokens,
            model: entry.model,
            contextTokens: entry.contextTokens)

        decoded[key] = entry
        let encoded = try JSONEncoder().encode(decoded)
        try encoded.write(to: url, options: [.atomic])
    }

    @MainActor
    static func openSessionStoreInCode() {
        let path = SessionLoader.defaultStorePath
        let proc = Process()
        proc.launchPath = "/usr/bin/env"
        proc.arguments = ["code", path]
        try? proc.run()
    }
}

enum DebugActionError: LocalizedError {
    case message(String)

    var errorDescription: String? {
        switch self {
        case let .message(text):
            text
        }
    }
}
