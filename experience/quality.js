// Adaptive quality. Starts from what the device suggests, then watches the
// real frame rate for a few seconds at a time and steps down when the
// device cannot keep up. It never steps back up (no ping-pong), and only
// samples while the camera is still, so a camera move or a hidden tab does
// not count against the device.
//
//   2 — full: pixel ratio up to 2 (1.5 on touch screens)
//   1 — pixel ratio 1.25
//   0 — pixel ratio 1, the three stage spotlights switched off (their
//       visible beams stay; each light costs on every pixel drawn)

const WINDOW = 2;   // s per measure (by time: a slow device must not wait longer)
const TARGET = 45;  // fps under which we step down

export function createQuality(renderer, { coarse, onLevel }) {
    const dpr = window.devicePixelRatio || 1;
    const ratioFor = l => (l === 2 ? Math.min(dpr, coarse ? 1.5 : 2) : l === 1 ? Math.min(dpr, 1.25) : 1);
    // Small, dense phone screens or a declared low-memory device start one
    // notch down: they gain little from the extra pixels.
    const lowMem = navigator.deviceMemory && navigator.deviceMemory <= 4;
    let level = coarse && (dpr > 2 || lowMem) ? 1 : 2;
    let frames = 0, time = 0;

    function apply() {
        renderer.setPixelRatio(ratioFor(level));
        onLevel(level);
    }
    apply();

    return {
        get level() { return level; },
        // Called every frame with the real (unclamped) delta.
        sample(dt, still) {
            if (level === 0 || !still || dt > 0.25) {
                frames = 0;
                time = 0;
                return;
            }
            frames++;
            time += dt;
            if (time < WINDOW) return;
            const fps = frames / time;
            frames = 0;
            time = 0;
            if (fps < TARGET) {
                level--;
                apply();
            }
        },
    };
}
