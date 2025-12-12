import Foundation

enum InstanceIdentity {
    static let instanceId: String = {
        if let name = Host.current().localizedName?.trimmingCharacters(in: .whitespacesAndNewlines),
           !name.isEmpty
        {
            return name
        }
        return UUID().uuidString
    }()

    static let displayName: String = {
        if let name = Host.current().localizedName?.trimmingCharacters(in: .whitespacesAndNewlines),
           !name.isEmpty
        {
            return name
        }
        return "clawdis-mac"
    }()
}

