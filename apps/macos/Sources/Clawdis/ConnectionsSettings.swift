import AppKit
import SwiftUI

struct ConnectionsSettings: View {
    @Bindable var store: ConnectionsStore
    @State private var showTelegramToken = false

    init(store: ConnectionsStore = .shared) {
        self.store = store
    }

    var body: some View {
        ScrollView(.vertical) {
            VStack(alignment: .leading, spacing: 14) {
                self.header
                self.whatsAppSection
                self.telegramSection
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.vertical, 18)
        }
        .onAppear { self.store.start() }
        .onDisappear { self.store.stop() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Connections")
                .font(.title3.weight(.semibold))
            Text("Link and monitor WhatsApp and Telegram providers.")
                .font(.callout)
                .foregroundStyle(.secondary)
        }
    }

    private var whatsAppSection: some View {
        GroupBox("WhatsApp") {
            VStack(alignment: .leading, spacing: 10) {
                self.providerHeader(
                    title: "WhatsApp Web",
                    color: self.whatsAppTint,
                    subtitle: self.whatsAppSummary)

                if let details = self.whatsAppDetails {
                    Text(details)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if let message = self.store.whatsappLoginMessage {
                    Text(message)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if let qr = self.store.whatsappLoginQrDataUrl, let image = self.qrImage(from: qr) {
                    Image(nsImage: image)
                        .resizable()
                        .interpolation(.none)
                        .frame(width: 180, height: 180)
                        .cornerRadius(8)
                }

                HStack(spacing: 12) {
                    Button {
                        Task { await self.store.startWhatsAppLogin(force: false) }
                    } label: {
                        if self.store.whatsappBusy {
                            ProgressView().controlSize(.small)
                        } else {
                            Text("Show QR")
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(self.store.whatsappBusy)

                    Button("Relink") {
                        Task { await self.store.startWhatsAppLogin(force: true) }
                    }
                    .buttonStyle(.bordered)
                    .disabled(self.store.whatsappBusy)

                    Spacer()

                    Button("Logout") {
                        Task { await self.store.logoutWhatsApp() }
                    }
                    .buttonStyle(.bordered)
                    .disabled(self.store.whatsappBusy)

                    Button("Refresh") {
                        Task { await self.store.refresh(probe: true) }
                    }
                    .buttonStyle(.bordered)
                    .disabled(self.store.isRefreshing)
                }
                .font(.caption)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var telegramSection: some View {
        GroupBox("Telegram") {
            VStack(alignment: .leading, spacing: 10) {
                self.providerHeader(
                    title: "Telegram Bot",
                    color: self.telegramTint,
                    subtitle: self.telegramSummary)

                if let details = self.telegramDetails {
                    Text(details)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if let status = self.store.configStatus {
                    Text(status)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Divider().padding(.vertical, 2)

                Grid(alignment: .leadingFirstTextBaseline, horizontalSpacing: 14, verticalSpacing: 10) {
                    GridRow {
                        self.gridLabel("Bot token")
                        if self.showTelegramToken {
                            TextField("123:abc", text: self.$store.telegramToken)
                                .textFieldStyle(.roundedBorder)
                                .disabled(self.isTelegramTokenLocked)
                        } else {
                            SecureField("123:abc", text: self.$store.telegramToken)
                                .textFieldStyle(.roundedBorder)
                                .disabled(self.isTelegramTokenLocked)
                        }
                        Toggle("Show", isOn: self.$showTelegramToken)
                            .toggleStyle(.switch)
                            .disabled(self.isTelegramTokenLocked)
                    }
                    GridRow {
                        self.gridLabel("Require mention")
                        Toggle("", isOn: self.$store.telegramRequireMention)
                            .labelsHidden()
                            .toggleStyle(.checkbox)
                    }
                    GridRow {
                        self.gridLabel("Allow from")
                        TextField("123456789, @team", text: self.$store.telegramAllowFrom)
                            .textFieldStyle(.roundedBorder)
                    }
                    GridRow {
                        self.gridLabel("Proxy")
                        TextField("socks5://localhost:9050", text: self.$store.telegramProxy)
                            .textFieldStyle(.roundedBorder)
                    }
                    GridRow {
                        self.gridLabel("Webhook URL")
                        TextField("https://example.com/telegram-webhook", text: self.$store.telegramWebhookUrl)
                            .textFieldStyle(.roundedBorder)
                    }
                    GridRow {
                        self.gridLabel("Webhook secret")
                        TextField("secret", text: self.$store.telegramWebhookSecret)
                            .textFieldStyle(.roundedBorder)
                    }
                    GridRow {
                        self.gridLabel("Webhook path")
                        TextField("/telegram-webhook", text: self.$store.telegramWebhookPath)
                            .textFieldStyle(.roundedBorder)
                    }
                }

                if self.isTelegramTokenLocked {
                    Text("Token set via TELEGRAM_BOT_TOKEN env; config edits won’t override it.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 12) {
                    Button {
                        Task { await self.store.saveTelegramConfig() }
                    } label: {
                        if self.store.isSavingConfig {
                            ProgressView().controlSize(.small)
                        } else {
                            Text("Save")
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(self.store.isSavingConfig)

                    Spacer()

                    Button("Logout") {
                        Task { await self.store.logoutTelegram() }
                    }
                    .buttonStyle(.bordered)
                    .disabled(self.store.telegramBusy)

                    Button("Refresh") {
                        Task { await self.store.refresh(probe: true) }
                    }
                    .buttonStyle(.bordered)
                    .disabled(self.store.isRefreshing)
                }
                .font(.caption)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var whatsAppTint: Color {
        guard let status = self.store.snapshot?.whatsapp else { return .secondary }
        if !status.linked { return .red }
        if status.connected { return .green }
        if status.lastError != nil { return .orange }
        return .green
    }

    private var telegramTint: Color {
        guard let status = self.store.snapshot?.telegram else { return .secondary }
        if !status.configured { return .secondary }
        if status.running { return .green }
        if status.lastError != nil { return .orange }
        return .secondary
    }

    private var whatsAppSummary: String {
        guard let status = self.store.snapshot?.whatsapp else { return "Checking…" }
        if !status.linked { return "Not linked" }
        if status.connected { return "Connected" }
        if status.running { return "Running" }
        return "Linked"
    }

    private var telegramSummary: String {
        guard let status = self.store.snapshot?.telegram else { return "Checking…" }
        if !status.configured { return "Not configured" }
        if status.running { return "Running" }
        return "Configured"
    }

    private var whatsAppDetails: String? {
        guard let status = self.store.snapshot?.whatsapp else { return nil }
        var lines: [String] = []
        if let e164 = status.`self`?.e164 ?? status.`self`?.jid {
            lines.append("Linked as \(e164)")
        }
        if let age = status.authAgeMs {
            lines.append("Auth age \(msToAge(age))")
        }
        if let last = self.date(fromMs: status.lastConnectedAt) {
            lines.append("Last connect \(relativeAge(from: last))")
        }
        if let disconnect = status.lastDisconnect {
            let when = self.date(fromMs: disconnect.at).map { relativeAge(from: $0) } ?? "unknown"
            let code = disconnect.status.map { "status \($0)" } ?? "status unknown"
            let err = disconnect.error ?? "disconnect"
            lines.append("Last disconnect \(code) · \(err) · \(when)")
        }
        if status.reconnectAttempts > 0 {
            lines.append("Reconnect attempts \(status.reconnectAttempts)")
        }
        if let msgAt = self.date(fromMs: status.lastMessageAt) {
            lines.append("Last message \(relativeAge(from: msgAt))")
        }
        if let err = status.lastError, !err.isEmpty {
            lines.append("Error: \(err)")
        }
        return lines.isEmpty ? nil : lines.joined(separator: " · ")
    }

    private var telegramDetails: String? {
        guard let status = self.store.snapshot?.telegram else { return nil }
        var lines: [String] = []
        if let source = status.tokenSource {
            lines.append("Token source: \(source)")
        }
        if let mode = status.mode {
            lines.append("Mode: \(mode)")
        }
        if let probe = status.probe {
            if probe.ok {
                if let name = probe.bot?.username {
                    lines.append("Bot: @\(name)")
                }
                if let url = probe.webhook?.url, !url.isEmpty {
                    lines.append("Webhook: \(url)")
                }
            } else {
                let code = probe.status.map { String($0) } ?? "unknown"
                lines.append("Probe failed (\(code))")
            }
        }
        if let last = self.date(fromMs: status.lastProbeAt) {
            lines.append("Last probe \(relativeAge(from: last))")
        }
        if let err = status.lastError, !err.isEmpty {
            lines.append("Error: \(err)")
        }
        return lines.isEmpty ? nil : lines.joined(separator: " · ")
    }

    private var isTelegramTokenLocked: Bool {
        self.store.snapshot?.telegram.tokenSource == "env"
    }

    private func providerHeader(title: String, color: Color, subtitle: String) -> some View {
        HStack(spacing: 10) {
            Circle()
                .fill(color)
                .frame(width: 10, height: 10)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
    }

    private func gridLabel(_ text: String) -> some View {
        Text(text)
            .font(.callout.weight(.semibold))
            .frame(width: 120, alignment: .leading)
    }

    private func date(fromMs ms: Double?) -> Date? {
        guard let ms else { return nil }
        return Date(timeIntervalSince1970: ms / 1000)
    }

    private func qrImage(from dataUrl: String) -> NSImage? {
        guard let comma = dataUrl.firstIndex(of: ",") else { return nil }
        let header = dataUrl[..<comma]
        guard header.contains("base64") else { return nil }
        let base64 = dataUrl[dataUrl.index(after: comma)...]
        guard let data = Data(base64Encoded: String(base64)) else { return nil }
        return NSImage(data: data)
    }
}
