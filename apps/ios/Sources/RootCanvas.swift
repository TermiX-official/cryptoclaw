import SwiftUI

struct RootCanvas: View {
    @EnvironmentObject private var appModel: NodeAppModel
    @State private var presentedSheet: PresentedSheet?

    private enum PresentedSheet: Identifiable {
        case settings
        case chat

        var id: Int {
            switch self {
            case .settings: 0
            case .chat: 1
            }
        }
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            ScreenTab()

            VStack(spacing: 10) {
                OverlayButton(systemImage: "text.bubble.fill") {
                    self.presentedSheet = .chat
                }
                .accessibilityLabel("Chat")

                OverlayButton(systemImage: "gearshape.fill") {
                    self.presentedSheet = .settings
                }
                .accessibilityLabel("Settings")
            }
            .padding(.top, 10)
            .padding(.trailing, 10)
        }
        .sheet(item: self.$presentedSheet) { sheet in
            switch sheet {
            case .settings:
                SettingsTab()
            case .chat:
                ChatSheet(bridge: self.appModel.bridgeSession)
            }
        }
        .preferredColorScheme(.dark)
    }
}

private struct OverlayButton: View {
    let systemImage: String
    let action: () -> Void

    var body: some View {
        Button(action: self.action) {
            Image(systemName: self.systemImage)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.primary)
                .padding(10)
                .background {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(.ultraThinMaterial)
                        .overlay {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(
                                    LinearGradient(
                                        colors: [
                                            .white.opacity(0.18),
                                            .white.opacity(0.04),
                                            .clear,
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing))
                                .blendMode(.overlay)
                        }
                        .overlay {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .strokeBorder(.white.opacity(0.18), lineWidth: 0.5)
                        }
                        .shadow(color: .black.opacity(0.35), radius: 12, y: 6)
                }
        }
        .buttonStyle(.plain)
    }
}
