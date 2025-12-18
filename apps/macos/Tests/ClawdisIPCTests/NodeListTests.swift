import Testing
@testable import Clawdis

@Suite struct NodeListTests {
    @Test func nodeListMapsGatewayPayloadIncludingHardwareAndCaps() async {
        let payload = ControlRequestHandler.GatewayNodeListPayload(
            ts: 123,
            nodes: [
                ControlRequestHandler.GatewayNodeListPayload.Node(
                    nodeId: "n1",
                    displayName: "Node",
                    platform: "iOS",
                    version: "1.0",
                    deviceFamily: "iPad",
                    modelIdentifier: "iPad14,5",
                    remoteIp: "192.168.0.88",
                    connected: true,
                    paired: true,
                    caps: ["canvas", "camera"]),
                ControlRequestHandler.GatewayNodeListPayload.Node(
                    nodeId: "n2",
                    displayName: "Offline",
                    platform: "iOS",
                    version: "1.0",
                    deviceFamily: "iPhone",
                    modelIdentifier: "iPhone14,2",
                    remoteIp: nil,
                    connected: false,
                    paired: true,
                    caps: nil),
            ])

        let res = ControlRequestHandler.buildNodeListResult(payload: payload)

        #expect(res.ts == 123)
        #expect(res.pairedNodeIds.sorted() == ["n1", "n2"])
        #expect(res.connectedNodeIds == ["n1"])

        let node = res.nodes.first { $0.nodeId == "n1" }
        #expect(node?.remoteAddress == "192.168.0.88")
        #expect(node?.deviceFamily == "iPad")
        #expect(node?.modelIdentifier == "iPad14,5")
        #expect(node?.capabilities?.sorted() == ["camera", "canvas"])
    }
}
