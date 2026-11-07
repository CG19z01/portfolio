// First-visit tutorial: three short steps, each pointing at the part of the
// HUD it talks about. Shown once (remembered in localStorage, which may be
// unavailable: then it simply shows on every visit), and reopened at will
// with the "?" button. Non-modal: the hall stays usable behind it.

const KEY = 'xp-tuto-v1';

function steps(touch) {
    return [
        {
            title: 'Choisissez une zone',
            text: touch
                ? 'Les quatre zones sont en bas : projets, DJ, console et coulisses. La maison vous ramène au départ.'
                : 'Les quatre zones sont en bas : projets, DJ, console et coulisses. Raccourcis : touches 1 à 4, et 0 pour revenir au départ.',
            focus: '.xp-zonenav',
        },
        {
            title: touch ? 'Touchez ce qui vous intéresse' : 'Cliquez sur ce qui s\'allume',
            text: touch
                ? 'Écrans des projets, DJ, table de mixage, bureau de booking : touchez-les pour ouvrir leur fiche.'
                : 'Écrans des projets, DJ, table de mixage, bureau de booking : ils s\'allument au survol, un clic ouvre leur fiche. Échap la referme.',
            focus: null,
        },
        {
            title: 'Regardez autour de vous',
            text: touch
                ? 'Glissez le doigt pour tourner la tête. «\u00a0Classique\u00a0», en haut, ramène au site habituel à tout moment.'
                : 'Faites glisser la souris pour tourner la tête. «\u00a0Version classique\u00a0», en haut, ramène au site habituel à tout moment.',
            focus: '[data-xp-quit]',
        },
    ];
}

export function createTutorial({ root, touch }) {
    const STEPS = steps(touch);
    let step = 0;

    const card = document.createElement('div');
    card.className = 'xp-tuto';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-labelledby', 'xpTutoTitle');
    card.setAttribute('aria-describedby', 'xpTutoText');
    card.hidden = true;
    card.innerHTML = `
      <div class="xp-tuto-head">
        <span class="xp-tuto-step"></span>
        <span class="xp-tuto-dots" aria-hidden="true">${STEPS.map(() => '<i></i>').join('')}</span>
      </div>
      <h2 class="xp-tuto-title" id="xpTutoTitle"></h2>
      <p class="xp-tuto-text" id="xpTutoText"></p>
      <div class="xp-tuto-nav">
        <button type="button" class="xp-hud-btn" data-xp-tuto="skip">PASSER</button>
        <button type="button" class="btn-primary xp-tuto-next" data-xp-tuto="next"></button>
      </div>`;
    root.appendChild(card);

    // "?" button in the top bar, next to "Version classique".
    const help = document.createElement('button');
    help.type = 'button';
    help.className = 'xp-hud-btn xp-help';
    help.setAttribute('aria-label', 'Revoir le tutoriel');
    help.title = 'Revoir le tutoriel';
    help.textContent = '?';
    root.querySelector('.xp-hud-top [data-xp-quit]').before(help);

    function mark(sel) {
        root.querySelectorAll('.xp-tuto-focus').forEach(el => el.classList.remove('xp-tuto-focus'));
        if (sel) root.querySelector(sel)?.classList.add('xp-tuto-focus');
    }

    function show(i) {
        step = i;
        const s = STEPS[i];
        card.querySelector('.xp-tuto-step').textContent = `ÉTAPE ${i + 1} / ${STEPS.length}`;
        card.querySelector('.xp-tuto-title').textContent = s.title;
        card.querySelector('.xp-tuto-text').textContent = s.text;
        card.querySelector('.xp-tuto-next').textContent = i === STEPS.length - 1 ? "C'EST PARTI" : 'SUIVANT →';
        card.querySelectorAll('.xp-tuto-dots i').forEach((d, k) => d.classList.toggle('is-on', k === i));
        mark(s.focus);
    }

    function remember() {
        try { localStorage.setItem(KEY, '1'); } catch { /* private mode: fine */ }
    }

    const api = {
        get isOpen() { return !card.hidden; },
        seen() {
            try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
        },
        open() {
            show(0);
            root.classList.add('xp-has-tuto');
            card.hidden = false;
            card.querySelector('.xp-tuto-next').focus({ preventScroll: true });
        },
        // `focus: false` when something else takes the focus (a panel opening).
        close({ focus = true } = {}) {
            if (card.hidden) return;
            card.hidden = true;
            root.classList.remove('xp-has-tuto');
            mark(null);
            remember();
            if (focus) root.focus({ preventScroll: true });
        },
        dispose() {
            mark(null);
            card.remove();
            help.remove();
            root.classList.remove('xp-has-tuto');
        },
    };

    card.addEventListener('click', e => {
        const b = e.target.closest('[data-xp-tuto]');
        if (!b) return;
        if (b.dataset.xpTuto === 'skip' || step === STEPS.length - 1) api.close();
        else {
            show(step + 1);
            card.querySelector('.xp-tuto-next').focus({ preventScroll: true });
        }
    });
    help.addEventListener('click', () => api.open());

    return api;
}
