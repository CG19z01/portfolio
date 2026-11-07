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
export const DJ_SPOT = { x: 0, z: -7.1 };

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

// Zone 1: one LED totem per project, laid out on an arc facing the audience.
export const TOTEM_ARC = { cx: 0, cz: -6, radius: 11, stepDeg: 13, maxDeg: 38 };

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
        const r = radius + row * 3.2;
        out.push({ x: cx + r * Math.sin(a), z: cz + r * Math.cos(a), rotY: a });
    }
    return out;
}
