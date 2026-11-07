// Zone 2 — the DJ's presentation panel, in three tabs.
//
// Content is copied word for word from cv-charles-gillet.pdf and from the
// "À propos" section of index.html. Phone and e-mail are deliberately left
// out (contact goes through the backstage), and so is the About paragraph
// ("Je vois le code comme une partition…", removed at the user's request,
// 2026-11-07; it stays on the classic page). If the CV or the About text
// changes, update this file too.

const PROFILE = {
    name: 'Charles Gillet',
    role: 'Dev. Full Stack',
    facts: ['Rouen', '26 ans', 'Véhiculé'],
    about: {
        headline: ["Coder n'est pas", 'juste taper.'],
        accent: "C'est composer.",
    },
    objective: "Souhaitant intervenir sur l'ensemble du cycle de développement d'applications web, alliant sens du détail, créativité côté front-end et robustesse côté back-end, pour créer des solutions performantes, évolutives pour l'utilisateur.",
    experiences: [
        { when: '2024 – 2025', title: 'Noyauteur', where: 'Manoir Industries',
          items: ['Réalisation de noyaux de fonderie', 'Préparation des matériaux', 'Contrôle qualité'] },
        { when: '2020 – 2024', title: 'CDI Employé polyvalent', where: 'Intermarché',
          items: ['Drive', 'Encaissement', 'Mise en rayon'] },
        { when: '2018', title: 'Stagiaire', where: 'CESI',
          items: ["Réalisation de mock'up", 'Maquette', 'Esthétisme'] },
    ],
    education: [
        { when: 'nov. 2025', title: 'Zone01', detail: 'Campus Saint Marc — Concepteur dev. full stack RNCP VI' },
        { when: 'sept. 2018 – mars 2020', title: "Fac d'histoire" },
        { when: 'sept. 2017 – juin 2018', title: 'Programmeur analyste' },
    ],
    languages: ['Anglais'],
    hobbies: ['Pixel art', 'Musique', 'Écrire', 'Tennis de table', 'Randonnée', 'Football'],
};

const TABS = [
    { id: 'parcours', deck: 'A', label: 'Parcours' },
    { id: 'formation', deck: 'B', label: 'Formation' },
    { id: 'perso', deck: 'C', label: 'Perso' },
];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function timeline(entries) {
    return `<ol class="xp-timeline">${entries.map(e => `
      <li>
        <span class="xp-tl-when">${esc(e.when)}</span>
        <span class="xp-tl-title">${esc(e.title)}${e.where ? ` <span class="xp-tl-where">· ${esc(e.where)}</span>` : ''}</span>
        ${e.detail ? `<span class="xp-tl-detail">${esc(e.detail)}</span>` : ''}
        ${e.items ? `<span class="xp-tl-detail">${e.items.map(esc).join(' · ')}</span>` : ''}
      </li>`).join('')}
    </ol>`;
}

function tabContent(id) {
    const P = PROFILE;
    if (id === 'parcours') {
        return `
          <p class="xp-about-head">${P.about.headline.map(esc).join('<br>')}<br><span>${esc(P.about.accent)}</span></p>
          <h3 class="xp-sub">Objectif</h3>
          <p class="xp-panel-desc">${esc(P.objective)}</p>
          <h3 class="xp-sub">Expériences</h3>
          ${timeline(P.experiences)}`;
    }
    if (id === 'formation') {
        return `
          <h3 class="xp-sub">Formation</h3>
          ${timeline(P.education)}
          <h3 class="xp-sub">Langues</h3>
          <ul class="xp-tags">${P.languages.map(l => `<li class="tag">${esc(l)}</li>`).join('')}</ul>`;
    }
    return `
      <h3 class="xp-sub">Hobbies</h3>
      <ul class="xp-tags">${P.hobbies.map(h => `<li class="tag">${esc(h)}</li>`).join('')}</ul>
      <h3 class="xp-sub">En bref</h3>
      <ul class="xp-tags">${P.facts.map(f => `<li class="tag">${esc(f)}</li>`).join('')}</ul>`;
}

export function createProfilePanel({ root, onContact, onClose }) {
    const panel = document.createElement('div'); // not <section>: styled by the classic page
    panel.className = 'xp-panel xp-profile';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'xpProfileTitle');
    panel.hidden = true;
    panel.innerHTML = `
      <div class="xp-panel-head">
        <span class="xp-panel-track">ARTISTE · DERRIÈRE LES PLATINES</span>
        <button type="button" class="xp-icon-btn" data-xp-close aria-label="Fermer la présentation">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="xp-profile-id">
        <h2 class="xp-panel-title" id="xpProfileTitle" tabindex="-1">${esc(PROFILE.name)}</h2>
        <span class="xp-profile-role">${esc(PROFILE.role)}</span>
      </div>
      <div class="xp-tabs" role="tablist" aria-label="Présentation">
        ${TABS.map((t, i) => `
        <button type="button" role="tab" id="xpTab-${t.id}" aria-controls="xpTabPanel"
          aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-xp-tab="${t.id}">
          <span class="xp-tab-deck">${t.deck}</span>${t.label}
        </button>`).join('')}
      </div>
      <div class="xp-panel-scroll" role="tabpanel" id="xpTabPanel" tabindex="0"></div>
      <div class="xp-panel-nav">
        <button type="button" class="btn-primary xp-contact" data-xp-contact>ME CONTACTER · COULISSES →</button>
      </div>
    `;
    root.appendChild(panel);

    const tabs = [...panel.querySelectorAll('[role="tab"]')];
    const body = panel.querySelector('[role="tabpanel"]');

    function select(id, focus = false) {
        tabs.forEach(t => {
            const on = t.dataset.xpTab === id;
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
            if (on && focus) t.focus();
        });
        body.setAttribute('aria-labelledby', `xpTab-${id}`);
        body.innerHTML = tabContent(id);
        body.scrollTop = 0;
    }
    select(TABS[0].id);

    panel.addEventListener('click', e => {
        const tab = e.target.closest('[data-xp-tab]');
        if (tab) select(tab.dataset.xpTab);
        if (e.target.closest('[data-xp-close]')) onClose();
        if (e.target.closest('[data-xp-contact]')) onContact();
    });
    // Standard tablist keys: arrows move between tabs, Home/End jump.
    panel.querySelector('.xp-tabs').addEventListener('keydown', e => {
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        e.stopPropagation();
        select(tabs[(to + tabs.length) % tabs.length].dataset.xpTab, true);
    });

    return {
        open() {
            panel.hidden = false;
            panel.classList.remove('is-in');
            void panel.offsetWidth;
            panel.classList.add('is-in');
            panel.querySelector('#xpProfileTitle').focus({ preventScroll: true });
        },
        close() {
            panel.hidden = true;
            panel.classList.remove('is-in');
        },
        get isOpen() { return !panel.hidden; },
        dispose() { panel.remove(); },
    };
}
