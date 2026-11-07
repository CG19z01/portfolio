// Zone 3 — the mixing console. One channel per skill from /api/skills, in
// the order the admin panel saved them. Each channel's fader and VU meter
// sit at the skill's saved level (the same "pct" the classic equalizer
// shows as dB): nothing is invented. Arriving at the zone, the faders slide
// up from zero to their level; that is the only motion.
//
// HTML layer: a channel list (keyboard access, shown in zone 3) and a
// detail panel with the selected channel and the whole mix.

import * as THREE from 'three';
import { PALETTE, STAGE, BOOTH } from './layout.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const pad2 = n => String(n).padStart(2, '0');
const clampPct = v => Math.max(0, Math.min(100, Number(v) || 0));

// Mixer body between the two decks (decks at x ±1.45, radius 0.3).
export const MIXER = { width: 2.2, depth: 0.8, height: 0.07 };
const TOP_Y = STAGE.height + BOOTH.height + MIXER.height; // world y of the top face
const TEX_W = 2048;
const TEX_H = Math.round(TEX_W * MIXER.depth / MIXER.width);
// Vertical layout of a channel strip on the top face, as fractions of the
// depth from the back edge (DJ side) to the front edge (visitor side).
const STRIP = { meterTop: 0.07, meterBottom: 0.36, faderTop: 0.42, faderBottom: 0.8, label: 0.9 };
const SEGMENTS = 12;
const RISE = 1.4; // s for the faders to reach their level

function segColor(k) {
    if (k >= SEGMENTS - 2) return '#ee0055';
    if (k >= SEGMENTS - 5) return '#b06aff';
    return '#A30DAD';
}

function fitFont(ctx, text, maxW, size, family, weight = 700) {
    let s = size;
    ctx.font = `${weight} ${s}px ${family}`;
    while (ctx.measureText(text).width > maxW && s > 14) {
        s -= 2;
        ctx.font = `${weight} ${s}px ${family}`;
    }
}

