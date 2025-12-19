import ClawdisKit
import Foundation
import Network
import Observation

@MainActor
@Observable
final class GatewayDiscoveryModel {
    struct DiscoveredGateway: Identifiable, Equatable {
        var id: String { self.stableID }
        var displayName: String
        var lanHost: String?
        var tailnetDns: String?
        var sshPort: Int
        var stableID: String
        var debugID: String
    }

    var gateways: [DiscoveredGateway] = []
    var statusText: String = "Idle"

    private var browsers: [String: NWBrowser] = [:]
    private var gatewaysByDomain: [String: [DiscoveredGateway]] = [:]
    private var statesByDomain: [String: NWBrowser.State] = [:]

    func start() {
        if !self.browsers.isEmpty { return }

        for domain in ClawdisBonjour.bridgeServiceDomains {
            let params = NWParameters.tcp
            params.includePeerToPeer = true
            let browser = NWBrowser(
                for: .bonjour(type: ClawdisBonjour.bridgeServiceType, domain: domain),
                using: params)

            browser.stateUpdateHandler = { [weak self] state in
                Task { @MainActor in
                    guard let self else { return }
                    self.statesByDomain[domain] = state
                    self.updateStatusText()
                }
            }

            browser.browseResultsChangedHandler = { [weak self] results, _ in
                Task { @MainActor in
                    guard let self else { return }
                    self.gatewaysByDomain[domain] = results.compactMap { result -> DiscoveredGateway? in
                        guard case let .service(name, _, _, _) = result.endpoint else { return nil }

                        let decodedName = BonjourEscapes.decode(name)
                        let txt = Self.txtDictionary(from: result)

                        let advertisedName = txt["displayName"]
                            .map(Self.prettifyInstanceName)
                            .flatMap { $0.isEmpty ? nil : $0 }
                        let prettyName = advertisedName ?? Self.prettifyInstanceName(decodedName)

                        var lanHost: String?
                        var tailnetDns: String?
                        var sshPort = 22

                        if let value = txt["lanHost"] {
                            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
                            lanHost = trimmed.isEmpty ? nil : trimmed
                        }
                        if let value = txt["tailnetDns"] {
                            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
                            tailnetDns = trimmed.isEmpty ? nil : trimmed
                        }
                        if let value = txt["sshPort"],
                           let parsed = Int(value.trimmingCharacters(in: .whitespacesAndNewlines)),
                           parsed > 0
                        {
                            sshPort = parsed
                        }

                        return DiscoveredGateway(
                            displayName: prettyName,
                            lanHost: lanHost,
                            tailnetDns: tailnetDns,
                            sshPort: sshPort,
                            stableID: BridgeEndpointID.stableID(result.endpoint),
                            debugID: BridgeEndpointID.prettyDescription(result.endpoint))
                    }
                    .sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }

                    self.recomputeGateways()
                }
            }

            self.browsers[domain] = browser
            browser.start(queue: DispatchQueue(label: "com.steipete.clawdis.macos.gateway-discovery.\(domain)"))
        }
    }

    func stop() {
        for browser in self.browsers.values {
            browser.cancel()
        }
        self.browsers = [:]
        self.gatewaysByDomain = [:]
        self.statesByDomain = [:]
        self.gateways = []
        self.statusText = "Stopped"
    }

    private func recomputeGateways() {
        self.gateways = self.gatewaysByDomain.values
            .flatMap(\.self)
            .sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
    }

    private func updateStatusText() {
        let states = Array(self.statesByDomain.values)
        if states.isEmpty {
            self.statusText = self.browsers.isEmpty ? "Idle" : "Setup"
            return
        }

        if let failed = states.first(where: { state in
            if case .failed = state { return true }
            return false
        }) {
            if case let .failed(err) = failed {
                self.statusText = "Failed: \(err)"
                return
            }
        }

        if let waiting = states.first(where: { state in
            if case .waiting = state { return true }
            return false
        }) {
            if case let .waiting(err) = waiting {
                self.statusText = "Waiting: \(err)"
                return
            }
        }

        if states.contains(where: { if case .ready = $0 { true } else { false } }) {
            self.statusText = "Searching…"
            return
        }

        if states.contains(where: { if case .setup = $0 { true } else { false } }) {
            self.statusText = "Setup"
            return
        }

        self.statusText = "Searching…"
    }

    private static func txtDictionary(from result: NWBrowser.Result) -> [String: String] {
        guard case let .bonjour(txt) = result.metadata else { return [:] }
        return txt.dictionary
    }

    private static func prettifyInstanceName(_ decodedName: String) -> String {
        let normalized = decodedName.split(whereSeparator: \.isWhitespace).joined(separator: " ")
        let stripped = normalized.replacingOccurrences(of: " (Clawdis)", with: "")
            .replacingOccurrences(of: #"\s+\(\d+\)$"#, with: "", options: .regularExpression)
        return stripped.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
