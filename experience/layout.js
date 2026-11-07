// Floor plan of the venue, in metres. Single source of truth for geometry,
// and later for collisions, interaction zones and the zone navigator.
//
// Axes: x = left/right (stage-left is negative), y = up,
//       z = depth — the stage is at negative z, the entrance at positive z.

export const PALETTE = {
    purple: 0xa30dad,
    purpleDark: 0x6f0ead,
    lavender: 0xb06aff,
    bg: 0x0d0d0f,
    bg2: 0x131318,
    bg3: 0x1a1a22,
    glow: 0x2b0b3d,
    text: 0xf0eefa,
    muted: 0x6b6880,
    border: 0x2a2a3a,
    live: 0xee0055,
};

export const HALL = { minX: -14, maxX: 14, minZ: -22, maxZ: 18, height: 9 };

// Raised stage across the north of the hall. The gaps between its sides and
// the hall walls (|x| 10 → 14) are the two ground-level corridors that lead
// straight to the backstage area.
export const STAGE = { minX: -10, maxX: 10, minZ: -10, maxZ: -2, height: 0.8 };

// LED wall standing at the back of the stage. The stage wings (|x| 7 → 10)
// stay open so you can walk around it into the backstage area.
export const LED_WALL = { z: -9.5, width: 14, bottom: 0.6, height: 5.6, depth: 0.35 }; // bottom = above stage floor

// DJ booth = Zone 3 (the mixing console). The DJ (Zone 2) stands behind it.
export const BOOTH = { x: 0, z: -6, width: 4.6, depth: 1.1, height: 1.05 };
export const DJ_SPOT = { x: 0, z: -6.82 }; // close enough to reach the mixer

// Front stairs from the floor up to the stage, one on each side.
export const FRONT_STAIRS = [-8.75, 8.75].map(x => ({
    x, width: 1.6, fromZ: -2, toZ: 0.4, steps: 4,
}));

// Rear stairs from the stage wings down to the backstage floor.
export const REAR_STAIRS = [-8.5, 8.5].map(x => ({
    x, width: 2, fromZ: -10, toZ: -12.4, steps: 4,
}));

export const BACKSTAGE = { minX: -14, maxX: 14, minZ: -22, maxZ: -10 };
export const BOOKING_DESK = { x: 0, z: -16.5, width: 3.2, depth: 1.2, height: 0.9 };

// "BACKSTAGE · VIP" door frames at the floor end of each side corridor.
export const VIP_DOORS = [-12, 12].map(x => ({ x, z: -2.2, width: 3.2, height: 3.2 }));

export const SPAWN = { x: 0, z: 15, facing: Math.PI }; // looking towards the stage

// Zone 1: one small LED totem per project, standing where the crowd would
// be, on an arc facing the stage. Kept low (TOTEM_SCALE) so the stage, the
// LED wall and the DJ stay visible above them from the projects station.
export const TOTEM_ARC = { cx: 0, cz: -6, radius: 11, stepDeg: 9, maxDeg: 34 };
export const TOTEM_SCALE = 0.744; // 0.62 × 1.2
export const TOTEM_SCREEN_Y = 1.85 * TOTEM_SCALE; // centre of the screen

export function totemPositions(count) {
    if (count <= 0) return [];
    const { cx, cz, radius, stepDeg, maxDeg } = TOTEM_ARC;
    // Spread evenly; tighten the step when there are many projects so the arc
    // never runs into the stairs. Beyond 12 projects a second, wider row starts.
    const perRow = 12;
    const out = [];
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / perRow);
        const inRow = Math.min(perRow, count - row * perRow);
        const k = i % perRow;
        const step = Math.min(stepDeg, (2 * maxDeg) / Math.max(1, inRow - 1));
        const deg = (k - (inRow - 1) / 2) * step;
        const a = (deg * Math.PI) / 180;
        const r = radius + row * 2.4;
        out.push({ x: cx + r * Math.sin(a), y: TOTEM_SCREEN_Y, z: cz + r * Math.cos(a), rotY: a });
    }
    return out;
}

// ---------- Guided navigation ----------
// Camera stations, one per zone, plus the starting point. `pos` is where the
// camera stands, `target` where it looks. Kept clear of every solid in the
// plan above (the camera never enters a mesh, so no collision pass needed).
export const ZONES = [
    { id: 'projects', num: '01', name: 'PROJETS', where: 'Devant la scène',
      pos: [0, 3.2, 14.2], target: [0, 1.9, -1.5],
      portrait: { pos: [0, 3.9, 17.6], target: [0, 2.0, -1.5] } }, // narrow screens: step back to fit the arc
    { id: 'dj', num: '02', name: 'LE DJ', where: 'Derrière les platines',
      pos: [0, 2.75, -2.2], target: [0, 2.15, -7.2] },
    { id: 'console', num: '03', name: 'CONSOLE', where: 'La table de mixage',
      pos: [0, 3.3, -3.3], target: [0, 1.7, -6.3] },
    { id: 'backstage', num: '04', name: 'COULISSES', where: "L'arrière de la scène",
      pos: [7.4, 2.7, -11.6], target: [0, 1.2, -17.5] },
];
export const START_VIEW = { id: 'start', pos: [0, 3.6, 17.2], target: [0, 2.6, -4] };

// The LED wall splits the hall in two. Moving between the front and the
// backstage goes round it through the stage-right corridor (x 10 → 14),
// past the VIP door, like a visitor would.
export const BACK_Z = LED_WALL.z;
export const CORRIDOR_PATH = [[12, 2.4, 0.5], [12, 2.4, -6], [11.6, 2.5, -11.4]];

// Close-up framing of one totem. `side` shifts the look target so the totem
// sits in the free part of the screen next to the project panel.
export function totemView({ x, y, z, rotY }, side) {
    const nx = Math.sin(rotY), nz = Math.cos(rotY);   // totem facing direction
    const rx = Math.cos(rotY), rz = -Math.sin(rotY);  // totem's right
    // Bottom sheet (phones): stand back and look down, so the totem sits in
    // the top third of the screen, above the sheet. Side panel: shift right.
    const dist = side === 'bottom' ? 5.2 : 5.4;
    const shiftR = side === 'right' ? 1.8 : 0;
    const ty = side === 'bottom' ? y - 2.1 : y + 0.3;
    return {
        pos: [x + nx * dist, y + 0.25, z + nz * dist],
        target: [x + rx * shiftR, ty, z + rz * shiftR],
    };
}

// Framing of the DJ while his presentation panel is open: he sits in the
// free part of the screen, left of the side panel or above the bottom sheet.
// Framing of the mixer with a channel selected: the selected channel is
// drawn in the free part of the screen (left of the side panel, above the
// bottom sheet), seen from the audience side looking down on the faders.
export function consoleView({ x }, side) {
    return side === 'bottom'
        ? { pos: [x * 0.4, 3.2, -4.0], target: [x * 0.4, -0.8, -6.5] }
        : { pos: [x * 0.5 + 0.35, 3.4, -3.2], target: [x * 0.5 + 0.6, 1.6, -6.3] };
}

// Framing of the booking desk next to the booking panel.
export function bookingView(side) {
    return side === 'bottom'
        ? { pos: [0, 3.5, -10.9], target: [0, -0.4, -16.6] }
        : { pos: [-0.6, 2.9, -11.0], target: [1.9, 1.4, -16.6] };
}

export function djPanelView(side) {
    return side === 'bottom'
        ? { pos: [0, 3.3, -0.4], target: [0, -0.4, -7.0] }
        : { pos: [-0.5, 2.85, -1.7], target: [1.7, 2.1, -7.0] };
}
