import Foundation

enum CanvasScheme {
    static let scheme = "clawdis-canvas"

    static func makeURL(session: String, path: String? = nil) -> URL? {
        var comps = URLComponents()
        comps.scheme = Self.scheme
        comps.host = session
        let p = (path ?? "/").trimmingCharacters(in: .whitespacesAndNewlines)
        if p.isEmpty || p == "/" {
            comps.path = "/"
        } else if p.hasPrefix("/") {
            comps.path = p
        } else {
            comps.path = "/" + p
        }
        return comps.url
    }

    static func mimeType(forExtension ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": "text/html; charset=utf-8"
        case "js", "mjs": "application/javascript; charset=utf-8"
        case "css": "text/css; charset=utf-8"
        case "json", "map": "application/json; charset=utf-8"
        case "svg": "image/svg+xml"
        case "png": "image/png"
        case "jpg", "jpeg": "image/jpeg"
        case "gif": "image/gif"
        case "ico": "image/x-icon"
        case "woff2": "font/woff2"
        case "woff": "font/woff"
        case "ttf": "font/ttf"
        case "wasm": "application/wasm"
        default: "application/octet-stream"
        }
    }
}

