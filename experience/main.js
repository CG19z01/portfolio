// 3D experience bootstrap: renderer, overlay shell, render loop, teardown.
// Loaded on demand by landing.js (dynamic import) — never on a plain visit.

import * as THREE from 'three';
import { buildWorld } from './world.js';
import { isolate } from './isolate.js';
import { createGuide } from './guide.js';
import { createProjectsZone } from './projects.js';
import { ZONES, START_VIEW, totemView } from './layout.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

async function fetchProjects() {
    // Same endpoint as the classic page: the admin panel stays the only source.
    try {
        const res = await fetch('/api/projects');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return { projects: Array.isArray(data) ? data : [], error: false };
    } catch (err) {
        console.error('Projets indisponibles pour la salle 3D :', err);
        return { projects: [], error: true };
    }
}

function buildShell(onQuit) {
    const root = document.createElement('div');
    root.className = 'xp-root';
    root.tabIndex = -1;
    root.setAttribute('role', 'application');
    root.setAttribute('aria-label', 'Salle de concert en 3D');
    root.innerHTML = `
      <div class="xp-hud-top">
        <div class="xp-hud-logo">&gt;_ <span>CHARLES_DEV_RECORDS</span></div>
        <button type="button" class="xp-hud-btn" data-xp-quit><span class="xp-hide-sm">VERSION&nbsp;</span>CLASSIQUE</button>
      </div>
      <div class="xp-zone-card" aria-live="polite"></div>
      <div class="xp-zonenav" role="navigation" aria-label="Zones de la salle">
        <button type="button" class="xp-zonenav-home" data-xp-zone="start" aria-label="Revenir au point de départ" title="Départ (0)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7M6 9.5V20h12V9.5"/></svg>
        </button>
        ${ZONES.map(z => `
        <button type="button" data-xp-zone="${z.id}" title="${z.name} (${Number(z.num)})">
          <span class="xp-zonenav-num">${z.num}</span><span class="xp-zonenav-name">${z.name}</span>
        </button>`).join('')}
      </div>
      <div class="xp-hud-hint" aria-hidden="true"></div>
      <div class="xp-loader"><div class="xp-loader-bar"><i></i></div>OUVERTURE DES PORTES…</div>
    `;
    root.querySelector('[data-xp-quit]').addEventListener('click', onQuit);
    return root;
}

const ZONE_NOTES = {
    start: 'Choisissez une zone en bas de l\'écran, ou cliquez sur un écran de la scène.',
    projects: 'Cliquez sur un écran ou un titre de la setlist pour ouvrir un projet.',
    dj: 'Zone en préparation : la présentation arrive bientôt.',
    console: 'Zone en préparation : les compétences arrivent bientôt.',
    backstage: 'Zone en préparation : les contacts arrivent bientôt.',
};

let active = null;

