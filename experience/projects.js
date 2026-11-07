// Zone 1 — the projects. One small LED totem per project on the arc in
// front of the stage, where the crowd stands, plus the HTML layer that actually presents them: a setlist (quick
// access, keyboard friendly) and a detail panel. Every field comes from
// /api/projects, exactly as the admin panel saved it.

import * as THREE from 'three';
import { PALETTE, TOTEM_SCALE, totemPositions } from './layout.js';
import { loadImage, drawCover } from './images.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Same icons as the classic carousel (the GitHub path is the page's shared sprite).
const GITHUB_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><use href="#icon-github"/></svg>';
const DEMO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

// ---------- Totem screen ----------

const SCREEN_W = 480;
const SCREEN_H = 512;

function drawScreen(ctx, project, index, img) {
    const W = SCREEN_W, H = SCREEN_H, imgH = 330;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#2b0b3d');
    g.addColorStop(1, '#131318');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (img) {
        drawCover(ctx, img, 0, 0, W, imgH);
    } else {
        ctx.fillStyle = 'rgba(163,13,173,.25)';
        ctx.fillRect(0, 0, W, imgH);
        ctx.fillStyle = 'rgba(240,238,250,.35)';
        ctx.font = "700 150px 'Bebas Neue', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(index + 1).padStart(2, '0'), W / 2, imgH / 2 + 8);
    }
    ctx.fillStyle = '#A30DAD';
    ctx.fillRect(0, imgH, W, 6);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#6b6880';
    ctx.font = "400 24px 'IBM Plex Mono', monospace";
    ctx.fillText(`TRACK ${String(index + 1).padStart(2, '0')}`, 28, imgH + 48);
    ctx.fillStyle = '#f0eefa';
    let size = 76;
    ctx.font = `700 ${size}px 'Bebas Neue', sans-serif`;
    while (ctx.measureText(project.title).width > W - 56 && size > 36) {
        size -= 4;
        ctx.font = `700 ${size}px 'Bebas Neue', sans-serif`;
    }
    ctx.fillText(project.title, 28, imgH + 48 + size * 0.95);

    // LED pixel grid, like the big wall
    ctx.fillStyle = 'rgba(13,13,15,.28)';
    for (let x = 0; x < W; x += 5) ctx.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 5) ctx.fillRect(0, y, W, 1);
}

function screenTexture(project, index) {
    const c = document.createElement('canvas');
    c.width = SCREEN_W;
    c.height = SCREEN_H;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    drawScreen(ctx, project, index, null);

    // On failure the numbered placeholder simply stays.
    loadImage(project.img).then(img => {
        if (!img) return;
        drawScreen(ctx, project, index, img);
        tex.needsUpdate = true;
    });
    return tex;
}

// ---------- 3D totems ----------

function buildTotems(scene, projects) {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: PALETTE.bg, roughness: 0.8 });
    const footMat = new THREE.MeshStandardMaterial({ color: PALETTE.border, roughness: 0.45, metalness: 0.3 });
    const geos = {
        foot: new THREE.BoxGeometry(0.9, 0.08, 0.6),
        post: new THREE.BoxGeometry(0.12, 0.5, 0.12),
        frame: new THREE.BoxGeometry(1.7, 2.4, 0.18),
        screen: new THREE.PlaneGeometry(1.5, 1.6),
        strip: new THREE.BoxGeometry(1.5, 0.03, 0.03),
        halo: new THREE.RingGeometry(0.85, 1.0, 48),
    };

    const totems = totemPositions(projects.length).map((place, i) => {
        const g = new THREE.Group();
        const add = (geo, m, x, y, z) => {
            const mesh = new THREE.Mesh(geo, m);
            mesh.position.set(x, y, z);
            g.add(mesh);
            return mesh;
        };
        add(geos.foot, footMat, 0, 0.04, 0);
        add(geos.post, footMat, 0, 0.33, 0);
        const frame = add(geos.frame, frameMat, 0, 1.7, 0);

        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x000000, emissive: 0xffffff, emissiveMap: screenTexture(projects[i], i), emissiveIntensity: 0.85,
        });
        const screen = add(geos.screen, screenMat, 0, 1.85, 0.1);

        const stripMat = new THREE.MeshStandardMaterial({ color: PALETTE.purple, emissive: PALETTE.purple, emissiveIntensity: 1.2 });
        add(geos.strip, stripMat, 0, 0.78, 0.1);

        // Floor halo: lights up on hover / selection.
        const haloMat = new THREE.MeshBasicMaterial({ color: PALETTE.purple, transparent: true, opacity: 0, depthWrite: false });
        const halo = add(geos.halo, haloMat, 0, 0.02, 0.45);
        halo.rotation.x = -Math.PI / 2;

        g.position.set(place.x, 0, place.z);
        g.rotation.y = place.rotY;
        g.scale.setScalar(TOTEM_SCALE);
        group.add(g);

        screen.userData.totem = i;
        frame.userData.totem = i;
        return { place, group: g, screen, frame, screenMat, stripMat, haloMat, glow: 0 };
    });

    scene.add(group);

    return {
        totems,
        pickables: totems.flatMap(t => [t.screen, t.frame]),
        dispose() {
            totems.forEach(t => {
                t.screenMat.emissiveMap?.dispose();
                t.screenMat.dispose();
                t.stripMat.dispose();
                t.haloMat.dispose();
            });
            frameMat.dispose();
            footMat.dispose();
            Object.values(geos).forEach(geo => geo.dispose());
            scene.remove(group);
        },
    };
}


// ---------- HTML: setlist + detail panel ----------

