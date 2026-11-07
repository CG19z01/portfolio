// Landing overlay + entry point of the 3D experience.
//
// The classic page (index.html + main.js) stays fully rendered underneath:
// "Version classique" just removes the overlay, and it is also what visitors
// get when WebGL is unavailable. Three.js and the scene are only downloaded
// once someone actually chooses to enter.
//
// index.html carries an inline fallback for the "Version classique" button,
// so the overlay can always be dismissed even if this module fails to load.

import { isolate } from './isolate.js';

const html = document.documentElement;
const landing = document.getElementById('xpLanding');
const enterBtn = document.getElementById('xpEnter');
const enterLabel = enterBtn.querySelector('.xp-enter-label');
const classicBtn = document.getElementById('xpClassic');
const note = document.getElementById('xpLandingNote');

// Download the 3D code as soon as the visitor shows intent (pointer over
// "Entrer", finger down, key pressed on it) instead of on the click: by the
// time the click lands, most of it is already there. Not on focus: the
// landing focuses "Entrer" itself, so every visitor would pay for it.
// Visitors who stay on the classic page never trigger it. A failed load is
// forgotten so the click can try again.
let warm = null;
function warmUp() {
    warm ??= import('./main.js').catch(err => {
        warm = null;
        throw err;
    });
    return warm;
}
['pointerenter', 'touchstart', 'keydown'].forEach(type => {
    enterBtn.addEventListener(type, () => { warmUp().catch(() => {}); }, { once: true, passive: true });
});

function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return false;
        // Free this probe context at once — browsers cap live contexts.
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return true;
    } catch {
        return false;
    }
}

const webglOk = hasWebGL();

// ---------- Overlay open/close (modal: the page below is made inert) ----------

let restoreInert = null;

function openLanding(focusEl) {
    html.classList.add('xp-landing-on');
    restoreInert?.();
    restoreInert = isolate(landing);
    (focusEl || (webglOk ? enterBtn : classicBtn)).focus({ preventScroll: true });
}

function closeLanding() {
    html.classList.remove('xp-landing-on');
    restoreInert?.();
    restoreInert = null;
}

// Keep Tab inside the overlay; Escape = "Version classique".
landing.addEventListener('keydown', e => {
    if (!html.classList.contains('xp-landing-on')) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        classicBtn.click();
        return;
    }
    if (e.key !== 'Tab') return;
    const focusables = [enterBtn, classicBtn].filter(b => !b.disabled);
    const i = focusables.indexOf(document.activeElement);
    const next = e.shiftKey ? i - 1 : i + 1;
    e.preventDefault();
    focusables[(next + focusables.length) % focusables.length].focus();
});

// Equalizer bars along the bottom: heights are random each visit.
const eq = landing.querySelector('.xp-landing-eq');
const barCount = Math.min(64, Math.max(24, Math.round(window.innerWidth / 22)));
for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('i');
    bar.style.setProperty('--h', (0.25 + Math.random() * 0.75).toFixed(2));
    bar.style.animationDelay = `${(-Math.random() * 1.2).toFixed(2)}s`;
    eq.appendChild(bar);
}

if (!webglOk) {
    enterBtn.disabled = true;
    note.classList.add('is-error');
    note.textContent = "Votre navigateur ne permet pas d'afficher la salle en 3D. "
        + 'La version classique contient toutes les informations.';
}

// ---------- Entering the 3D ----------

let entering = false;

async function enter() {
    if (entering) return;
    if (!webglOk) {
        // From the nav menu there is no landing to explain why: show it.
        openLanding(classicBtn);
        return;
    }
    entering = true;
    enterBtn.disabled = true;
    enterLabel.textContent = 'CHARGEMENT…';

    // Where focus goes back when leaving the 3D. Both triggers (the landing
    // button, the item inside the closed nav menu) are hidden by then, so
    // the menu button that leads back to it is the natural spot.
    const returnFocus = document.getElementById('navBurger');

    try {
        const { startExperience } = await warmUp();
        closeLanding();
        await startExperience({
            onExit() {
                // Leaving the 3D always lands on the classic page.
                window.scrollTo(0, 0);
                returnFocus?.focus({ preventScroll: true });
            },
        });
    } catch (err) {
        console.error("Impossible de lancer l'expérience 3D :", err);
        note.classList.add('is-error');
        note.textContent = "L'expérience 3D n'a pas pu démarrer. La version classique reste disponible.";
        openLanding(classicBtn);
    } finally {
        entering = false;
        enterBtn.disabled = !webglOk;
        enterLabel.textContent = "ENTRER DANS L'EXPÉRIENCE";
    }
}

document.querySelectorAll('[data-xp-enter]').forEach(el => {
    el.addEventListener('click', e => {
        e.preventDefault();
        enter();
    });
});

classicBtn.addEventListener('click', () => {
    closeLanding();
    document.getElementById('hero')?.scrollIntoView();
    // The button just hid itself: hand focus to the first control of the page.
    document.getElementById('navBurger')?.focus({ preventScroll: true });
});

// Escape also works when a click on the backdrop moved focus to <body>.
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && html.classList.contains('xp-landing-on') && !landing.contains(e.target)) {
        e.preventDefault();
        classicBtn.click();
    }
});

if (html.classList.contains('xp-landing-on')) openLanding();
