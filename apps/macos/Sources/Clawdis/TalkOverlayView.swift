import SwiftUI

struct TalkOverlayView: View {
    var controller: TalkOverlayController
    @State private var hovering = false

    var body: some View {
        ZStack(alignment: .topLeading) {
            TalkOrbView(phase: self.controller.model.phase, level: self.controller.model.level)
                .frame(width: 80, height: 80)
                .contentShape(Rectangle())
                .onTapGesture {
                    TalkModeController.shared.stopSpeaking(reason: .userTap)
                }
                .padding(16)

            Button {
                TalkModeController.shared.exitTalkMode()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color.white.opacity(self.hovering ? 0.95 : 0.7))
                    .frame(width: 18, height: 18)
                    .background(Color.black.opacity(self.hovering ? 0.45 : 0.3))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .contentShape(Circle())
            .padding(4)
            .onHover { self.hovering = $0 }
        }
        .frame(width: 120, height: 120, alignment: .center)
    }
}

private struct TalkOrbView: View {
    let phase: TalkModePhase
    let level: Double

    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            let listenScale = phase == .listening ? (1 + CGFloat(self.level) * 0.12) : 1
            let pulse = phase == .speaking ? (1 + 0.06 * sin(t * 6)) : 1

            ZStack {
                Circle()
                    .fill(self.orbGradient)
                    .overlay(Circle().stroke(Color.white.opacity(0.45), lineWidth: 1))
                    .shadow(color: Color.black.opacity(0.22), radius: 10, x: 0, y: 5)
                    .scaleEffect(pulse * listenScale)

                TalkWaveRings(phase: phase, level: level, time: t)

                if phase == .thinking {
                    TalkOrbitArcs(time: t)
                }
            }
        }
    }

    private var orbGradient: RadialGradient {
        RadialGradient(
            colors: [Color.white, Color(red: 0.62, green: 0.88, blue: 1.0)],
            center: .topLeading,
            startRadius: 4,
            endRadius: 52)
    }
}

private struct TalkWaveRings: View {
    let phase: TalkModePhase
    let level: Double
    let time: TimeInterval

    var body: some View {
        ZStack {
            ForEach(0..<3, id: \.self) { idx in
                let speed = phase == .speaking ? 1.4 : phase == .listening ? 0.9 : 0.6
                let progress = (time * speed + Double(idx) * 0.28).truncatingRemainder(dividingBy: 1)
                let amplitude = phase == .speaking ? 0.95 : phase == .listening ? 0.5 + level * 0.7 : 0.35
                let scale = 0.75 + progress * amplitude + (phase == .listening ? level * 0.15 : 0)
                let alpha = phase == .speaking ? 0.55 : phase == .listening ? 0.45 + level * 0.25 : 0.28
                Circle()
                    .stroke(Color.white.opacity(alpha - progress * 0.35), lineWidth: 1.2)
                    .scaleEffect(scale)
                    .opacity(alpha - progress * 0.6)
            }
        }
    }
}

private struct TalkOrbitArcs: View {
    let time: TimeInterval

    var body: some View {
        ZStack {
            Circle()
                .trim(from: 0.08, to: 0.26)
                .stroke(Color.white.opacity(0.75), style: StrokeStyle(lineWidth: 1.4, lineCap: .round))
                .rotationEffect(.degrees(time * 42))
            Circle()
                .trim(from: 0.62, to: 0.86)
                .stroke(Color.white.opacity(0.55), style: StrokeStyle(lineWidth: 1.2, lineCap: .round))
                .rotationEffect(.degrees(-time * 35))
        }
        .scaleEffect(1.05)
    }
}
