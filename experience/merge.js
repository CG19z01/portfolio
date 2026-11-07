// Tiny geometry merger: many small coloured parts → one mesh (one draw call).
// Each part is a template geometry placed by position / rotation / scale,
// with its colour baked in as a vertex colour. Used for the decor (stands,
// dressing room), where dozens of boxes would otherwise cost one draw each.

import * as THREE from 'three';

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const c = new THREE.Color();

export function createMerger() {
    const pos = [];
    const nor = [];
    const col = [];
    return {
        // geo: template (not consumed); at: [x, y, z]; rot: [x, y, z]; scale: [x, y, z]
        add(geo, color, at, rot = [0, 0, 0], scale = [1, 1, 1]) {
            const g = geo.index ? geo.toNonIndexed() : geo.clone();
            m4.compose(p.set(...at), q.setFromEuler(e.set(...rot)), s.set(...scale));
            g.applyMatrix4(m4);
            const a = g.attributes;
            for (let i = 0; i < a.position.count * 3; i++) {
                pos.push(a.position.array[i]);
                nor.push(a.normal.array[i]);
            }
            c.set(color); // hex in sRGB → linear, as vertex colours expect
            for (let i = 0; i < a.position.count; i++) col.push(c.r, c.g, c.b);
            g.dispose();
        },
        build() {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
            g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
            g.computeBoundingSphere();
            return g;
        },
    };
}
