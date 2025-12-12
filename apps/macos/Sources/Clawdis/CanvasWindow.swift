import AppKit
import Foundation
import OSLog
import WebKit
import QuartzCore

private let canvasWindowLogger = Logger(subsystem: "com.steipete.clawdis", category: "Canvas")

private enum CanvasLayout {
    static let panelSize = NSSize(width: 520, height: 680)
    static let windowSize = NSSize(width: 1120, height: 840)
    static let anchorPadding: CGFloat = 8
}

final class CanvasPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

enum CanvasPresentation {
    case window
    case panel(anchorProvider: () -> NSRect?)

    var isPanel: Bool {
        if case .panel = self { return true }
        return false
    }
}

@MainActor
final class CanvasWindowController: NSWindowController, WKNavigationDelegate, NSWindowDelegate {
    private let sessionKey: String
    private let root: URL
    private let sessionDir: URL
    private let schemeHandler: CanvasSchemeHandler
    private let webView: WKWebView
    private let watcher: CanvasFileWatcher
    let presentation: CanvasPresentation

    var onVisibilityChanged: ((Bool) -> Void)?

    init(sessionKey: String, root: URL, presentation: CanvasPresentation) throws {
        self.sessionKey = sessionKey
        self.root = root
        self.presentation = presentation

        let safeSessionKey = CanvasWindowController.sanitizeSessionKey(sessionKey)
        self.sessionDir = root.appendingPathComponent(safeSessionKey, isDirectory: true)
        try FileManager.default.createDirectory(at: self.sessionDir, withIntermediateDirectories: true)

        self.schemeHandler = CanvasSchemeHandler(root: root)

        let config = WKWebViewConfiguration()
        config.userContentController = WKUserContentController()
        config.preferences.isElementFullscreenEnabled = true
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        config.setURLSchemeHandler(self.schemeHandler, forURLScheme: CanvasScheme.scheme)

        self.webView = WKWebView(frame: .zero, configuration: config)
        self.webView.setValue(false, forKey: "drawsBackground")

        self.watcher = CanvasFileWatcher(url: self.sessionDir) { [weak webView] in
            Task { @MainActor in
                webView?.reload()
            }
        }

        let content = HoverChromeContainerView(containing: self.webView)
        let window = Self.makeWindow(for: presentation, contentView: content)
        super.init(window: window)

        self.webView.navigationDelegate = self
        self.window?.delegate = self

        self.watcher.start()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    @MainActor deinit {
        self.watcher.stop()
    }

    func showCanvas(path: String? = nil) {
        if case .panel(let anchorProvider) = self.presentation {
            self.presentAnchoredPanel(anchorProvider: anchorProvider)
            if let path {
                self.goto(path: path)
            } else {
                self.goto(path: "/")
            }
            return
        }

        self.showWindow(nil)
        self.window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        if let path {
            self.goto(path: path)
        } else {
            self.goto(path: "/")
        }
        self.onVisibilityChanged?(true)
    }

    func hideCanvas() {
        if case .panel = self.presentation {
            self.window?.orderOut(nil)
        } else {
            self.close()
        }
        self.onVisibilityChanged?(false)
    }

    func goto(path: String) {
        guard let url = CanvasScheme.makeURL(session: CanvasWindowController.sanitizeSessionKey(self.sessionKey), path: path) else {
            canvasWindowLogger.error("invalid canvas url session=\(self.sessionKey, privacy: .public) path=\(path, privacy: .public)")
            return
        }
        canvasWindowLogger.debug("canvas goto \(url.absoluteString, privacy: .public)")
        self.webView.load(URLRequest(url: url))
    }

    func eval(javaScript: String) async -> String {
        await withCheckedContinuation { cont in
            self.webView.evaluateJavaScript(javaScript) { result, error in
                if let error {
                    cont.resume(returning: "error: \(error.localizedDescription)")
                    return
                }
                if let result {
                    cont.resume(returning: String(describing: result))
                } else {
                    cont.resume(returning: "")
                }
            }
        }
    }

    func snapshot(to outPath: String?) async throws -> String {
        let image: NSImage = try await withCheckedThrowingContinuation { cont in
            self.webView.takeSnapshot(with: nil) { image, error in
                if let error {
                    cont.resume(throwing: error)
                    return
                }
                guard let image else {
                    cont.resume(throwing: NSError(domain: "Canvas", code: 11, userInfo: [
                        NSLocalizedDescriptionKey: "snapshot returned nil image",
                    ]))
                    return
                }
                cont.resume(returning: image)
            }
        }

        guard let tiff = image.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiff),
              let png = rep.representation(using: .png, properties: [:])
        else {
            throw NSError(domain: "Canvas", code: 12, userInfo: [
                NSLocalizedDescriptionKey: "failed to encode png",
            ])
        }

        let path: String
        if let outPath, !outPath.isEmpty {
            path = outPath
        } else {
            let ts = Int(Date().timeIntervalSince1970)
            path = "/tmp/clawdis-canvas-\(CanvasWindowController.sanitizeSessionKey(self.sessionKey))-\(ts).png"
        }

        try png.write(to: URL(fileURLWithPath: path), options: [.atomic])
        return path
    }

    var directoryPath: String {
        self.sessionDir.path
    }

    // MARK: - Window

