import Testing
@testable import Clawdis

struct VoiceWakeTesterTests {
    @Test func matchesIsCaseInsensitiveAndSubstring() {
        let triggers = ["Claude", "wake word"]
        #expect(VoiceWakeTester._testMatches(text: "hey claude are you there", triggers: triggers))
        #expect(VoiceWakeTester._testMatches(text: "this has wake word inside", triggers: triggers))
    }

    @Test func matchesReturnsFalseWhenNoTrigger() {
        let triggers = ["claude"]
        #expect(!VoiceWakeTester._testMatches(text: "random text", triggers: triggers))
    }
}