function linksHtml(p) {
    const links = [
        p.githubUrl ? `<a class="xp-link" href="${esc(p.githubUrl)}" target="_blank" rel="noopener noreferrer">${GITHUB_ICON}<span>GitHub</span></a>` : '',
        p.demoUrl ? `<a class="xp-link" href="${esc(p.demoUrl)}" target="_blank" rel="noopener noreferrer">${DEMO_ICON}<span>Démo</span></a>` : '',
    ].filter(Boolean);
    return links.length ? `<div class="xp-links">${links.join('')}</div>` : '';
}

function panelHtml(p, i, n) {
    const track = `TRACK ${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    return `
      <div class="xp-panel-head">
        <span class="xp-panel-track">${track}</span>
        <button type="button" class="xp-icon-btn" data-xp-close aria-label="Fermer le projet">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="xp-panel-scroll">
        ${p.img ? `<div class="xp-panel-img"><img src="${esc(p.img)}" alt="Aperçu du projet ${esc(p.title)}"></div>` : ''}
        <h2 class="xp-panel-title" id="xpPanelTitle" tabindex="-1">${esc(p.title)}</h2>
        ${p.desc ? `<p class="xp-panel-desc">${esc(p.desc)}</p>` : ''}
        ${(p.tags || []).length ? `<ul class="xp-tags" aria-label="Technologies">${p.tags.map(t => `<li class="tag">${esc(t)}</li>`).join('')}</ul>` : ''}
        ${linksHtml(p)}
      </div>
      <div class="xp-panel-nav">
        <button type="button" class="xp-hud-btn" data-xp-step="-1" ${n < 2 ? 'disabled' : ''}>← PRÉCÉDENT</button>
        <button type="button" class="xp-hud-btn" data-xp-step="1" ${n < 2 ? 'disabled' : ''}>SUIVANT →</button>
      </div>
    `;
}

export function createProjectsZone({ scene, root, projects, error }) {
    const built = buildTotems(scene, projects);
    const { totems } = built;
    let hovered = -1;
    let active = -1;
    let handlers = { select() {}, close() {} };

    // Setlist: the fast way to every project, shown while in zone 1.
    const setlist = document.createElement('div'); // not <nav>: the classic page styles every nav
    setlist.className = 'xp-setlist';
    setlist.setAttribute('role', 'navigation');
    setlist.setAttribute('aria-label', 'Setlist des projets');
    setlist.hidden = true;
    if (projects.length) {
        setlist.innerHTML = `
          <div class="xp-setlist-head"><span class="live-dot"></span> SETLIST · ${projects.length} PROJETS</div>
          <ol>${projects.map((p, i) => `
            <li><button type="button" data-xp-project="${i}">
              <span class="xp-setlist-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="xp-setlist-name">${esc(p.title)}</span>
            </button></li>`).join('')}
          </ol>`;
    } else {
        // Same wording as the classic page in the same situations.
        setlist.innerHTML = `<div class="xp-setlist-head">${error
            ? 'Les projets sont momentanément indisponibles.'
            : 'Rien à afficher pour le moment.'}</div>`;
    }
    root.appendChild(setlist);
    setlist.addEventListener('click', e => {
        const b = e.target.closest('[data-xp-project]');
        if (b) handlers.select(Number(b.dataset.xpProject), b);
    });

    const panel = document.createElement('div'); // not <section>: styled by the classic page
    panel.className = 'xp-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'xpPanelTitle');
    panel.hidden = true;
    root.appendChild(panel);
    panel.addEventListener('click', e => {
        if (e.target.closest('[data-xp-close]')) handlers.close();
        const step = e.target.closest('[data-xp-step]');
        if (step) handlers.select((active + Number(step.dataset.xpStep) + projects.length) % projects.length);
    });

    function markSetlist() {
        setlist.querySelectorAll('[data-xp-project]').forEach(b => {
            if (Number(b.dataset.xpProject) === active) b.setAttribute('aria-current', 'true');
            else b.removeAttribute('aria-current');
        });
    }

    return {
        count: projects.length,
        pickables: built.pickables,
        place: i => totems[i].place,
        on(h) { handlers = { ...handlers, ...h }; },

        setHover(i) { hovered = i; },
        showSetlist(show) { setlist.hidden = !show; },

        open(i) {
            active = i;
            panel.innerHTML = panelHtml(projects[i], i, projects.length);
            panel.hidden = false;
            // Restart the entrance transition on every project change.
            panel.classList.remove('is-in');
            void panel.offsetWidth;
            panel.classList.add('is-in');
            markSetlist();
            panel.querySelector('#xpPanelTitle').focus({ preventScroll: true });
        },
        close() {
            active = -1;
            panel.hidden = true;
            panel.classList.remove('is-in');
            markSetlist();
        },
        get active() { return active; },
        get isOpen() { return !panel.hidden; },
        setlistButton: i => setlist.querySelector(`[data-xp-project="${i}"]`),

        update(t, dt) {
            totems.forEach((tt, i) => {
                const goal = i === active ? 1 : i === hovered ? 0.7 : 0;
                tt.glow += (goal - tt.glow) * Math.min(1, dt * 8);
                tt.screenMat.emissiveIntensity = 0.85 + 0.35 * tt.glow;
                tt.haloMat.opacity = 0.85 * tt.glow;
                tt.stripMat.emissiveIntensity = 1.2 + 1.6 * tt.glow + (t ? 0.25 * Math.sin(t * 2 + i) : 0);
            });
        },
        dispose() {
            built.dispose();
            setlist.remove();
            panel.remove();
        },
    };
}