export function createConsoleZone({ scene, root, skills, error }) {
    const n = skills.length;
    const colW = n ? Math.min(0.28, (MIXER.width - 0.12) / n) : 0; // metres
    const x0 = -(colW * n) / 2;                                    // first column's left edge
    const colX = i => x0 + colW * (i + 0.5);
    const zOf = f => -MIXER.depth / 2 + f * MIXER.depth;           // local z of a depth fraction
    const level = skills.map(s => clampPct(s.pct) / 100);
    const shown = level.map(() => 0); // animated level (0 → saved level)

    // ---------- 3D ----------
    const group = new THREE.Group();
    group.position.set(BOOTH.x, 0, BOOTH.z);
    const caseMat = new THREE.MeshStandardMaterial({ color: PALETTE.bg3, roughness: 0.6, metalness: 0.3 });
    const caseGeo = new THREE.BoxGeometry(MIXER.width, MIXER.height, MIXER.depth);
    const body = new THREE.Mesh(caseGeo, caseMat);
    body.position.y = TOP_Y - MIXER.height / 2;
    group.add(body);

    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const faceMat = new THREE.MeshStandardMaterial({
        color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9,
    });
    const faceGeo = new THREE.PlaneGeometry(MIXER.width - 0.02, MIXER.depth - 0.02);
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.rotation.x = -Math.PI / 2; // texture top = back edge (DJ side)
    face.position.y = TOP_Y + 0.002;
    group.add(face);

    // Fader caps (3D, so they catch the light) and one invisible hit box per
    // channel for picking.
    const capGeo = new THREE.BoxGeometry(Math.min(0.11, colW * 0.6), 0.035, 0.05);
    const hitGeo = new THREE.BoxGeometry(colW * 0.96, 0.12, MIXER.depth);
    const hitMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    const channels = skills.map((s, i) => {
        const capMat = new THREE.MeshStandardMaterial({
            color: PALETTE.text, roughness: 0.35, metalness: 0.2,
            emissive: PALETTE.purple, emissiveIntensity: 0,
        });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(colX(i), TOP_Y + 0.02, zOf(STRIP.faderBottom));
        group.add(cap);
        const hit = new THREE.Mesh(hitGeo, hitMat);
        hit.position.set(colX(i), TOP_Y + 0.04, 0);
        hit.userData.channel = i;
        cap.userData.channel = i;
        group.add(hit);
        return { cap, capMat, hit, glow: 0 };
    });
    scene.add(group);

    let hovered = -1;
    let active = -1;
    let rising = -1; // time since the faders started rising, -1 = idle
    let dirty = true;

    function draw() {
        const W = TEX_W, H = TEX_H;
        ctx.fillStyle = '#131318';
        ctx.fillRect(0, 0, W, H);
        const px = m => ((m + MIXER.width / 2) / MIXER.width) * W; // local x (m) → px
        const py = f => f * H;
        const cw = (colW / MIXER.width) * W;
        // Master section label on the empty side bands, if there is room.
        ctx.fillStyle = '#6b6880';
        ctx.font = "400 22px 'IBM Plex Mono', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (!n) {
            ctx.fillText(error ? 'COMPÉTENCES INDISPONIBLES' : 'AUCUN CANAL', W / 2, H / 2);
        }
        skills.forEach((s, i) => {
            const cx = px(colX(i));
            const left = cx - cw / 2;
            const glow = channels[i].glow;
            // Strip background + separator
            ctx.fillStyle = glow > 0.02 ? `rgba(111,14,173,${0.12 + 0.3 * glow})` : 'rgba(255,255,255,.02)';
            ctx.fillRect(left + 3, 6, cw - 6, H - 12);
            ctx.fillStyle = '#2a2833';
            ctx.fillRect(left, 10, 2, H - 20);
            // Channel number
            ctx.fillStyle = '#6b6880';
            ctx.font = "400 22px 'IBM Plex Mono', monospace";
            ctx.fillText(`CH ${pad2(i + 1)}`, cx, py(0.035));
            // VU meter: segments lit up to the (animated) level
            const mt = py(STRIP.meterTop), mb = py(STRIP.meterBottom);
            const segH = (mb - mt) / SEGMENTS;
            const lit = Math.round(shown[i] * SEGMENTS);
            for (let k = 0; k < SEGMENTS; k++) {
                const y = mb - (k + 1) * segH;
                ctx.fillStyle = k < lit ? segColor(k) : '#24222c';
                ctx.fillRect(cx - cw * 0.22, y + 2, cw * 0.44, segH - 4);
            }
            // Fader slot + scale ticks
            const ft = py(STRIP.faderTop), fb = py(STRIP.faderBottom);
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(cx - 5, ft, 10, fb - ft);
            ctx.fillStyle = '#3a3846';
            for (let k = 0; k <= 10; k++) {
                const y = fb - (k / 10) * (fb - ft);
                const w = k % 5 === 0 ? cw * 0.3 : cw * 0.16;
                ctx.fillRect(cx - 12 - w, y - 1, w, 2);
            }
            // Level fill along the slot
            ctx.fillStyle = '#A30DAD';
            ctx.fillRect(cx - 3, fb - shown[i] * (fb - ft), 6, shown[i] * (fb - ft));
            // Label: name + level (same "dB" wording as the classic page)
            ctx.fillStyle = glow > 0.5 ? '#ffffff' : '#f0eefa';
            fitFont(ctx, s.name.toUpperCase(), cw - 16, 46, "'Bebas Neue', sans-serif");
            ctx.fillText(s.name.toUpperCase(), cx, py(STRIP.label) - 14);
            ctx.fillStyle = '#b06aff';
            ctx.font = "400 22px 'IBM Plex Mono', monospace";
            ctx.fillText(`${clampPct(s.pct)} dB`, cx, py(STRIP.label) + 26);
        });
        ctx.fillStyle = '#2a2833';
        if (n) ctx.fillRect(px(x0 + colW * n) - 2, 10, 2, H - 20);
        tex.needsUpdate = true;
        dirty = false;
    }
    draw();

    function placeCaps() {
        channels.forEach((c, i) => {
            const f = STRIP.faderBottom - shown[i] * (STRIP.faderBottom - STRIP.faderTop);
            c.cap.position.z = zOf(f);
        });
    }

    // ---------- HTML: channel list + detail panel ----------
    const list = document.createElement('div'); // not <nav>: the classic page styles every nav
    list.className = 'xp-setlist xp-channels';
    list.setAttribute('role', 'navigation');
    list.setAttribute('aria-label', 'Canaux de la console');
    list.hidden = true;
    list.innerHTML = n
        ? `<div class="xp-setlist-head"><span class="live-dot"></span> CONSOLE · ${n} CANAUX</div>
           <ol>${skills.map((s, i) => `
             <li><button type="button" data-xp-channel="${i}">
               <span class="xp-setlist-num">CH ${pad2(i + 1)}</span>
               <span class="xp-setlist-name">${esc(s.name)}</span>
               <span class="xp-channel-db">${clampPct(s.pct)} dB</span>
             </button></li>`).join('')}
           </ol>`
        : `<div class="xp-setlist-head">${error
            ? 'Les compétences sont momentanément indisponibles.'
            : 'Rien à afficher pour le moment.'}</div>`;
    root.appendChild(list);

    const panel = document.createElement('div'); // not <section>: styled by the classic page
    panel.className = 'xp-panel xp-skill';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'xpSkillTitle');
    panel.hidden = true;
    root.appendChild(panel);

    let handlers = { select() {}, close() {} };
    list.addEventListener('click', e => {
        const b = e.target.closest('[data-xp-channel]');
        if (b) handlers.select(Number(b.dataset.xpChannel), b);
    });
    panel.addEventListener('click', e => {
        if (e.target.closest('[data-xp-close]')) handlers.close();
        const step = e.target.closest('[data-xp-step]');
        if (step) handlers.select((active + Number(step.dataset.xpStep) + n) % n);
        const ch = e.target.closest('[data-xp-mix]');
        if (ch) handlers.select(Number(ch.dataset.xpMix));
    });

    function panelHtml(i) {
        const s = skills[i];
        const pct = clampPct(s.pct);
        return `
          <div class="xp-panel-head">
            <span class="xp-panel-track">CANAL ${pad2(i + 1)} / ${pad2(n)}</span>
            <button type="button" class="xp-icon-btn" data-xp-close aria-label="Fermer la compétence">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
          <div class="xp-panel-scroll">
            <h2 class="xp-panel-title" id="xpSkillTitle" tabindex="-1">${esc(s.name)}</h2>
            <div class="xp-level" role="img" aria-label="Niveau : ${pct} sur 100">
              <span class="xp-level-db">${pct}<small> dB</small></span>
              <span class="xp-level-track"><span class="xp-level-fill" style="width:${pct}%"></span></span>
            </div>
            <h3 class="xp-sub">Le mix complet</h3>
            <ul class="xp-mix">${skills.map((m, k) => `
              <li><button type="button" data-xp-mix="${k}"${k === i ? ' aria-current="true"' : ''}>
                <span class="xp-mix-name">${esc(m.name)}</span>
                <span class="xp-mix-track"><span class="xp-mix-fill" style="width:${clampPct(m.pct)}%"></span></span>
                <span class="xp-mix-db">${clampPct(m.pct)} dB</span>
              </button></li>`).join('')}
            </ul>
          </div>
          <div class="xp-panel-nav">
            <button type="button" class="xp-hud-btn" data-xp-step="-1" ${n < 2 ? 'disabled' : ''}>← CANAL PRÉC.</button>
            <button type="button" class="xp-hud-btn" data-xp-step="1" ${n < 2 ? 'disabled' : ''}>CANAL SUIV. →</button>
          </div>`;
    }

    function markList() {
        list.querySelectorAll('[data-xp-channel]').forEach(b => {
            if (Number(b.dataset.xpChannel) === active) b.setAttribute('aria-current', 'true');
            else b.removeAttribute('aria-current');
        });
    }

    return {
        count: n,
        pickables: channels.flatMap(c => [c.hit]),
        on(h) { handlers = { ...handlers, ...h }; },
        setHover(i) { hovered = i; },
        showList(show) { list.hidden = !show; },
        // Faders slide from zero to their saved level (instant if reduced motion).
        arrive(instant) {
            if (instant) {
                level.forEach((l, i) => { shown[i] = l; });
                rising = -1;
                placeCaps();
                dirty = true;
            } else if (rising < 0 && shown.some((v, i) => v !== level[i])) {
                rising = 0;
            }
        },
        open(i) {
            active = i;
            panel.innerHTML = panelHtml(i);
            panel.hidden = false;
            panel.classList.remove('is-in');
            void panel.offsetWidth;
            panel.classList.add('is-in');
            markList();
            panel.querySelector('#xpSkillTitle').focus({ preventScroll: true });
        },
        close() {
            active = -1;
            panel.hidden = true;
            panel.classList.remove('is-in');
            markList();
        },
        get active() { return active; },
        get isOpen() { return !panel.hidden; },
        // World position of a channel (for camera framing).
        place(i) {
            return { x: BOOTH.x + (n ? colX(i) : 0), y: TOP_Y, z: BOOTH.z };
        },
        update(t, dt) {
            if (rising >= 0) {
                rising += dt;
                const e = 1 - Math.pow(1 - Math.min(1, rising / RISE), 3);
                level.forEach((l, i) => { shown[i] = l * e; });
                if (rising >= RISE) rising = -1;
                placeCaps();
                dirty = true;
            }
            channels.forEach((c, i) => {
                const goal = i === active ? 1 : i === hovered ? 0.7 : 0;
                const before = c.glow;
                c.glow += (goal - c.glow) * Math.min(1, dt * 8);
                if (Math.abs(c.glow - goal) < 0.01) c.glow = goal;
                if (Math.abs(c.glow - before) > 0.004) dirty = true;
                c.capMat.emissiveIntensity = 1.6 * c.glow;
            });
            if (dirty) draw();
        },
        dispose() {
            tex.dispose();
            faceMat.dispose();
            caseMat.dispose();
            hitMat.dispose();
            channels.forEach(c => c.capMat.dispose());
            [caseGeo, faceGeo, capGeo, hitGeo].forEach(g => g.dispose());
            scene.remove(group);
            list.remove();
            panel.remove();
        },
    };
}
