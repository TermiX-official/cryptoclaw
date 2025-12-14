import SwiftUI

@MainActor
public struct ClawdisChatView: View {
    @StateObject private var viewModel: ClawdisChatViewModel
    @State private var scrollerBottomID = UUID()

    public init(viewModel: ClawdisChatViewModel) {
        self._viewModel = StateObject(wrappedValue: viewModel)
    }

    public var body: some View {
        ZStack {
            ClawdisChatTheme.surface
                .ignoresSafeArea()

            VStack(spacing: 14) {
                self.header
                self.messageList
                ClawdisChatComposer(viewModel: self.viewModel)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
            .frame(maxWidth: 1040)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .onAppear { self.viewModel.load() }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Clawd Chat")
                    .font(.title2.weight(.semibold))
                Text("Session \(self.viewModel.sessionKey) · \(self.viewModel.healthOK ? "Connected" : "Connecting…")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                self.viewModel.refresh()
            } label: {
                Label("Refresh", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
        }
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 14) {
                    ForEach(self.viewModel.messages) { msg in
                        ChatMessageBubble(message: msg)
                            .frame(
                                maxWidth: .infinity,
                                alignment: msg.role.lowercased() == "user" ? .trailing : .leading)
                    }

                    if self.viewModel.pendingRunCount > 0 {
                        ChatTypingIndicatorBubble()
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Color.clear
                        .frame(height: 1)
                        .id(self.scrollerBottomID)
                }
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
            }
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(ClawdisChatTheme.card)
                    .shadow(color: .black.opacity(0.05), radius: 12, y: 6))
            .onChange(of: self.viewModel.messages.count) { _, _ in
                withAnimation(.snappy(duration: 0.22)) {
                    proxy.scrollTo(self.scrollerBottomID, anchor: .bottom)
                }
            }
            .onChange(of: self.viewModel.pendingRunCount) { _, _ in
                withAnimation(.snappy(duration: 0.22)) {
                    proxy.scrollTo(self.scrollerBottomID, anchor: .bottom)
                }
            }
        }
    }
}
