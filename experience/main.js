// 3D experience bootstrap: renderer, overlay shell, render loop, teardown.
// Loaded on demand by landing.js (dynamic import) — never on a plain visit.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld } from './world.js';
import { isolate } from './isolate.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

async function fetchProjectCount() {
    // Same endpoint as the classic page: the admin panel stays the only source.
    try {
        const res = await fetch('/api/projects');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data.length : 0;
    } catch (err) {
        console.error('Projets indisponibles pour la salle 3D :', err);
        return 0;
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
        <button type="button" class="xp-hud-btn" data-xp-quit>VERSION CLASSIQUE</button>
      </div>
      <div class="xp-hud-hint">MAQUETTE DE LA SALLE · GLISSER POUR TOURNER · MOLETTE / PINCER POUR ZOOMER</div>
      <div class="xp-loader"><div class="xp-loader-bar"><i></i></div>OUVERTURE DES PORTES…</div>
    `;
    root.querySelector('[data-xp-quit]').addEventListener('click', onQuit);
    return root;
}

let active = null;

export async function startExperience({ onExit } = {}) {
    if (active) return active;

    const html = document.documentElement;

    // Everything created so far, so teardown works at any point — including
    // halfway through a failed start, or a click on "Version classique"
    // while the scene is still loading.
    const state = { renderer: null, controls: null, world: null, onResize: null, closed: false };
    let root = null;
    let restoreInert = () => {};

    function teardown() {
        if (state.closed) return;
        state.closed = true;
        state.renderer?.setAnimationLoop(null);
        if (state.onResize) window.removeEventListener('resize', state.onResize);
        state.controls?.dispose();
        state.world?.dispose();
        if (state.renderer) {
            state.renderer.dispose();
            // Release the GL context right away: browsers cap live contexts,
            // and entering/leaving repeatedly would otherwise hit that cap.
            state.renderer.forceContextLoss();
        }
        restoreInert();
        root?.remove();
        html.classList.remove('xp-on');
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

    try {
        const coarse = window.matchMedia('(pointer: coarse)').matches;
        const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' });
        state.renderer = renderer;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        root.prepend(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 120);
        camera.position.set(20, 19, 26);

        // Temporary overview camera so the layout can be reviewed. Segment 2
        // replaces it with the third-person follow camera.
        const controls = new OrbitControls(camera, renderer.domElement);
        state.controls = controls;
        controls.target.set(0, 1, -3);
        controls.enableDamping = !reducedMotion.matches;
        controls.maxPolarAngle = Math.PI * 0.47;
        controls.minDistance = 5;
        controls.maxDistance = 55;
        controls.update();

        // Canvas text uses the page fonts; make sure they are ready first.
        await document.fonts?.ready;
        const projectCount = await fetchProjectCount();
        if (state.closed) return null; // the visitor left while it was loading
        const world = buildWorld(scene, { projectCount });
        state.world = world;

        state.onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', state.onResize);

        const timer = new THREE.Timer();
        renderer.setAnimationLoop(() => {
            timer.update();
            const t = reducedMotion.matches ? 0 : timer.getElapsed();
            world.update(t);
            controls.update();
            renderer.render(scene, camera);
        });

        // Test hook for automated screenshots only (?xpdebug in the URL).
        if (new URLSearchParams(location.search).has('xpdebug')) window.__xp = { camera, controls };

        requestAnimationFrame(() => root.querySelector('.xp-loader').classList.add('is-done'));
        return active;
    } catch (err) {
        // Leave nothing behind: the caller shows the landing again.
        teardown();
        throw err;
    }
}
