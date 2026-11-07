// Zone 2 — the DJ. A stylised, low-poly figure modelled on the profile
// photo of the classic page ("photo CV.jpg"): shaved head, long face,
// short rounded brown beard with moustache, prominent ears, black polo.
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
    brow: 0x4a3122,
    eye: 0x2a2620,
    polo: 0x17171d,
    collar: 0x202028,
    jeans: 0x1c1c26,
};

const BPM = 122;

export function createDJ(scene) {
    const mats = {
        skin: new THREE.MeshStandardMaterial({ color: COLORS.skin, roughness: 0.55 }),
        beard: new THREE.MeshStandardMaterial({ color: COLORS.beard, roughness: 0.95, side: THREE.DoubleSide, flatShading: true }),
        brow: new THREE.MeshStandardMaterial({ color: COLORS.brow, roughness: 0.9 }),
        eye: new THREE.MeshStandardMaterial({ color: COLORS.eye, roughness: 0.3 }),
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
    body.add(mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.14, 10), mats.skin, 0, 0.66, 0));

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
    head.position.set(0, 0.74, 0.01); // pivot at the top of the neck
    body.add(head);
    const face = new THREE.Group();
    face.position.y = 0.13; // centre of the skull above the pivot
    head.add(face);

    const HEAD = { r: 0.105, sx: 0.9, sy: 1.3, sz: 1.0 };
    const skull = mesh(new THREE.SphereGeometry(HEAD.r, 24, 18), mats.skin);
    skull.scale.set(HEAD.sx, HEAD.sy, HEAD.sz);
    face.add(skull);

    // Beard: lower shell of a slightly larger ellipsoid, open at the back
    // (it runs along the jaw up to the ears, like on the photo), plus a
    // rounded chin.
    const beardGeo = new THREE.SphereGeometry(HEAD.r * 1.08, 20, 14,
        Math.PI / 2 - 2.05, 4.1,        // phi: front 235°
        Math.PI * 0.56, Math.PI * 0.44); // theta: from cheekbones down
    const beard = mesh(beardGeo, mats.beard);
    beard.scale.set(HEAD.sx * 1.02, HEAD.sy, HEAD.sz * 1.04);
    face.add(beard);
    const chin = mesh(new THREE.SphereGeometry(0.062, 12, 10), mats.beard, 0, -0.118, 0.045);
    chin.scale.set(1.1, 0.85, 1);
    face.add(chin);
    const stache = mesh(new THREE.CapsuleGeometry(0.013, 0.05, 3, 8), mats.beard, 0, -0.04, 0.1);
    stache.rotation.z = Math.PI / 2;
    face.add(stache);

    // Ears
    [-1, 1].forEach(s => {
        const ear = mesh(new THREE.SphereGeometry(0.03, 10, 8), mats.skin, s * HEAD.r * HEAD.sx, 0.0, -0.005);
        ear.scale.set(0.45, 1.05, 0.8);
        face.add(ear);
    });

    // Brows, eyes, nose — small, just enough to read a face
    [-1, 1].forEach(s => {
        const brow = mesh(new THREE.BoxGeometry(0.042, 0.009, 0.012), mats.brow, s * 0.038, 0.05, 0.096);
        brow.rotation.z = s * -0.12;
        face.add(brow);
        face.add(mesh(new THREE.SphereGeometry(0.01, 8, 6), mats.eye, s * 0.036, 0.024, 0.097));
    });
    const nose = mesh(new THREE.SphereGeometry(0.018, 10, 8), mats.skin, 0, -0.004, 0.104);
    nose.scale.set(0.9, 1.2, 1);
    face.add(nose);

    // ---------- Arms (two segments between shoulder and hand) ----------
    // The hands sit on the mixer in the middle of the booth.
    const deckTop = BOOTH.height + 0.07 - 0.92; // in body space, before lean
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

    return {
        update,
        dispose() {
            geos.forEach(geo => geo.dispose());
            Object.values(mats).forEach(m => m.dispose());
            scene.remove(root);
        },
    };
}
