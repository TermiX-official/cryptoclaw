import Foundation
import Darwin

final class CanvasFileWatcher: @unchecked Sendable {
    private let url: URL
    private let queue: DispatchQueue
    private var source: DispatchSourceFileSystemObject?
    private var fd: Int32 = -1
    private var pending = false
    private let onChange: () -> Void

    init(url: URL, onChange: @escaping () -> Void) {
        self.url = url
        self.queue = DispatchQueue(label: "com.steipete.clawdis.canvaswatcher")
        self.onChange = onChange
    }

    deinit {
        self.stop()
    }

    func start() {
        guard self.source == nil else { return }
        let path = (self.url as NSURL).fileSystemRepresentation
        let fd = open(path, O_EVTONLY)
        guard fd >= 0 else { return }
        self.fd = fd

        let source = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fd,
            eventMask: [.write, .delete, .rename, .attrib, .extend, .link, .revoke],
            queue: self.queue)

        source.setEventHandler { [weak self] in
            guard let self else { return }
            if self.pending { return }
            self.pending = true
            self.queue.asyncAfter(deadline: .now() + 0.12) { [weak self] in
                guard let self else { return }
                self.pending = false
                self.onChange()
            }
        }

        source.setCancelHandler { [weak self] in
            guard let self else { return }
            if self.fd >= 0 {
                close(self.fd)
                self.fd = -1
            }
        }

        self.source = source
        source.resume()
    }

    func stop() {
        self.source?.cancel()
        self.source = nil
    }
}
