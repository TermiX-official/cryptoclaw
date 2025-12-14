import Testing
import WebKit
@testable import Clawdis

@Suite struct ScreenControllerTests {
    @Test @MainActor func canvasModeConfiguresWebViewForTouch() {
        let screen = ScreenController()

        #expect(screen.mode == .canvas)
        #expect(screen.webView.isOpaque == false)
        #expect(screen.webView.backgroundColor == .clear)

        let scrollView = screen.webView.scrollView
        #expect(scrollView.backgroundColor == .clear)
        #expect(scrollView.contentInsetAdjustmentBehavior == .never)
        #expect(scrollView.isScrollEnabled == false)
        #expect(scrollView.bounces == false)
    }

    @Test @MainActor func webModeRejectsInvalidURLStrings() {
        let screen = ScreenController()
        screen.navigate(to: "   \n")
        screen.setMode(.web)

        #expect(screen.mode == .web)
    }
}

