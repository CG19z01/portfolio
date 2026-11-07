// Decor that does not belong to a zone: the two audience stands (balconies
// on both sides of the stage), and the dressing-room corner of the backstage (clothes racks
// with hangers and clothes, a make-up mirror, a stool, a rug).
//
// Same language as the rest of the venue: dark low-poly boxes in the stage
// and metal tones, purple light strips, palette colours only. Each set is
// merged into a few meshes (see merge.js) so they cost only a few draw calls.

import * as THREE from 'three';
import { PALETTE, STANDS, DRESSING } from './layout.js';
import { createMerger } from './merge.js';

// Template geometries: only read (copied into the merged meshes), never
// rendered, so they hold no GPU memory and need no disposal.
const T = {
    box: new THREE.BoxGeometry(1, 1, 1),                       // unit box, scaled per part
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),           // unit cylinder (y axis)
    hook: new THREE.TorusGeometry(0.035, 0.006, 4, 10, Math.PI * 1.3),
    hood: new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    bulb: new THREE.SphereGeometry(0.035, 8, 6),
};

// Box part with its bottom at y (like world.js's box()).
function addBox(mg, color, w, h, d, x, y, z, rot) {
    mg.add(T.box, color, [x, y + h / 2, z], rot, [w, h, d]);
}

function vertexMat(extra = {}) {
    return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0.15, ...extra });
}

