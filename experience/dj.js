// Zone 2 — the DJ. A stylised, low-poly figure modelled on the profile
// photo of the classic page ("photo CV.jpg"): shaved head, long face,
// full rounded brown beard round a smiling mouth, prominent ears,
// black polo.
// Headphones round the neck for the DJ part. It is a caricature built from
// primitives, not a likeness of the face.
//
// Local frame: origin on the stage floor between the feet, facing +z (the
// audience). Hands rest on the mixer and move with an idle "mixing" loop.

import * as THREE from 'three';
import { PALETTE, STAGE, BOOTH, DJ_SPOT } from './layout.js';

const COLORS = {
    skin: 0xe8c4a4,
    beard: 0x6e4a32,
    brow: 0x7d5a40,
    eye: 0x141210,
    sclera: 0xf6f3ee,
    iris: 0x5a3a24,
    mouth: 0x5a1a1e,
    teeth: 0xf4f1ea,
    tongue: 0xe2747a,
    polo: 0x17171d,
    collar: 0x202028,
    jeans: 0x1c1c26,
};

const BPM = 122;

// ---------- Head surface helpers ----------
// The head is an ellipsoid tapered into an egg: narrower at the crown,
// wider at the jaw. Points are addressed by `a`, the angle round the head
// from the front (0), and `th`, the polar angle from the top (0) to the
// bottom (PI); `rs` scales the radius (1 = skin, > 1 = on top of it).
const TAPER = 0; // 0 = plain ellipsoid, > 0 = egg (narrow crown)
const taper = yn => 1 - TAPER * yn;
const smooth = x => x * x * (3 - 2 * x);
const lerp = (p, q, k) => p + (q - p) * k;

function headPoint(HEAD, a, th, rs) {
    const r = HEAD.r * rs, f = taper(Math.cos(th));
    return [
        r * Math.sin(a) * Math.sin(th) * HEAD.sx * f,
        r * Math.cos(th) * HEAD.sy,
        r * Math.cos(a) * Math.sin(th) * HEAD.sz * f,
    ];
}

// Depth of the skin at face coordinates (x, y), for features laid on it.
function headSurfaceZ(HEAD, x, y) {
    const yn = y / (HEAD.r * HEAD.sy), f = taper(yn);
    const q = 1 - (x / (f * HEAD.r * HEAD.sx)) ** 2 - yn ** 2;
    return f * HEAD.r * HEAD.sz * Math.sqrt(Math.max(q, 0));
}

// A grid patch on the head: fn(i/segI, j/segJ) returns [a, th, rs].
function headPatch(HEAD, segI, segJ, fn) {
    const pos = [];
    for (let i = 0; i <= segI; i++) {
        for (let j = 0; j <= segJ; j++) pos.push(...headPoint(HEAD, ...fn(i / segI, j / segJ)));
    }
    return gridGeometry(pos, segI, segJ);
}

