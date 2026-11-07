// Builds the venue: hall shell, stage, LED wall, booth, lights, backstage.
// Zone content (project totems, DJ, console, contacts) lives in its own
// module and is added on top.

import * as THREE from 'three';
import {
    PALETTE, HALL, STAGE, LED_WALL, BOOTH, FRONT_STAIRS, REAR_STAIRS,
    BOOKING_DESK, VIP_DOORS,
} from './layout.js';

const mat = {
    floor: new THREE.MeshStandardMaterial({ color: PALETTE.bg3, roughness: 0.6, metalness: 0 }),
    wall: new THREE.MeshStandardMaterial({ color: PALETTE.bg3, roughness: 0.95 }),
    stage: new THREE.MeshStandardMaterial({ color: PALETTE.bg2, roughness: 0.6, metalness: 0.2 }),
    stageEdge: new THREE.MeshStandardMaterial({ color: PALETTE.purple, emissive: PALETTE.purple, emissiveIntensity: 1.6 }),
    metal: new THREE.MeshStandardMaterial({ color: PALETTE.border, roughness: 0.45, metalness: 0.3 }),
    black: new THREE.MeshStandardMaterial({ color: PALETTE.bg, roughness: 0.8 }),
    case: new THREE.MeshStandardMaterial({ color: PALETTE.border, roughness: 0.55, metalness: 0.1 }),
};

function box(w, h, d, material, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y + h / 2, z); // y = bottom of the box
    return m;
}

// Text drawn on a canvas, shown as a camera-facing sprite (zone signs).
function label(text, { size = 0.9, color = '#f0eefa', accent = '#A30DAD' } = {}) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const font = "700 96px 'Bebas Neue', sans-serif";
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 80;
    c.width = w;
    c.height = 150;
    ctx.font = font;
    ctx.fillStyle = 'rgba(13,13,15,.72)';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = accent;
    ctx.fillRect(0, c.height - 8, c.width, 8);
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 40, c.height / 2 + 4);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
    sprite.scale.set((size * c.width) / c.height, size, 1);
    return sprite;
}

function ledWallTexture() {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 410;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(0, '#2b0b3d');
    g.addColorStop(0.5, '#6F0EAD');
    g.addColorStop(1, '#2b0b3d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.font = "700 120px 'Bebas Neue', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f0eefa';
    ctx.fillText('CODE & MUSIQUE', c.width / 2, c.height / 2);
    // LED pixel grid
    ctx.fillStyle = 'rgba(13,13,15,.35)';
    for (let x = 0; x < c.width; x += 6) ctx.fillRect(x, 0, 1, c.height);
    for (let y = 0; y < c.height; y += 6) ctx.fillRect(0, y, c.width, 1);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function floorTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(42,42,58,.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 254, 254);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set((HALL.maxX - HALL.minX) / 2, (HALL.maxZ - HALL.minZ) / 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
}

function stairs({ x, width, fromZ, toZ, steps }, topY) {
    const g = new THREE.Group();
    const run = (toZ - fromZ) / steps;
    const rise = topY / steps;
    for (let i = 0; i < steps; i++) {
        const h = topY - i * rise;
        const z = fromZ + run * (i + 0.5);
        g.add(box(width, h, Math.abs(run), mat.stage, x, 0, z));
    }
    return g;
}

// Additive cone faking a volumetric light beam.
function beam(color, length, radius) {
    const geo = new THREE.ConeGeometry(radius, length, 24, 1, true);
    geo.translate(0, -length / 2, 0); // apex at the origin, pointing down
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
    }));
    return m;
}