// ---------- Audience stands ----------
// Balconies over the side corridors. Tiers rise from the inner edge (towards
// the stage) to the side wall; a balcony front with a light strip and a
// safety rail, a central aisle with half steps between the rows, hand rails
// along the aisle and the ends, an access door in the side wall. Underneath,
// steel columns at both corridor edges, cross beams and bracing.
export function buildStands() {
    const S = STANDS;
    const mg = createMerger();      // structure, seats, rails
    const glow = createMerger();    // light strips
    const L = S.toZ - S.fromZ;
    const zc = (S.fromZ + S.toZ) / 2;
    const tierY = k => S.baseY + k * S.rise;            // top of tier k
    const tierX = k => S.innerX + k * S.rowDepth;       // inner edge of tier k (|x|)
    const slab = 0.14;
    const C = { deck: PALETTE.bg2, steel: PALETTE.border, seat: PALETTE.glow, rail: PALETTE.border, door: PALETTE.bg };

    [-1, 1].forEach(s => {
        const X = v => s * v; // mirror to the side
        for (let k = 0; k < S.rows; k++) {
            const x0 = tierX(k);
            const w = S.wallX - x0;
            // Tier deck, running to the wall
            addBox(mg, C.deck, w, slab, L, X(x0 + w / 2), tierY(k) - slab, zc);
            // Riser closing the step under the tier's front edge
            if (k > 0) addBox(mg, C.deck, 0.06, S.rise, L, X(x0 + 0.03), tierY(k - 1), zc);
            // Stepped side cheeks at both ends
            const depth = k === S.rows - 1 ? w : S.rowDepth;
            [S.fromZ + 0.03, S.toZ - 0.03].forEach(z => addBox(mg, C.deck, depth, tierY(k) - (S.baseY - slab), 0.06,
                X(x0 + depth / 2), S.baseY - slab, z));
            // Light strip under the nose of the upper tiers
            if (k > 0) glow.add(T.box, 0xffffff, [X(x0 - 0.01), tierY(k) - 0.03, zc], undefined, [0.03, 0.03, L]);
            // Seats, both sides of the aisle, facing the stage
            for (let z = S.fromZ + 0.45; z < S.toZ - 0.3; z += 0.55) {
                if (Math.abs(z - zc) < S.aisle / 2 + 0.2) continue;
                const sx = x0 + 0.42;
                addBox(mg, C.steel, 0.07, 0.3, 0.07, X(sx), tierY(k), z);                 // pedestal
                addBox(mg, C.seat, 0.4, 0.08, 0.42, X(sx), tierY(k) + 0.3, z);            // cushion
                addBox(mg, C.seat, 0.06, 0.4, 0.42, X(sx + 0.2), tierY(k) + 0.34, z);     // back
            }
            // Aisle: half step between this tier and the next
            if (k < S.rows - 1) {
                addBox(mg, C.deck, S.rowDepth / 2, S.rise / 2, S.aisle - 0.1,
                    X(tierX(k + 1) - S.rowDepth / 4), tierY(k), zc);
            }
        }
        // Balcony front: fascia under the first tier, light strip along it
        const under = S.baseY - slab;
        addBox(mg, C.deck, 0.08, 0.5, L, X(S.innerX + 0.02), under - 0.36, zc);
        glow.add(T.box, 0xffffff, [X(S.innerX - 0.03), under - 0.3, zc], undefined, [0.03, 0.04, L]);
        // Steel frame: columns at both corridor edges (the middle stays free
        // for the way to the backstage), cross beams under the deck, and
        // bracing between the outer columns.
        const cols = [];
        for (let i = 0; i <= 3; i++) cols.push(S.fromZ + 0.2 + (i * (L - 0.4)) / 3);
        const colTop = under - 0.36;
        [S.innerX + 0.12, S.wallX - 0.14].forEach(cx => cols.forEach(z =>
            addBox(mg, C.steel, 0.16, colTop, 0.16, X(cx), 0, z)));
        cols.forEach(z => addBox(mg, C.steel, S.wallX - S.innerX, 0.22, 0.16, X((S.innerX + S.wallX) / 2), colTop, z));
        addBox(mg, C.steel, 0.12, 0.22, L, X(S.wallX - 0.14), colTop, zc);
        const span = cols[1] - cols[0];
        const bh = colTop - 0.6;           // bracing between 0.6 m and the top
        const len = Math.hypot(span, bh);
        const ang = Math.atan2(bh, span);
        for (let i = 0; i < cols.length - 1; i++) {
            [ang, -ang].forEach(a => mg.add(T.box, C.steel,
                [X(S.innerX + 0.12), 0.6 + bh / 2, (cols[i] + cols[i + 1]) / 2], [a, 0, 0], [0.05, 0.05, len]));
        }
        // Front safety rail: posts, top rail with a light line, mid rail
        const n = Math.round(L / 1.1) + 1;
        for (let i = 0; i < n; i++) {
            addBox(mg, C.rail, 0.05, 1.0, 0.05, X(S.innerX + 0.05), S.baseY, S.fromZ + 0.05 + (i * (L - 0.1)) / (n - 1));
        }
        addBox(mg, C.rail, 0.07, 0.06, L, X(S.innerX + 0.05), S.baseY + 0.97, zc);
        addBox(mg, C.rail, 0.04, 0.04, L, X(S.innerX + 0.05), S.baseY + 0.5, zc);
        glow.add(T.box, 0xffffff, [X(S.innerX + 0.05), S.baseY + 1.02, zc], undefined, [0.03, 0.02, L]);
        // Sloped hand rails along the aisle and at both ends
        const rx0 = S.innerX + 0.05, ry0 = S.baseY + 0.97;
        const rx1 = S.wallX - 0.15, ry1 = tierY(S.rows - 1) + 0.95;
        const rl = Math.hypot(rx1 - rx0, ry1 - ry0);
        const ra = Math.atan2(ry1 - ry0, rx1 - rx0);
        [zc - S.aisle / 2, zc + S.aisle / 2, S.fromZ + 0.05, S.toZ - 0.05].forEach(z => {
            mg.add(T.box, C.rail, [X((rx0 + rx1) / 2), (ry0 + ry1) / 2, z], [0, 0, s * ra], [rl, 0.05, 0.05]);
            for (let k = 1; k < S.rows; k++) {
                const px = tierX(k) + 0.1;
                addBox(mg, C.rail, 0.04, ry0 + (px - rx0) * Math.tan(ra) - tierY(k), 0.04, X(px), tierY(k), z);
            }
        });
        // Access door in the side wall, at the top of the aisle
        const top = tierY(S.rows - 1);
        addBox(mg, C.door, 0.04, 2.0, 1.0, X(S.wallX - 0.03), top, zc);
        glow.add(T.box, 0xffffff, [X(S.wallX - 0.05), top + 2.02, zc], undefined, [0.03, 0.04, 1.1]);
        [-1, 1].forEach(e => glow.add(T.box, 0xffffff, [X(S.wallX - 0.05), top + 1.0, zc + e * 0.53], undefined, [0.03, 2.0, 0.04]));
    });

    const group = new THREE.Group();
    group.add(new THREE.Mesh(mg.build(), vertexMat({ roughness: 0.6, metalness: 0.2 })));
    // Subtle: dimmer than the stage edge (1.6), so the stands stay secondary.
    group.add(new THREE.Mesh(glow.build(), new THREE.MeshStandardMaterial({
        color: 0x000000, emissive: PALETTE.purple, emissiveIntensity: 0.9,
    })));
    return group;
}

