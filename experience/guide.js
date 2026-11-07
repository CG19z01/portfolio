// Guided camera: the visitor picks a destination (zone navigator, a project,
// a key) and the camera travels there on its own. At each station a drag
// looks around within a limited cone — enough to feel present, never enough
// to get lost. Clicks (taps) on the canvas are handed to the caller.

import * as THREE from 'three';
import { BACK_Z, CORRIDOR_PATH } from './layout.js';

const LOOK_YAW = 0.55;     // rad, each side
const LOOK_PITCH = 0.22;   // rad, up/down
const TAP_SLOP = 6;        // px of movement still counted as a click

const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, t) => {
    const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
};

export function createGuide(camera, dom, { reducedMotion, onTap, onHover }) {
    const pos = new THREE.Vector3();
    const target = new THREE.Vector3();
    const look = { yaw: 0, pitch: 0, yawGoal: 0, pitchGoal: 0 };
    let travel = null;

    // ---------- Travel ----------

    function buildCurve(from, to) {
        const pts = [from.clone()];
        const crossing = (from.z > BACK_Z) !== (to.z > BACK_Z);
        if (crossing) {
            const path = CORRIDOR_PATH.map(v3);
            if (from.z < BACK_Z) path.reverse();
            pts.push(...path);
        } else {
            // A gentle lift in the middle so short hops still read as a move.
            const mid = from.clone().lerp(to, 0.5);
            mid.y += Math.min(1.2, from.distanceTo(to) * 0.08);
            pts.push(mid);
        }
        pts.push(to.clone());
        return { curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), crossing };
    }

    function goTo(view, { instant = false } = {}) {
        const toPos = v3(view.pos);
        const toTarget = v3(view.target);
        travel?.resolve(false); // the previous trip was overridden
        look.yawGoal = look.pitchGoal = 0;

        if (instant || reducedMotion.matches || pos.distanceTo(toPos) < 0.01) {
            travel = null;
            pos.copy(toPos);
            target.copy(toTarget);
            look.yaw = look.pitch = 0;
            return Promise.resolve(true);
        }

        const { curve, crossing } = buildCurve(pos, toPos);
        const length = curve.getLength();
        return new Promise(resolve => {
            travel = {
                curve, crossing, resolve,
                fromTarget: target.clone(),
                toTarget,
                t: 0,
                duration: Math.min(3.4, Math.max(1.1, 0.75 + length * 0.07)),
            };
        });
    }

    const ahead = new THREE.Vector3();
    function stepTravel(dt) {
        const tr = travel;
        tr.t = Math.min(1, tr.t + dt / tr.duration);
        const k = ease(tr.t);
        tr.curve.getPointAt(k, pos);
        if (tr.crossing) {
            // Round the LED wall: look down the corridor, then at the target.
            tr.curve.getPointAt(Math.min(1, k + 0.12), ahead);
            ahead.y = pos.y - 0.2;
            const toAhead = smooth(0, 0.25, k);
            const toEnd = smooth(0.7, 1, k);
            target.copy(tr.fromTarget).lerp(ahead, toAhead).lerp(tr.toTarget, toEnd);
        } else {
            target.copy(tr.fromTarget).lerp(tr.toTarget, k);
        }
        if (tr.t >= 1) {
            travel = null;
            tr.resolve(true);
        }
    }

    // ---------- Look-around (drag) ----------

    let drag = null;

    function onPointerDown(e) {
        if (e.button !== 0) return;
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
        dom.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
        if (!drag || drag.id !== e.pointerId) {
            if (e.pointerType === 'mouse' && !travel) onHover?.(e.clientX, e.clientY);
            return;
        }
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > TAP_SLOP) drag.moved = true;
        if (!drag.moved) return;
        const scale = 2.2 / Math.max(dom.clientHeight, 1);
        look.yawGoal = THREE.MathUtils.clamp(look.yawGoal + (e.clientX - drag.lastX) * scale, -LOOK_YAW, LOOK_YAW);
        look.pitchGoal = THREE.MathUtils.clamp(look.pitchGoal + (e.clientY - drag.lastY) * scale, -LOOK_PITCH, LOOK_PITCH);
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        onHover?.(null);
    }

    function onPointerUp(e) {
        if (!drag || drag.id !== e.pointerId) return;
        const tapped = !drag.moved;
        drag = null;
        if (tapped) onTap?.(e.clientX, e.clientY);
    }

    function onPointerCancel() { drag = null; }
    function onLeave() { onHover?.(null); }

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerCancel);
    dom.addEventListener('pointerleave', onLeave);

    // ---------- Per frame ----------

    const dir = new THREE.Vector3();
    const sph = new THREE.Spherical();
    function update(dt) {
        if (travel) stepTravel(dt);
        const k = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 10);
        look.yaw += (look.yawGoal - look.yaw) * k;
        look.pitch += (look.pitchGoal - look.pitch) * k;

        dir.subVectors(target, pos);
        sph.setFromVector3(dir);
        sph.theta += look.yaw;
        sph.phi = THREE.MathUtils.clamp(sph.phi + look.pitch, 0.2, Math.PI - 0.2);
        dir.setFromSpherical(sph);
        camera.position.copy(pos);
        camera.lookAt(pos.x + dir.x, pos.y + dir.y, pos.z + dir.z);
    }

    return {
        goTo,
        update,
        get travelling() { return !!travel; },
        dispose() {
            travel?.resolve(false);
            dom.removeEventListener('pointerdown', onPointerDown);
            dom.removeEventListener('pointermove', onPointerMove);
            dom.removeEventListener('pointerup', onPointerUp);
            dom.removeEventListener('pointercancel', onPointerCancel);
            dom.removeEventListener('pointerleave', onLeave);
        },
    };
}
