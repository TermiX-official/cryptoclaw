import ClawdisKit
import Foundation

#if canImport(AppKit)
import AppKit

public typealias ClawdisPlatformImage = NSImage
#elseif canImport(UIKit)
import UIKit

public typealias ClawdisPlatformImage = UIImage
#endif

public struct ClawdisChatMessageContent: Codable, Hashable, Sendable {
    public let type: String?
    public let text: String?
    public let mimeType: String?
    public let fileName: String?
    public let content: String?

    public init(
        type: String?,
        text: String?,
        mimeType: String?,
        fileName: String?,
        content: String?)
    {
        self.type = type
        self.text = text
        self.mimeType = mimeType
        self.fileName = fileName
        self.content = content
    }
}

public struct ClawdisChatMessage: Codable, Identifiable, Sendable {
    public var id: UUID = .init()
    public let role: String
    public let content: [ClawdisChatMessageContent]
    public let timestamp: Double?

    enum CodingKeys: String, CodingKey {
        case role, content, timestamp
    }

    public init(
        id: UUID = .init(),
        role: String,
        content: [ClawdisChatMessageContent],
        timestamp: Double?)
    {
        self.id = id
        self.role = role
        self.content = content
        self.timestamp = timestamp
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.role = try container.decode(String.self, forKey: .role)
        self.timestamp = try container.decodeIfPresent(Double.self, forKey: .timestamp)

        if let decoded = try? container.decode([ClawdisChatMessageContent].self, forKey: .content) {
            self.content = decoded
            return
        }

        // Some session log formats store `content` as a plain string.
        if let text = try? container.decode(String.self, forKey: .content) {
            self.content = [
                ClawdisChatMessageContent(
                    type: "text",
                    text: text,
                    mimeType: nil,
                    fileName: nil,
                    content: nil),
            ]
            return
        }

        self.content = []
    }
}

public struct ClawdisChatHistoryPayload: Codable, Sendable {
    public let sessionKey: String
    public let sessionId: String?
    public let messages: [AnyCodable]?
    public let thinkingLevel: String?
}

public struct ClawdisChatSendResponse: Codable, Sendable {
    public let runId: String
    public let status: String
}

public struct ClawdisChatEventPayload: Codable, Sendable {
    public let runId: String?
    public let sessionKey: String?
    public let state: String?
    public let message: AnyCodable?
    public let errorMessage: String?
}

public struct ClawdisGatewayHealthOK: Codable, Sendable {
    public let ok: Bool?
}

public struct ClawdisPendingAttachment: Identifiable {
    public let id = UUID()
    public let url: URL?
    public let data: Data
    public let fileName: String
    public let mimeType: String
    public let type: String
    public let preview: ClawdisPlatformImage?

    public init(
        url: URL?,
        data: Data,
        fileName: String,
        mimeType: String,
        type: String = "file",
        preview: ClawdisPlatformImage?)
    {
        self.url = url
        self.data = data
        self.fileName = fileName
        self.mimeType = mimeType
        self.type = type
        self.preview = preview
    }
}

public struct ClawdisChatAttachmentPayload: Codable, Sendable, Hashable {
    public let type: String
    public let mimeType: String
    public let fileName: String
    public let content: String

    public init(type: String, mimeType: String, fileName: String, content: String) {
        self.type = type
        self.mimeType = mimeType
        self.fileName = fileName
        self.content = content
    }
}
