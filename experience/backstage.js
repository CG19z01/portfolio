// Zone 4 — the backstage. The booking desk carries a laptop and a
// "BOOKING" light box; clicking either (or arriving at the zone) opens the
// booking panel: the same Formspree form as the classic page (same fields,
// labels and endpoint), plus GitHub and the CV. No e-mail address and no
// phone number are shown anywhere (decision of 2026-11-07).
//
// The classic form posts and leaves the page; here it is sent with fetch
// (Formspree's JSON mode) so the visitor stays in the hall.

import * as THREE from 'three';
import { PALETTE, BOOKING_DESK } from './layout.js';

const FORM_ACTION = 'https://formspree.io/f/xbdbggav';
// Same addresses as the classic page (nav menu and VIP pass); also used by
// the console panel.
export const GITHUB_URL = 'https://github.com/CG19z01';
export const CV_URL = 'cv-charles-gillet.pdf';

export const GITHUB_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><use href="#icon-github"/></svg>';
export const CV_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';
const SEND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

function signTexture() {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0d0d0f';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#A30DAD';
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, c.width - 28, c.height - 28);
    ctx.fillStyle = '#f0eefa';
    ctx.font = "700 150px 'Bebas Neue', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BOOKING', c.width / 2, c.height / 2 + 8);
    ctx.fillStyle = '#ee0055';
    ctx.beginPath();
    ctx.arc(110, c.height / 2, 16, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function panelHtml() {
    return `
      <div class="xp-panel-head">
        <span class="xp-panel-track">BOOKING · COULISSES</span>
        <button type="button" class="xp-icon-btn" data-xp-close aria-label="Fermer le booking">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="xp-panel-scroll">
        <h2 class="xp-panel-title" id="xpBookingTitle" tabindex="-1">Booker une date</h2>
        <p class="xp-panel-desc">Prêt pour une nouvelle collaboration ? Laissez-moi un message.</p>
        <form class="xp-form" action="${FORM_ACTION}" method="POST" novalidate>
          <div class="form-group">
            <label class="form-label" for="xpNom">NOM / NOM DE SCÈNE</label>
            <input type="text" class="form-input" id="xpNom" name="nom" placeholder="Daft Punk" autocomplete="name" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="xpEmail">EMAIL</label>
            <input type="email" class="form-input" id="xpEmail" name="email" placeholder="contact@studio.com" autocomplete="email" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="xpProjet">LE PROJET (TRACKLIST)</label>
            <textarea class="form-textarea" id="xpProjet" name="projet" placeholder="Parlez-moi de votre prochain hit web..." required></textarea>
          </div>
          <button type="submit" class="btn-submit">ENVOYER LA DÉMO ${SEND_ICON}</button>
          <p class="xp-form-status" role="status" aria-live="polite"></p>
        </form>
        <h3 class="xp-sub">Aussi en coulisses</h3>
        <div class="xp-links">
          <a class="xp-link" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">${GITHUB_ICON}<span>Mon GitHub</span></a>
          <a class="xp-link" href="${CV_URL}" target="_blank" rel="noopener noreferrer">${CV_ICON}<span>Mon CV</span></a>
        </div>
      </div>`;
}

export function createBackstage({ scene, root, onClose }) {
    const D = BOOKING_DESK;
    const group = new THREE.Group();
    const geos = [];
    const mats = [];
    const g = x => (geos.push(x), x);
    const m = x => (mats.push(x), x);

    // Laptop on the desk, screen towards the visitor (+z).
    const alu = m(new THREE.MeshStandardMaterial({ color: PALETTE.border, roughness: 0.4, metalness: 0.6 }));
    const screenMat = m(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: PALETTE.purpleDark, emissiveIntensity: 0.9 }));
    const laptop = new THREE.Group();
    laptop.position.set(D.x - 0.6, D.height, D.z + 0.05);
    laptop.rotation.y = Math.PI + 0.25; // screen faces the visitor, slightly turned
    const base = new THREE.Mesh(g(new THREE.BoxGeometry(0.5, 0.02, 0.34)), alu);
    base.position.y = 0.01;
    const lid = new THREE.Mesh(g(new THREE.BoxGeometry(0.5, 0.32, 0.015)), alu);
    lid.position.set(0, 0.17, 0.17);
    lid.rotation.x = -0.25;
    const screen = new THREE.Mesh(g(new THREE.PlaneGeometry(0.46, 0.28)), screenMat);
    screen.position.set(0, 0, -0.009);
    screen.rotation.y = Math.PI;
    lid.add(screen);
    laptop.add(base, lid);
    group.add(laptop);

    // A stack of CVs and a pass on the desk.
    const paper = m(new THREE.MeshStandardMaterial({ color: PALETTE.text, roughness: 0.9 }));
    const stack = new THREE.Mesh(g(new THREE.BoxGeometry(0.3, 0.04, 0.4)), paper);
    stack.position.set(D.x + 0.55, D.height + 0.02, D.z + 0.1);
    stack.rotation.y = -0.2;
    group.add(stack);
    const passMat = m(new THREE.MeshStandardMaterial({ color: PALETTE.purple, emissive: PALETTE.purple, emissiveIntensity: 0.6 }));
    const pass = new THREE.Mesh(g(new THREE.BoxGeometry(0.14, 0.006, 0.2)), passMat);
    pass.position.set(D.x + 0.05, D.height + 0.003, D.z + 0.3);
    pass.rotation.y = 0.4;
    group.add(pass);

    // "BOOKING" light box above the desk.
    const signTex = signTexture();
    const signMat = m(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 1.1 }));
    const frameMat = m(new THREE.MeshStandardMaterial({ color: PALETTE.bg, roughness: 0.6 }));
    const sign = new THREE.Mesh(g(new THREE.BoxGeometry(2.2, 0.55, 0.08)), [frameMat, frameMat, frameMat, frameMat, signMat, frameMat]);
    sign.position.set(D.x, 2.75, D.z - 0.7);
    group.add(sign);
    const cableMat = m(new THREE.MeshStandardMaterial({ color: PALETTE.bg }));
    [-0.9, 0.9].forEach(dx => {
        const cable = new THREE.Mesh(g(new THREE.CylinderGeometry(0.01, 0.01, 3)), cableMat);
        cable.position.set(D.x + dx, 4.5, D.z - 0.7);
        group.add(cable);
    });

    // Invisible box over the desk: the whole desk is one click target.
    const hit = new THREE.Mesh(g(new THREE.BoxGeometry(D.width + 0.2, D.height + 0.6, D.depth + 0.2)),
        m(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })));
    hit.position.set(D.x, (D.height + 0.6) / 2, D.z);
    group.add(hit);
    scene.add(group);

    // ---------- Panel ----------
    const panel = document.createElement('div'); // not <section>: styled by the classic page
    panel.className = 'xp-panel xp-booking';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'xpBookingTitle');
    panel.hidden = true;
    panel.innerHTML = panelHtml();
    root.appendChild(panel);

    const form = panel.querySelector('form');
    const status = panel.querySelector('.xp-form-status');
    const submit = form.querySelector('[type=submit]');
    let sending = false;

    function say(text, kind) {
        status.textContent = text;
        status.dataset.kind = kind || '';
    }

    panel.addEventListener('click', e => {
        if (e.target.closest('[data-xp-close]')) onClose();
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (sending) return;
        // Same requirements as the classic form, checked by the browser.
        const bad = [...form.elements].find(el => el.willValidate && !el.checkValidity());
        if (bad) {
            say(bad.type === 'email' && bad.value ? 'Adresse e-mail invalide.' : 'Merci de remplir tous les champs.', 'error');
            bad.focus();
            return;
        }
        sending = true;
        submit.setAttribute('aria-disabled', 'true'); // not `disabled`: that would drop the focus
        say('Envoi en cours…');
        try {
            const res = await fetch(FORM_ACTION, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            form.reset();
            say('Message envoyé. Merci !', 'ok');
        } catch (err) {
            console.error('Envoi du formulaire impossible :', err);
            say("L'envoi a échoué. Réessayez dans un instant, ou passez par la version classique.", 'error');
        } finally {
            sending = false;
            submit.removeAttribute('aria-disabled');
        }
    });

    let hover = 0, hoverGoal = 0;

    return {
        pickables: [hit],
        setHover(on) { hoverGoal = on ? 1 : 0; },
        open() {
            panel.hidden = false;
            panel.classList.remove('is-in');
            void panel.offsetWidth;
            panel.classList.add('is-in');
            panel.querySelector('#xpBookingTitle').focus({ preventScroll: true });
        },
        close() {
            panel.hidden = true;
            panel.classList.remove('is-in');
        },
        get isOpen() { return !panel.hidden; },
        update(t, dt) {
            hover += (hoverGoal - hover) * Math.min(1, dt * 8);
            signMat.emissiveIntensity = 1.1 + 0.8 * hover;
            screenMat.emissiveIntensity = 0.9 + 1.2 * hover + (t ? 0.1 * Math.sin(t * 1.5) : 0);
        },
        dispose() {
            signTex.dispose();
            geos.forEach(x => x.dispose());
            mats.forEach(x => x.dispose());
            scene.remove(group);
            panel.remove();
        },
    };
}