    private static func makeWindow(for presentation: CanvasPresentation, contentView: NSView) -> NSWindow {
        switch presentation {
        case .window:
            let window = NSWindow(
                contentRect: NSRect(origin: .zero, size: CanvasLayout.windowSize),
                styleMask: [.titled, .closable, .resizable, .miniaturizable],
                backing: .buffered,
                defer: false)
            window.title = "Clawdis Canvas"
            window.contentView = contentView
            window.center()
            window.minSize = NSSize(width: 880, height: 680)
            return window

        case .panel:
            let panel = CanvasPanel(
                contentRect: NSRect(origin: .zero, size: CanvasLayout.panelSize),
                styleMask: [.borderless],
                backing: .buffered,
                defer: false)
            panel.level = .statusBar
            panel.hasShadow = true
            panel.isMovable = false
            panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
            panel.titleVisibility = .hidden
            panel.titlebarAppearsTransparent = true
            panel.backgroundColor = .clear
            panel.isOpaque = false
            panel.contentView = contentView
            panel.becomesKeyOnlyIfNeeded = true
            panel.hidesOnDeactivate = false
            return panel
        }
    }

    func presentAnchoredPanel(anchorProvider: @escaping () -> NSRect?) {
        guard case .panel = self.presentation, let window else { return }
        self.repositionPanel(using: anchorProvider)
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        window.makeFirstResponder(self.webView)
        self.onVisibilityChanged?(true)
    }

    private func repositionPanel(using anchorProvider: () -> NSRect?) {
        guard let panel = self.window else { return }
        guard let anchor = anchorProvider() else { return }

        var frame = panel.frame
        let screen = NSScreen.screens.first { screen in
            screen.frame.contains(anchor.origin) || screen.frame.contains(NSPoint(x: anchor.midX, y: anchor.midY))
        } ?? NSScreen.main

        if let screen {
            let minX = screen.frame.minX + CanvasLayout.anchorPadding
            let maxX = screen.frame.maxX - frame.width - CanvasLayout.anchorPadding
            frame.origin.x = min(max(round(anchor.midX - frame.width / 2), minX), maxX)
            let desiredY = anchor.minY - frame.height - CanvasLayout.anchorPadding
            frame.origin.y = max(desiredY, screen.frame.minY + CanvasLayout.anchorPadding)
        } else {
            frame.origin.x = round(anchor.midX - frame.width / 2)
            frame.origin.y = anchor.minY - frame.height
        }
        panel.setFrame(frame, display: false)
    }

    // MARK: - WKNavigationDelegate

    @MainActor
    func webView(
        _: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void)
    {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.scheme == CanvasScheme.scheme {
            decisionHandler(.allow)
            return
        }
        NSWorkspace.shared.open(url)
        decisionHandler(.cancel)
    }

    // MARK: - NSWindowDelegate

    func windowWillClose(_: Notification) {
        self.onVisibilityChanged?(false)
    }

    // MARK: - Helpers

    private static func sanitizeSessionKey(_ key: String) -> String {
        let trimmed = key.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return "main" }
        let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-+")
        let scalars = trimmed.unicodeScalars.map { allowed.contains($0) ? Character($0) : "_" }
        return String(scalars)
    }
}

// MARK: - Hover chrome container

private final class PassthroughView: NSView {
    override func hitTest(_: NSPoint) -> NSView? { nil }
}

private final class HoverChromeContainerView: NSView {
    private let content: NSView
    private let chrome: NSView
    private var tracking: NSTrackingArea?

    init(containing content: NSView) {
        self.content = content
        self.chrome = PassthroughView(frame: .zero)
        super.init(frame: .zero)

        self.wantsLayer = true
        self.layer?.cornerRadius = 12
        self.layer?.masksToBounds = true
        self.layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor

        self.content.translatesAutoresizingMaskIntoConstraints = false
        self.addSubview(self.content)

        self.chrome.translatesAutoresizingMaskIntoConstraints = false
        self.chrome.wantsLayer = true
        self.chrome.layer?.cornerRadius = 12
        self.chrome.layer?.masksToBounds = true
        self.chrome.layer?.borderWidth = 1
        self.chrome.layer?.borderColor = NSColor.black.withAlphaComponent(0.18).cgColor
        self.chrome.layer?.backgroundColor = NSColor.black.withAlphaComponent(0.02).cgColor
        self.chrome.alphaValue = 0
        self.addSubview(self.chrome)

        NSLayoutConstraint.activate([
            self.content.leadingAnchor.constraint(equalTo: self.leadingAnchor),
            self.content.trailingAnchor.constraint(equalTo: self.trailingAnchor),
            self.content.topAnchor.constraint(equalTo: self.topAnchor),
            self.content.bottomAnchor.constraint(equalTo: self.bottomAnchor),

            self.chrome.leadingAnchor.constraint(equalTo: self.leadingAnchor),
            self.chrome.trailingAnchor.constraint(equalTo: self.trailingAnchor),
            self.chrome.topAnchor.constraint(equalTo: self.topAnchor),
            self.chrome.bottomAnchor.constraint(equalTo: self.bottomAnchor),
        ])
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        if let tracking {
            self.removeTrackingArea(tracking)
        }
        let area = NSTrackingArea(
            rect: self.bounds,
            options: [.activeAlways, .mouseEnteredAndExited, .inVisibleRect],
            owner: self,
            userInfo: nil)
        self.addTrackingArea(area)
        self.tracking = area
    }

    override func mouseEntered(with _: NSEvent) {
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.12
            ctx.timingFunction = CAMediaTimingFunction(name: .easeOut)
            self.chrome.animator().alphaValue = 1
        }
    }

    override func mouseExited(with _: NSEvent) {
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.16
            ctx.timingFunction = CAMediaTimingFunction(name: .easeOut)
            self.chrome.animator().alphaValue = 0
        }
    }
}