// ---------- Dressing room (backstage) ----------
function mirrorTexture() {
    // A dim, cool sheen with two diagonal streaks: reads as glass without a
    // real reflection (which would mean rendering the scene twice).
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(0, '#3a3450');
    g.addColorStop(0.55, '#1a1a22');
    g.addColorStop(1, '#2b0b3d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(240,238,250,.14)';
    ctx.beginPath();
    ctx.moveTo(20, 0); ctx.lineTo(60, 0); ctx.lineTo(0, 120); ctx.lineTo(0, 40);
    ctx.fill();
    ctx.fillStyle = 'rgba(176,106,255,.12)';
    ctx.beginPath();
    ctx.moveTo(100, 0); ctx.lineTo(116, 0); ctx.lineTo(10, 256); ctx.lineTo(0, 256);
    ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// One garment on its hanger. Local frame: hanger hook at the origin, the
// garment hangs below in the x-y plane.
function garment(mg, kind, color, o) {
    const at = (x, y, z) => o.local(x, y, z);
    const rot = [0, o.yaw, 0];
    const steel = PALETTE.border;
    mg.add(T.hook, steel, at(0, 0.03, 0), [0, o.yaw, 0]);
    mg.add(T.box, steel, at(0, -0.05, 0), rot, [0.4, 0.016, 0.016]);
    const len = { jacket: 0.66, hoodie: 0.62, shirt: 0.74, tee: 0.54 }[kind];
    const thick = kind === 'jacket' || kind === 'hoodie' ? 0.1 : 0.05;
    mg.add(T.box, color, at(0, -0.06 - len / 2, 0), rot, [0.44, len, thick]);                // body
    const sleeve = kind === 'tee' ? 0.18 : len * 0.85;
    [-1, 1].forEach(sd => mg.add(T.box, color, at(sd * 0.25, -0.1 - sleeve / 2, 0),
        [0, o.yaw, sd * 0.08], [0.09, sleeve, thick * 0.8]));                                 // sleeves
    if (kind === 'hoodie') mg.add(T.hood, color, at(0, -0.1, -0.06), [-0.3, o.yaw, 0]);
    if (kind === 'shirt') mg.add(T.box, PALETTE.text, at(0, -0.09, 0.03), rot, [0.16, 0.05, 0.02]); // collar
    if (kind === 'jacket') mg.add(T.box, PALETTE.bg, at(0, -0.06 - len / 2, thick / 2 + 0.003), rot, [0.02, len, 0.005]); // zip
}

function clothesRack(mg, { x, z, yaw = 0, length = 1.8, clothes }) {
    const H = 1.6;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    // rack-local (u along the bar, v depth) → world
    const W = (u, y, v) => [x + u * cos + v * sin, y, z - u * sin + v * cos];
    const steel = PALETTE.border;
    [-length / 2, length / 2].forEach(u => {
        mg.add(T.cyl, steel, W(u, H / 2, 0), [0, yaw, 0], [0.04, H, 0.04]);                // upright
        mg.add(T.box, steel, W(u, 0.03, 0), [0, yaw, 0], [0.06, 0.06, 0.5]);              // foot
        [-0.22, 0.22].forEach(v => mg.add(T.cyl, PALETTE.bg, W(u, 0.03, v), [0, yaw, 0], [0.05, 0.05, 0.05])); // wheels
    });
    mg.add(T.cyl, steel, W(0, H, 0), [0, yaw, Math.PI / 2], [0.035, length + 0.04, 0.035]); // bar
    const n = clothes.length;
    clothes.forEach(([kind, color], i) => {
        const u = -length / 2 + 0.2 + (i * (length - 0.4)) / Math.max(1, n - 1);
        // Garments hang across the bar, fanned a little so they read from the front.
        const fan = Math.PI / 2 - 0.45 + 0.12 * Math.sin(i * 2.3);
        garment(mg, kind, color, {
            yaw: yaw + fan,
            local: (gx, gy, gz) => {
                const c = Math.cos(fan), s = Math.sin(fan); // garment frame, relative to the rack
                return W(u + gx * c + gz * s, H + gy, -gx * s + gz * c);
            },
        });
    });
}

export function buildDressingRoom() {
    const D = DRESSING;
    const mg = createMerger();
    const glow = createMerger();
    const P = PALETTE;

    clothesRack(mg, { ...D.racks[0], clothes: [
        ['jacket', P.bg], ['hoodie', P.purple], ['shirt', P.text], ['jacket', P.purpleDark], ['tee', P.bg3], ['hoodie', P.glow],
    ] });
    clothesRack(mg, { ...D.racks[1], clothes: [
        ['shirt', P.lavender], ['tee', P.bg], ['jacket', P.border], ['hoodie', P.live], ['shirt', P.bg3],
    ] });

    // Make-up mirror on a stand, ringed with bulbs, facing the room.
    const M = D.mirror;
    const cos = Math.cos(M.yaw), sin = Math.sin(M.yaw);
    const W = (u, y, v) => [M.x + u * cos + v * sin, y, M.z - u * sin + v * cos];
    const rot = [0, M.yaw, 0];
    const mw = 0.95, mh = 1.5, my = 0.55; // glass size, bottom height
    [-1, 1].forEach(s => {
        mg.add(T.box, P.border, W(s * (mw / 2 + 0.06), (my + mh + 0.1) / 2, 0), rot, [0.06, my + mh + 0.1, 0.06]); // legs
        mg.add(T.box, P.border, W(s * (mw / 2 + 0.06), 0.02, 0), rot, [0.08, 0.04, 0.5]);                       // feet
    });
    mg.add(T.box, P.bg, W(0, my + mh / 2, -0.03), rot, [mw + 0.1, mh + 0.1, 0.04]);  // frame
    mg.add(T.box, P.bg2, W(0, my - 0.06, 0.12), rot, [mw + 0.1, 0.04, 0.26]);         // shelf
    mg.add(T.box, P.purple, W(-0.25, my - 0.04, 0.12), rot, [0.05, 0.1, 0.05]);       // a few things on it
    mg.add(T.box, P.text, W(-0.15, my - 0.04, 0.15), rot, [0.04, 0.06, 0.04]);
    mg.add(T.box, P.border, W(0.22, my - 0.04, 0.1), rot, [0.18, 0.03, 0.12]);
    for (let i = 0; i < 6; i++) {                                                     // bulbs, both sides
        const y = my + 0.12 + (i * (mh - 0.24)) / 5;
        [-1, 1].forEach(s => glow.add(T.bulb, 0xffffff, W(s * (mw / 2 + 0.01), y, 0.02)));
    }
    for (let i = 0; i < 4; i++) glow.add(T.bulb, 0xffffff, W(-0.3 + i * 0.2, my + mh + 0.02, 0.02)); // and on top
    // Stool in front of the mirror + rug
    const st = D.stool;
    mg.add(T.cyl, P.purpleDark, [st.x, 0.62, st.z], undefined, [0.36, 0.07, 0.36]);
    mg.add(T.cyl, P.border, [st.x, 0.3, st.z], undefined, [0.05, 0.6, 0.05]);
    mg.add(T.cyl, P.border, [st.x, 0.02, st.z], undefined, [0.34, 0.03, 0.34]);
    mg.add(T.box, P.glow, [D.rug.x, 0.006, D.rug.z], [0, M.yaw, 0], [1.8, 0.012, 1.3]);

    const group = new THREE.Group();
    group.add(new THREE.Mesh(mg.build(), vertexMat({ roughness: 0.85, metalness: 0.1 })));
    group.add(new THREE.Mesh(glow.build(), new THREE.MeshStandardMaterial({
        color: 0x000000, emissive: P.text, emissiveIntensity: 1.2,
    })));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), new THREE.MeshStandardMaterial({
        color: 0x000000, emissive: 0xffffff, emissiveMap: mirrorTexture(), emissiveIntensity: 0.9,
        roughness: 0.1, metalness: 0.6,
    }));
    glass.position.set(...W(0, my + mh / 2, 0.0));
    glass.rotation.y = M.yaw;
    group.add(glass);
    return group;
}
