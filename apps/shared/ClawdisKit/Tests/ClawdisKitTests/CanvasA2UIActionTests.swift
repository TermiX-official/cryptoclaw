import ClawdisKit
import Foundation
import Testing

@Suite struct CanvasA2UIActionTests {
    @Test func sanitizeTagValueIsStable() {
        #expect(ClawdisCanvasA2UIAction.sanitizeTagValue("Hello World!") == "Hello_World_")
        #expect(ClawdisCanvasA2UIAction.sanitizeTagValue("  ") == "-")
        #expect(ClawdisCanvasA2UIAction.sanitizeTagValue("macOS 26.2") == "macOS_26.2")
    }

    @Test func formatAgentMessageIsTokenEfficientAndUnambiguous() {
        let msg = ClawdisCanvasA2UIAction.formatAgentMessage(
            actionName: "Get Weather",
            sessionKey: "main",
            surfaceId: "main",
            sourceComponentId: "btnWeather",
            host: "Peter’s iPad",
            instanceId: "ipad16,6",
            contextJSON: "{\"city\":\"Vienna\"}")

        #expect(msg.contains("CANVAS_A2UI "))
        #expect(msg.contains("action=Get_Weather"))
        #expect(msg.contains("session=main"))
        #expect(msg.contains("surface=main"))
        #expect(msg.contains("component=btnWeather"))
        #expect(msg.contains("host=Peter_s_iPad"))
        #expect(msg.contains("instance=ipad16_6 ctx={\"city\":\"Vienna\"}"))
        #expect(msg.hasSuffix(" default=update_canvas"))
    }

    @Test func a2uiBundleSupportsAndroidBridgeFallback() throws {
        guard let url = ClawdisKitResources.bundle.url(forResource: "a2ui.bundle", withExtension: "js")
        else {
            throw NSError(domain: "Tests", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Missing resource a2ui.bundle.js",
            ])
        }
        let js = try String(contentsOf: url, encoding: .utf8)
        #expect(js.contains("clawdisCanvasA2UIAction"))
        #expect(js.contains("globalThis.clawdisCanvasA2UIAction"))
    }

    @Test func a2uiBundleWrapsDynamicCssValues() throws {
        guard let url = ClawdisKitResources.bundle.url(forResource: "a2ui.bundle", withExtension: "js")
        else {
            throw NSError(domain: "Tests", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Missing resource a2ui.bundle.js",
            ])
        }
        let js = try String(contentsOf: url, encoding: .utf8)
        #expect(js.contains("blur(${r(statusBlur)})"))
        #expect(js.contains("box-shadow: ${r(statusShadow)}"))
    }

    @Test func a2uiBundleStylesModalBackdrop() throws {
        guard let url = ClawdisKitResources.bundle.url(forResource: "a2ui.bundle", withExtension: "js")
        else {
            throw NSError(domain: "Tests", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Missing resource a2ui.bundle.js",
            ])
        }
        let js = try String(contentsOf: url, encoding: .utf8)
        #expect(js.contains("::backdrop"))
        #expect(js.contains("backdrop-filter: blur(6px)"))
    }
}