export async function startExperience({ onExit } = {}) {
    if (active) return active;

    const html = document.documentElement;

    // Everything created so far, so teardown works at any point — including
    // halfway through a failed start, or a click on "Version classique"
    // while the scene is still loading.
    const state = { renderer: null, guide: null, world: null, zone: null, cleanups: [], closed: false };
    let root = null;
    let restoreInert = () => {};

    function teardown() {
        if (state.closed) return;
        state.closed = true;
        state.renderer?.setAnimationLoop(null);
        state.cleanups.forEach(fn => fn());
        state.guide?.dispose();
        state.zone?.dispose();
        state.world?.dispose();
        if (state.renderer) {
            state.renderer.dispose();
            // Release the GL context right away: browsers cap live contexts,
            // and entering/leaving repeatedly would otherwise hit that cap.
            state.renderer.forceContextLoss();
        }
        document.body.classList.remove('cursor-hover');
        restoreInert();
        root?.remove();
        html.classList.remove('xp-on');
        delete window.__xp;
        active = null;
    }

    function quit() {
        teardown();
        onExit?.();
    }

    root = buildShell(quit);
    document.body.appendChild(root);
    html.classList.add('xp-on');
    restoreInert = isolate(root);
    root.focus({ preventScroll: true });
    active = { quit };

    const listen = (target, type, fn, opts) => {
        target.addEventListener(type, fn, opts);
        state.cleanups.push(() => target.removeEventListener(type, fn, opts));
    };

    try {
        const coarse = window.matchMedia('(pointer: coarse)').matches;
        const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' });
        state.renderer = renderer;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        const canvas = renderer.domElement;
        canvas.setAttribute('aria-hidden', 'true'); // everything in it is reachable from the HUD
        root.prepend(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 120);
        // Portrait screens get a taller field of view, so each station still
        // shows roughly the same width of the room as on a desktop.
        const fitFov = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.fov = camera.aspect < 1 ? Math.min(78, 50 + (1 - camera.aspect) * 45) : 50;
            camera.updateProjectionMatrix();
        };
        fitFov();

        // A lost GL context (driver reset, too many tabs) cannot be recovered
        // in place: fall back to the classic page rather than a frozen canvas.
        listen(canvas, 'webglcontextlost', e => {
            e.preventDefault();
            console.error('Contexte WebGL perdu : retour à la version classique.');
            quit();
        });

        // Canvas text uses the page fonts. They are only fetched once something
        // uses them, so ask for the exact faces the canvases draw with.
        await Promise.all([
            "700 96px 'Bebas Neue'", "400 24px 'IBM Plex Mono'",
        ].map(f => document.fonts?.load(f).catch(() => null)));
        const { projects, error } = await fetchProjects();
        if (state.closed) return null; // the visitor left while it was loading
        state.world = buildWorld(scene);
        const zone1 = createProjectsZone({ scene, root, projects, error });
        state.zone = zone1;

        // ---------- Picking (hover + click on totems) ----------
        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        function pick(x, y) {
            const r = canvas.getBoundingClientRect();
            ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
            raycaster.setFromCamera(ndc, camera);
            const hit = raycaster.intersectObjects(zone1.pickables, false)[0];
            return hit ? hit.object.userData.totem : -1;
        }

        // ---------- Navigation ----------
        const card = root.querySelector('.xp-zone-card');
        const hint = root.querySelector('.xp-hud-hint');
        const navButtons = [...root.querySelectorAll('[data-xp-zone]')];
        let current = null;
        let returnFocus = null;

        const panelSide = () => (window.innerWidth < 760 ? 'bottom' : 'right');

        function setZone(id) {
            current = id;
            navButtons.forEach(b => {
                if (b.dataset.xpZone === id) b.setAttribute('aria-current', 'location');
                else b.removeAttribute('aria-current');
            });
            const z = ZONES.find(zz => zz.id === id);
            card.innerHTML = z
                ? `<span class="xp-zone-num">${z.num}</span><span class="xp-zone-name">${z.name}</span><span class="xp-zone-where">${z.where}</span>`
                : '<span class="xp-zone-name">BIENVENUE</span><span class="xp-zone-where">Dans la salle</span>';
            hint.textContent = ZONE_NOTES[id];
            zone1.showSetlist(id === 'projects');
        }

        function closeProject({ stay = false } = {}) {
            if (!zone1.isOpen) return;
            zone1.close();
            root.classList.remove('xp-has-panel');
            (returnFocus?.isConnected ? returnFocus : root).focus({ preventScroll: true });
            returnFocus = null;
            if (!stay) goZone('projects');
        }

        function goZone(id) {
            if (zone1.isOpen) closeProject({ stay: true });
            setZone(id);
            const view = id === 'start' ? START_VIEW : ZONES.find(z => z.id === id);
            state.guide.goTo(view);
        }

        function openProject(i, from) {
            if (i < 0 || i >= zone1.count) return;
            if (!zone1.isOpen) returnFocus = from || document.activeElement;
            setZone('projects');
            zone1.open(i);
            root.classList.add('xp-has-panel');
            state.guide.goTo(totemView(zone1.place(i), panelSide()));
        }

        zone1.on({
            select: (i, from) => openProject(i, from),
            close: () => closeProject(),
        });

        state.guide = createGuide(camera, canvas, {
            reducedMotion,
            onTap(x, y) {
                const i = pick(x, y);
                if (i >= 0) openProject(i, canvas);
            },
            onHover(x, y) {
                const i = x === null ? -1 : pick(x, y);
                zone1.setHover(i);
                canvas.classList.toggle('is-pointing', i >= 0);
                document.body.classList.toggle('cursor-hover', i >= 0);
            },
        });

        navButtons.forEach(b => listen(b, 'click', () => goZone(b.dataset.xpZone)));

        listen(root, 'keydown', e => {
            if (e.altKey || e.ctrlKey || e.metaKey) return;
            const inField = e.target.closest('input, textarea, select');
            if (e.key === 'Escape') {
                if (zone1.isOpen) {
                    e.preventDefault();
                    closeProject();
                }
                return;
            }
            if (inField) return;
            if (zone1.isOpen && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
                e.preventDefault();
                const n = zone1.count;
                openProject((zone1.active + (e.key === 'ArrowRight' ? 1 : -1) + n) % n);
                return;
            }
            if (e.key === '0') goZone('start');
            const z = ZONES[Number(e.key) - 1];
            if (z && /^[1-9]$/.test(e.key)) goZone(z.id);
        });

        listen(window, 'resize', () => {
            fitFov();
            renderer.setSize(window.innerWidth, window.innerHeight);
            // Re-frame an open project for the new panel placement.
            if (zone1.isOpen) state.guide.goTo(totemView(zone1.place(zone1.active), panelSide()));
        });

        // Arrival: from high above the crowd down to the entrance.
        state.guide.goTo({ pos: [0, 8.5, 19], target: [0, 1.5, -6] }, { instant: true });
        setZone('start');
        state.guide.goTo(START_VIEW);

        const timer = new THREE.Timer();
        renderer.setAnimationLoop(() => {
            timer.update();
            const dt = Math.min(timer.getDelta(), 0.1);
            const t = reducedMotion.matches ? 0 : timer.getElapsed();
            state.guide.update(dt);
            state.world.update(t);
            zone1.update(t, dt);
            renderer.render(scene, camera);
        });

        // Test hook for automated screenshots only (?xpdebug in the URL).
        if (new URLSearchParams(location.search).has('xpdebug')) {
            window.__xp = { goZone, openProject, closeProject, get travelling() { return state.guide.travelling; } };
        }

        requestAnimationFrame(() => root.querySelector('.xp-loader').classList.add('is-done'));
        return active;
    } catch (err) {
        // Leave nothing behind: the caller shows the landing again.
        teardown();
        throw err;
    }
}
