import Testing
@testable import Clawdis

@Suite struct VoiceWakeManagerExtractCommandTests {
    @Test func extractCommandReturnsNilWhenNoTriggerFound() {
        #expect(VoiceWakeManager.extractCommand(from: "hello world", triggers: ["clawd"]) == nil)
    }

    @Test func extractCommandTrimsTokensAndResult() {
        let cmd = VoiceWakeManager.extractCommand(from: "hey clawd   do thing  ", triggers: ["  clawd  "])
        #expect(cmd == "do thing")
    }

    @Test func extractCommandPicksLatestTriggerOccurrence() {
        let transcript = "clawd first\nthen something\nclaude second"
        let cmd = VoiceWakeManager.extractCommand(from: transcript, triggers: ["clawd", "claude"])
        #expect(cmd == "second")
    }

    @Test func extractCommandIsCaseInsensitive() {
        let cmd = VoiceWakeManager.extractCommand(from: "HELLO CLAWD run it", triggers: ["clawd"])
        #expect(cmd == "run it")
    }

    @Test func extractCommandReturnsNilWhenNothingAfterTrigger() {
        #expect(VoiceWakeManager.extractCommand(from: "hey clawd  \n", triggers: ["clawd"]) == nil)
    }

    @Test func extractCommandIgnoresEmptyTriggers() {
        let cmd = VoiceWakeManager.extractCommand(from: "hey clawd do thing", triggers: ["", "   ", "clawd"])
        #expect(cmd == "do thing")
    }
}