function gridGeometry(pos, segI, segJ) {
    const idx = [];
    for (let i = 0; i < segI; i++) {
        for (let j = 0; j < segJ; j++) {
            const p = i * (segJ + 1) + j, q = p + segJ + 1;
            idx.push(p, p + 1, q, q, p + 1, q + 1);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
}

// A patch laid on the skin in face coordinates: fn(u, v) returns
// [x, y, lift], lift being the height above the skin.
function facePatch(HEAD, segI, segJ, fn) {
    const pos = [];
    for (let i = 0; i <= segI; i++) {
        for (let j = 0; j <= segJ; j++) {
            const [x, y, lift] = fn(i / segI, j / segJ);
            pos.push(x, y, headSurfaceZ(HEAD, x, y) + lift);
        }
    }
    return gridGeometry(pos, segI, segJ);
}

function createSkullGeometry(HEAD) {
    const geo = new THREE.SphereGeometry(HEAD.r, 32, 24);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
        const f = taper(p.getY(i) / HEAD.r);
        p.setXYZ(i, p.getX(i) * HEAD.sx * f, p.getY(i) * HEAD.sy, p.getZ(i) * HEAD.sz * f);
    }
    geo.computeVertexNormals();
    return geo;
}

// Full beard: covers the cheeks from below the ears, runs over the upper
// lip as a moustache and round the open mouth, with a convex jaw line and
// nothing on the neck.
const BEARD_A = 1.42; // stops in front of the ears (ears at PI / 2)
function beardBand(a) {
    const t = Math.abs(a);
    const top = Math.PI * (t < 0.5
        ? lerp(0.575, 0.6, smooth(t / 0.5))                  // under the nose, down to the mouth corners
        : lerp(0.6, 0.53, smooth((t - 0.5) / (BEARD_A - 0.5)))); // then up to the ear lobes
    const bot = Math.PI * lerp(0.86, 0.6, Math.pow(t / BEARD_A, 2.2)); // convex jaw line
    const thick = lerp(0.05, 0.015, smooth(t / BEARD_A));
    return { top, bot, thick };
}
function beardRadius(a, th) {
    const { top, bot, thick } = beardBand(a);
    const v = Math.min(Math.max((th - top) / (bot - top), 0), 1);
    return 1.006 + thick * Math.pow(Math.sin(Math.PI * v), 0.6);
}
function createBeardGeometry(HEAD) {
    return headPatch(HEAD, 48, 12, (u, v) => {
        const a = -BEARD_A + 2 * BEARD_A * u;
        const { top, bot } = beardBand(a);
        const th = lerp(top, bot, v);
        return [a, th, beardRadius(a, th)];
    });
}

// Gentle open smile: dark mouth, upper teeth, a hint of tongue — laid on the beard.
const MOUTH = { a: 0.3, corner: 0.615 * Math.PI, top: 0.622 * Math.PI, bot: 0.675 * Math.PI };
function mouthEdges(s) { // s in [-1, 1] across the mouth
    const k = Math.sqrt(Math.max(1 - s * s, 0));
    return { top: lerp(MOUTH.corner, MOUTH.top, k), bot: lerp(MOUTH.corner, MOUTH.bot, k), k };
}
function createMouthGeometry(HEAD, part) {
    const lift = part === 'inside' ? 0.006 : 0.012;
    return headPatch(HEAD, 24, 6, (u, v) => {
        const s = -1 + 2 * u, a = s * MOUTH.a;
        const { top, bot, k } = mouthEdges(s);
        let t0 = top, t1 = bot;
        if (part === 'teeth') t1 = top + (bot - top) * 0.4 * k;
        if (part === 'tongue') {
            const kt = Math.sqrt(Math.max(1 - (s / 0.7) ** 2, 0));
            t0 = bot - (bot - top) * 0.3 * kt;
            t1 = bot - 0.004 * kt;
        }
        const th = lerp(t0, t1, v);
        return [a, th, beardRadius(a, th) + lift];
    });
}

export function createDJ(scene) {
    const mats = {
        skin: new THREE.MeshStandardMaterial({ color: COLORS.skin, roughness: 0.55 }),
        beard: new THREE.MeshStandardMaterial({ color: COLORS.beard, roughness: 0.9, side: THREE.DoubleSide }),
        brow: new THREE.MeshStandardMaterial({ color: COLORS.brow, roughness: 0.9 }),
        eye: new THREE.MeshStandardMaterial({ color: COLORS.eye, roughness: 0.2, side: THREE.DoubleSide }),
        sclera: new THREE.MeshStandardMaterial({ color: COLORS.sclera, roughness: 0.35, side: THREE.DoubleSide }),
        iris: new THREE.MeshStandardMaterial({ color: COLORS.iris, roughness: 0.3, side: THREE.DoubleSide }),
        mouth: new THREE.MeshStandardMaterial({ color: COLORS.mouth, roughness: 0.6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
        teeth: new THREE.MeshStandardMaterial({ color: COLORS.teeth, roughness: 0.3, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
        tongue: new THREE.MeshStandardMaterial({ color: COLORS.tongue, roughness: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
        polo: new THREE.MeshStandardMaterial({ color: COLORS.polo, roughness: 0.85 }),
        collar: new THREE.MeshStandardMaterial({ color: COLORS.collar, roughness: 0.8 }),
        jeans: new THREE.MeshStandardMaterial({ color: COLORS.jeans, roughness: 0.9 }),
        phones: new THREE.MeshStandardMaterial({ color: PALETTE.bg, roughness: 0.4, metalness: 0.4 }),
        accent: new THREE.MeshStandardMaterial({ color: PALETTE.purple, emissive: PALETTE.purple, emissiveIntensity: 1.4 }),
    };
    const geos = [];
    const g = geo => (geos.push(geo), geo);
    const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(g(geo), mat);
        m.position.set(x, y, z);
        return m;
    };

    const root = new THREE.Group();
    root.position.set(DJ_SPOT.x, STAGE.height, DJ_SPOT.z);

    // ---------- Legs (mostly hidden by the booth) ----------
    [-0.1, 0.1].forEach(x => {
        const leg = mesh(new THREE.CapsuleGeometry(0.075, 0.78, 4, 10), mats.jeans, x, 0.48, 0);
        root.add(leg);
    });

    // ---------- Body (bobs to the beat) ----------
    const body = new THREE.Group();
    body.position.y = 0.92; // hips
    root.add(body);

    const torsoGeo = new THREE.CylinderGeometry(0.21, 0.17, 0.6, 14);
    torsoGeo.scale(1, 1, 0.62);
    const torso = mesh(torsoGeo, mats.polo, 0, 0.3, 0);
    body.add(torso);
    body.rotation.x = 0.1; // leaning over the decks

    const shoulderY = 0.56;
    [-1, 1].forEach(s => body.add(mesh(new THREE.SphereGeometry(0.068, 12, 10), mats.polo, s * 0.19, shoulderY - 0.01, 0)));

    // Polo collar + placket
    const collar = mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 18), mats.collar, 0, 0.62, 0.005);
    collar.rotation.x = Math.PI / 2 + 0.25;
    body.add(collar);
    body.add(mesh(new THREE.BoxGeometry(0.035, 0.12, 0.01), mats.collar, 0, 0.53, 0.112));

    // Neck
    body.add(mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.1, 10), mats.skin, 0, 0.605, 0));

    // Headphones resting round the neck
    const band = mesh(new THREE.TorusGeometry(0.1, 0.013, 6, 24, Math.PI * 1.25), mats.phones, 0, 0.64, 0.01);
    band.rotation.set(Math.PI / 2 + 0.35, 0, -Math.PI * 0.125 - Math.PI / 2);
    body.add(band);
    [-1, 1].forEach(s => {
        const cup = mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 16), mats.phones, s * 0.095, 0.62, 0.05);
        cup.rotation.z = Math.PI / 2;
        cup.rotation.y = s * 0.5;
        body.add(cup);
        const ring = mesh(new THREE.TorusGeometry(0.036, 0.006, 4, 16), mats.accent, s * 0.108, 0.62, 0.058);
        ring.rotation.y = Math.PI / 2 + s * 0.5;
        body.add(ring);
    });

    // ---------- Head (long, shaved, bearded) ----------
    const head = new THREE.Group();
    head.position.set(0, 0.66, 0.01); // pivot at the top of the neck
    body.add(head);
    const face = new THREE.Group();
    face.position.y = 0.12; // centre of the skull above the pivot
    head.add(face);

    const HEAD = { r: 0.105, sx: 0.93, sy: 1.22, sz: 1.0 };
    face.add(mesh(createSkullGeometry(HEAD), mats.skin));

    // Full beard round a gentle open smile.
    face.add(mesh(createBeardGeometry(HEAD), mats.beard));
    face.add(mesh(createMouthGeometry(HEAD, 'inside'), mats.mouth));
    face.add(mesh(createMouthGeometry(HEAD, 'teeth'), mats.teeth));
    face.add(mesh(createMouthGeometry(HEAD, 'tongue'), mats.tongue));

    // Ears
    [-1, 1].forEach(s => {
        const ear = mesh(new THREE.SphereGeometry(0.036, 12, 10), mats.skin, s * HEAD.r * HEAD.sx, -0.004, -0.005);
        ear.scale.set(0.45, 1.05, 0.8);
        face.add(ear);
    });

    // Brows, laughing eyes, nose
    [-1, 1].forEach(s => {
        // Rounded arch for a kind, happy expression: the inner end sits a
        // little higher than the outer one. The curve is laid on the
        // forehead (mirrored per side) and the ends are capped.
        const BROW_R = 0.0065;
        const pts = [];
        for (let i = 0; i <= 8; i++) {
            const u = i / 8; // 0 = inner end, 1 = outer end
            const x = s * (0.016 + 0.048 * u);
            const y = 0.052 + 0.012 * Math.sin(Math.PI * u) - 0.008 * u;
            pts.push(new THREE.Vector3(x, y, headSurfaceZ(HEAD, x, y) + 0.003));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        face.add(mesh(new THREE.TubeGeometry(curve, 20, BROW_R, 6, false), mats.brow));
        [pts[0], pts[8]].forEach(p => face.add(mesh(new THREE.SphereGeometry(BROW_R, 8, 6), mats.brow, p.x, p.y, p.z)));
        // Open eye, slightly almond-shaped: white with pointed corners, a
        // brown iris, a pupil, a catch-light and a dark upper lid line.
        const ex = s * 0.037, ey = 0.02, EW = 0.032, EH = 0.017;
        const almond = u => 0.5 * EH * Math.pow(Math.sin(Math.PI * u), 0.75);
        face.add(mesh(facePatch(HEAD, 16, 4, (u, v) => {
            const h = almond(u);
            return [ex + (u - 0.5) * EW, ey - h + 2 * h * v, 0.0015];
        }), mats.sclera));
        const disc = (r, lift, cy = ey) => facePatch(HEAD, 16, 2, (u, v) => {
            const t = 2 * Math.PI * u;
            return [ex + r * v * Math.cos(t), cy + r * v * Math.sin(t), lift];
        });
        face.add(mesh(disc(0.0072, 0.0025, ey - 0.0005), mats.iris));
        face.add(mesh(disc(0.0036, 0.0032, ey - 0.0005), mats.eye));
        face.add(mesh(disc(0.0016, 0.0038, ey + 0.0025).translate(s * 0.0025, 0, 0), mats.sclera));
        const lid = [];
        for (let k = 0; k <= 10; k++) {
            const u = k / 10, x = ex + (u - 0.5) * EW * 1.04, y = ey + almond(u) * 1.04;
            lid.push(new THREE.Vector3(x, y, headSurfaceZ(HEAD, x, y) + 0.0022));
        }
        face.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lid), 16, 0.0018, 5, false), mats.eye));
    });
    const nose = mesh(new THREE.SphereGeometry(0.021, 14, 10), mats.skin, 0, -0.008, headSurfaceZ(HEAD, 0, -0.008) + 0.006);
    nose.scale.set(1, 1.05, 0.9);
    face.add(nose);

    // ---------- Arms (two segments between shoulder and hand) ----------
    // The hands sit on the mixer in the middle of the booth.
    // Mixer top (+0.07), raised 6 cm where the hands rest: the mixer is
    // tilted towards the audience, so its back edge sits higher.
    const deckTop = BOOTH.height + 0.07 + 0.06 - 0.92; // in body space, before lean
    const armGeo = g(new THREE.CylinderGeometry(1, 1, 1, 10)); // unit: scaled per frame
    const jointGeo = g(new THREE.SphereGeometry(1, 10, 8));
    const handGeo = g(new THREE.SphereGeometry(0.045, 10, 8));
    const arms = [-1, 1].map(s => {
        const upper = new THREE.Mesh(armGeo, mats.polo);
        const fore = new THREE.Mesh(armGeo, mats.skin);
        const hand = new THREE.Mesh(handGeo, mats.skin);
        hand.scale.set(1, 0.7, 1.25);
        const joint = new THREE.Mesh(jointGeo, mats.polo); // elbow, sleeve edge
        joint.scale.setScalar(0.047);
        body.add(upper, fore, hand, joint);
        return {
            s, upper, fore, hand, joint,
            shoulder: new THREE.Vector3(s * 0.2, shoulderY - 0.03, 0),
            target: new THREE.Vector3(),
        };
    });

    const up = new THREE.Vector3(0, 1, 0);
    const tmp = new THREE.Vector3();
    function placeLimb(m, a, b, radius) {
        tmp.subVectors(b, a);
        const len = tmp.length();
        m.position.copy(a).addScaledVector(tmp, 0.5);
        m.quaternion.setFromUnitVectors(up, tmp.normalize());
        m.scale.set(radius, len, radius);
    }

    const elbow = new THREE.Vector3();
    function poseArm(arm) {
        const { shoulder, target, s } = arm;
        // Elbow: midpoint pushed out and down — a fixed, natural bend.
        elbow.lerpVectors(shoulder, target, 0.5);
        elbow.x += s * 0.07;
        elbow.y -= 0.07;
        elbow.z -= 0.04;
        placeLimb(arm.upper, shoulder, elbow, 0.045);
        placeLimb(arm.fore, elbow, target, 0.036);
        arm.joint.position.copy(elbow);
        arm.hand.position.copy(target);
    }

    // Compensate the forward lean so the hands stay on the deck surface.
    const lean = body.rotation.x;
    function deckPoint(out, x, z) {
        // body space point that lands at world-ish height deckTop, depth z
        const c = Math.cos(lean), sn = Math.sin(lean);
        out.set(x, deckTop * c + z * sn, -deckTop * sn + z * c);
        return out;
    }

    function update(t) {
        const beat = (t * BPM) / 60;
        const ph = beat * Math.PI * 2;
        // Bounce on every beat, small sway every 4 beats.
        body.position.y = 0.92 - 0.014 * (0.5 - 0.5 * Math.cos(ph));
        body.rotation.z = 0.025 * Math.sin(ph / 4);
        head.rotation.x = 0.12 + 0.07 * (0.5 - 0.5 * Math.cos(ph));
        head.rotation.y = 0.18 * Math.sin(t * 0.35);
        // Left hand rides a knob in a small circle, right hand works the fader.
        const [left, right] = arms;
        deckPoint(left.target, -0.2 + 0.025 * Math.cos(t * 1.7), 0.46 + 0.02 * Math.sin(t * 1.7));
        deckPoint(right.target, 0.2 + 0.05 * Math.sin(t * 0.9 + Math.sin(t * 2.3) * 0.6), 0.48);
        // Every 8 bars or so, the right hand lifts for a moment.
        const lift = Math.max(0, Math.sin(t * 0.42) - 0.85) * 2.2;
        right.target.y += lift * 0.12;
        arms.forEach(poseArm);
    }
    update(0);

    // Soft key light on the face: the stage wash is all purple, and the
    // face would otherwise read as a single magenta blob.
    const key = new THREE.PointLight(PALETTE.text, 2.2, 3.2, 1.6);
    key.position.set(0.5, 2.1, 0.9);
    root.add(key);

    scene.add(root);

    const pickables = [];
    root.traverse(o => { if (o.isMesh) pickables.push(o); });
    let hover = 0, hoverGoal = 0;

    return {
        pickables,
        // Hover feedback: the headphone rings light up.
        setHover(on) { hoverGoal = on ? 1 : 0; },
        update(t, dt = 0.016) {
            hover += (hoverGoal - hover) * Math.min(1, dt * 8);
            mats.accent.emissiveIntensity = 1.4 + 3 * hover;
            update(t);
        },
        dispose() {
            geos.forEach(geo => geo.dispose());
            Object.values(mats).forEach(m => m.dispose());
            scene.remove(root);
        },
    };
}
