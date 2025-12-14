import SwiftUI

#if os(macOS)
import AppKit
#else
import UIKit
#endif

enum ClawdisChatTheme {
    static var surface: Color {
        #if os(macOS)
        Color(nsColor: .windowBackgroundColor)
        #else
        Color(uiColor: .systemBackground)
        #endif
    }

    static var card: Color {
        #if os(macOS)
        Color(nsColor: .textBackgroundColor)
        #else
        Color(uiColor: .secondarySystemBackground)
        #endif
    }

    static var subtleCard: Color {
        #if os(macOS)
        Color(nsColor: .textBackgroundColor).opacity(0.55)
        #else
        Color(uiColor: .secondarySystemBackground).opacity(0.9)
        #endif
    }

    static var divider: Color {
        Color.secondary.opacity(0.2)
    }
}

enum ClawdisPlatformImageFactory {
    static func image(_ image: ClawdisPlatformImage) -> Image {
        #if os(macOS)
        Image(nsImage: image)
        #else
        Image(uiImage: image)
        #endif
    }
}