export function buildWorld(scene) {
    const world = new THREE.Group();
    const animated = []; // (t) => void

    scene.background = new THREE.Color(PALETTE.bg);
    scene.fog = new THREE.FogExp2(PALETTE.bg, 0.022);

    // ---------- Shell ----------
    const W = HALL.maxX - HALL.minX;
    const D = HALL.maxZ - HALL.minZ;
    const floorMat = mat.floor.clone();
    floorMat.map = floorTexture();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((HALL.minX + HALL.maxX) / 2, 0, (HALL.minZ + HALL.maxZ) / 2);
    world.add(floor);

    // Walls are single inward-facing planes: from inside they are solid, and
    // whenever the camera is outside (overview) the near ones cull away.
    const cx = (HALL.minX + HALL.maxX) / 2;
    const cz = (HALL.minZ + HALL.maxZ) / 2;
    [
        [W, cx, HALL.minZ, 0],
        [W, cx, HALL.maxZ, Math.PI],
        [D, HALL.minX, cz, Math.PI / 2],
        [D, HALL.maxX, cz, -Math.PI / 2],
    ].forEach(([len, x, z, rotY]) => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, HALL.height), mat.wall);
        wall.position.set(x, HALL.height / 2, z);
        wall.rotation.y = rotY;
        world.add(wall);
        const trim = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.05), mat.stageEdge);
        trim.position.set(x, 0.35, z);
        trim.rotation.y = rotY;
        trim.translateZ(0.01);
        world.add(trim);
    });

    // ---------- Stage ----------
    const sw = STAGE.maxX - STAGE.minX;
    const sd = STAGE.maxZ - STAGE.minZ;
    world.add(box(sw, STAGE.height, sd, mat.stage, 0, 0, (STAGE.minZ + STAGE.maxZ) / 2));
    world.add(box(sw, 0.04, 0.06, mat.stageEdge, 0, STAGE.height - 0.04, STAGE.maxZ + 0.03));
    FRONT_STAIRS.forEach(s => world.add(stairs(s, STAGE.height)));
    REAR_STAIRS.forEach(s => world.add(stairs(s, STAGE.height)));

    // LED wall (Zone 1 big screen)
    const ledMat = new THREE.MeshStandardMaterial({
        color: 0x000000, emissive: 0xffffff, emissiveMap: ledWallTexture(), emissiveIntensity: 1.1,
    });
    const led = new THREE.Mesh(new THREE.BoxGeometry(LED_WALL.width, LED_WALL.height, LED_WALL.depth), [
        mat.black, mat.black, mat.black, mat.black, ledMat, mat.black,
    ]);
    led.position.set(0, STAGE.height + LED_WALL.bottom + LED_WALL.height / 2, LED_WALL.z);
    world.add(led);
    world.add(box(LED_WALL.width + 0.4, LED_WALL.bottom, 0.5, mat.metal, 0, STAGE.height, LED_WALL.z));
    animated.push(time => { ledMat.emissiveIntensity = 1 + 0.12 * Math.sin(time * 0.8); });

    // DJ booth (Zone 3). The DJ himself (Zone 2) is built by dj.js.
    world.add(box(BOOTH.width, BOOTH.height, BOOTH.depth, mat.black, BOOTH.x, STAGE.height, BOOTH.z));
    world.add(box(BOOTH.width, 0.03, 0.04, mat.stageEdge, BOOTH.x, STAGE.height + BOOTH.height - 0.15, BOOTH.z + BOOTH.depth / 2 + 0.02));
    const deckTop = STAGE.height + BOOTH.height;
    [-1.45, 1.45].forEach(dx => {
        const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 32), mat.metal);
        deck.position.set(BOOTH.x + dx, deckTop + 0.04, BOOTH.z);
        world.add(deck);
    });
    // The mixer between the decks is Zone 3, built by console.js.

    // Truss + moving heads
    const trussY = 7.6;
    world.add(box(sw - 1, 0.3, 0.3, mat.metal, 0, trussY, -2.6));
    world.add(box(sw - 1, 0.3, 0.3, mat.metal, 0, trussY, -9));
    [-9.5, 9.5].forEach(x => world.add(box(0.3, 0.3, 6.7, mat.metal, x, trussY, -5.8)));
    const beamColors = [PALETTE.purple, PALETTE.lavender, PALETTE.purpleDark, PALETTE.lavender, PALETTE.purple];
    beamColors.forEach((color, i) => {
        const x = -8 + i * 4;
        const head = box(0.4, 0.45, 0.4, mat.black, x, trussY - 0.45, -2.6);
        world.add(head);
        const b = beam(color, 8.5, 1.3);
        b.position.set(x, trussY - 0.4, -2.6);
        world.add(b);
        const phase = i * 1.3;
        animated.push(time => {
            b.rotation.z = 0.35 * Math.sin(time * 0.35 + phase);
            b.rotation.x = -0.35 + 0.15 * Math.sin(time * 0.27 + phase);
        });
    });

    // Flown line-arrays above the stage corners + subs on the floor
    [-9, 9].forEach(x => {
        for (let i = 0; i < 5; i++) {
            const cab = box(1.1, 0.42, 0.8, mat.black, x, 6.6 - i * 0.46, -2.4);
            cab.rotation.x = -0.05 * i;
            world.add(cab);
        }
    });
    [-6.2, 6.2].forEach(x => world.add(box(1.4, 1.1, 1.0, mat.black, x, 0, -1.45)));

    // Zone 1 totems are built by projects.js from the API data.

    // ---------- Zone 4: backstage ----------
    world.add(box(BOOKING_DESK.width, BOOKING_DESK.height, BOOKING_DESK.depth, mat.case, BOOKING_DESK.x, 0, BOOKING_DESK.z));
    const lamp = new THREE.PointLight(PALETTE.lavender, 25, 10, 1.4);
    lamp.position.set(BOOKING_DESK.x, 2.4, BOOKING_DESK.z + 0.4);
    world.add(lamp);
    [
        [-11, -13, 1.2, 0.9, 1.6], [-11, -15, 1.2, 0.9, 1.6], [-11.2, -13.6, 1.0, 0.8, 1.2, 0.9],
        [10.8, -19.5, 1.6, 1.0, 1.0], [11.2, -17.6, 1.2, 1.2, 1.2], [-6, -20.5, 2.2, 1.0, 0.9],
    ].forEach(([x, z, w, h, d, y = 0]) => world.add(box(w, h, d, mat.case, x, y, z)));
    // Rack (régie)
    world.add(box(0.8, 2, 0.7, mat.black, -9, 0, -20.8));
    for (let i = 0; i < 6; i++) {
        world.add(box(0.7, 0.04, 0.02, mat.stageEdge, -9, 0.4 + i * 0.27, -20.44));
    }
    // Cable runs on the floor
    const cableMat = new THREE.MeshStandardMaterial({ color: PALETTE.bg, roughness: 0.4 });
    [[-8.5, -12.6, 0, -15.8], [8.5, -12.6, 1.2, -15.8], [0, -17.2, -9, -20.4]].forEach(([x1, z1, x2, z2]) => {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(x1, 0.03, z1),
            new THREE.Vector3((x1 + x2) / 2 + 1.2, 0.03, (z1 + z2) / 2 - 0.6),
            new THREE.Vector3(x2, 0.03, z2),
        ]);
        world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.03, 6), cableMat));
    });

    // VIP doors at the corridor entrances
    VIP_DOORS.forEach(({ x, z, width, height }) => {
        world.add(box(0.2, height, 0.3, mat.metal, x - width / 2, 0, z));
        world.add(box(0.2, height, 0.3, mat.metal, x + width / 2, 0, z));
        world.add(box(width + 0.2, 0.2, 0.3, mat.stageEdge, x, height, z));
    });

    // ---------- Lighting ----------
    world.add(new THREE.HemisphereLight(PALETTE.lavender, PALETTE.glow, 1.6));
    world.add(new THREE.AmbientLight(PALETTE.text, 0.25));
    const spots = [[-5, PALETTE.purple], [0, PALETTE.lavender], [5, PALETTE.purple]].map(([x, color]) => {
        const s = new THREE.SpotLight(color, 60, 18, 0.45, 0.6, 1.5);
        s.position.set(x, 7.2, -2.6);
        s.target.position.set(x * 0.4, STAGE.height, -6.5);
        world.add(s, s.target);
        return s;
    });
    const floorWash = new THREE.PointLight(PALETTE.purple, 45, 26, 1.4);
    floorWash.position.set(0, 5, 4);
    world.add(floorWash);
    const backWash = new THREE.PointLight(PALETTE.purple, 40, 20, 1.3);
    backWash.position.set(0, 5, -15);
    world.add(backWash);

    // ---------- Signs (the HUD names the zones; these mark the way round) ----------
    const signs = new THREE.Group();
    const addSign = (text, x, y, z, size) => {
        const s = label(text, { size });
        s.position.set(x, y, z);
        signs.add(s);
    };
    addSign('VIP', -12, 4.1, -2.2, 0.6);
    addSign('VIP', 12, 4.1, -2.2, 0.6);
    world.add(signs);

    scene.add(world);

    return {
        ledMaterial: ledMat, // the LED wall content is driven by ledwall.js
        update(time) { animated.forEach(fn => fn(time)); },
        // Low quality: the spotlights go (one-time shader rebuild), while the
        // floor wash brightens a little to keep the stage readable.
        setLowLights(low) {
            spots.forEach(s => { s.visible = !low; });
            floorWash.intensity = low ? 70 : 45;
        },
        dispose() {
            world.traverse(o => {
                if (o.geometry) o.geometry.dispose();
                const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
                mats.forEach(m => { m.map?.dispose(); m.emissiveMap?.dispose(); m.dispose(); });
            });
            Object.values(mat).forEach(m => m.dispose());
            scene.remove(world);
        },
    };
}
