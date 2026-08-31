// Custom cursor (fine pointers only — touch devices keep the native cursor)
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursorRing');
    const eq = document.getElementById('cursorEq');
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;

    // Initialize cursor position
    cursor.style.left = mx + 'px';
    cursor.style.top = my + 'px';
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    eq.style.left = rx + 'px';
    eq.style.top = ry + 'px';

    document.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
        cursor.style.left = mx + 'px';
        cursor.style.top = my + 'px';
    });

    function animateRing() {
        rx += (mx - rx) * .12;
        ry += (my - ry) * .12;
        ring.style.left = rx + 'px';
        ring.style.top = ry + 'px';
        eq.style.left = rx + 'px';
        eq.style.top = ry + 'px';
        requestAnimationFrame(animateRing);
    }
    animateRing();

    // Swap the ring for a pulsing equalizer over clickable elements
    const HOVER_SELECTOR = 'a, button, .tag, input, textarea';
    document.addEventListener('mouseover', e => {
        if (e.target.closest(HOVER_SELECTOR)) {
            document.body.classList.add('cursor-hover');
        }
    });
    document.addEventListener('mouseout', e => {
        if (e.target.closest(HOVER_SELECTOR) && !e.relatedTarget?.closest(HOVER_SELECTOR)) {
            document.body.classList.remove('cursor-hover');
        }
    });
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

// Carousel
let cur = 0;
let slides = [];
const inner = document.getElementById('carouselInner');

function slide(dir) {
    if (!slides.length) return;
    cur = (cur + dir + slides.length) % slides.length;
    inner.style.transform = `translateX(-${cur * 100}%)`;
}

// GitHub mark, inlined like every other icon on the site (no icon library here).
const GITHUB_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.55v-2.1c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.97.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.21.67.8.55A11.5 11.5 0 0 0 12 .5z"/></svg>`;

// Demo icon: external link, drawn with the same stroke style as the other icons.
const DEMO_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

// Both URLs come straight from the admin panel (project.githubUrl / demoUrl).
// A project with an empty field simply gets no button - and a project with
// neither gets no link row at all, so the card keeps its spacing.
function renderProjectLinks(p) {
    const links = [
        p.githubUrl ? `<a class="slide-link" href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener noreferrer">${GITHUB_ICON}<span>GitHub</span></a>` : '',
        p.demoUrl ? `<a class="slide-link" href="${escapeHtml(p.demoUrl)}" target="_blank" rel="noopener noreferrer">${DEMO_ICON}<span>Démo</span></a>` : '',
    ].filter(Boolean);

    return links.length ? `<div class="slide-links">${links.join('')}</div>` : '';
}

function renderCarousel(projects) {
    inner.innerHTML = projects.map(p => `
    <div class="slide">
      <div class="slide-img">
        <img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.title)} mockup">
      </div>
      <div class="slide-title">${escapeHtml(p.title)}</div>
      <div class="slide-desc">${escapeHtml(p.desc)}</div>
      <div class="slide-tags">
        ${(p.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
      </div>
      ${renderProjectLinks(p)}
    </div>
  `).join('');
    slides = document.querySelectorAll('.slide');
    cur = 0;
    inner.style.transform = 'translateX(0%)';
}

// Barcode generation
const bc = document.getElementById('barcode');
function renderBarcode() {
    bc.innerHTML = '';
    const barWidth = 4; // approx average bar width (1-3px) + 2px gap
    const count = bc.clientWidth > 0 ? Math.max(1, Math.floor(bc.clientWidth / barWidth)) : 52;
    for (let i = 0; i < count; i++) {
        const bar = document.createElement('div');
        bar.className = 'barcode-bar';
        const w = [1, 2, 3][Math.floor(Math.random() * 3)];
        bar.style.width = w + 'px';
        bar.style.opacity = (Math.random() * .4 + .6).toString();
        bc.appendChild(bar);
    }
}
renderBarcode();

// Equalizer bars
const eqBars = document.getElementById('eqBars');
const eqPanel = document.querySelector('.eq-panel');

function renderSkills(skills) {
    eqBars.innerHTML = skills.map(s => `
    <div class="eq-bar-row">
      <div class="eq-skill-name">${escapeHtml(s.name)}</div>
      <div class="eq-track">
        <div class="eq-fill" data-pct="${s.pct}" style="width:0%"></div>
        <div class="eq-segments">${Array(20).fill('<div class="eq-seg"></div>').join('')}</div>
      </div>
      <div class="eq-db">${s.pct} dB</div>
    </div>
  `).join('');

    // If the panel was already revealed (observer already fired/disconnected)
    // before this (re-)render, animate the new bars in immediately.
    if (eqPanel.classList.contains('visible')) {
        document.querySelectorAll('.eq-fill').forEach(f => {
            f.style.width = f.dataset.pct + '%';
        });
    }
}

// The API (backed by the admin panel) is the single source of truth for both
// lists. Nothing is duplicated here: a hardcoded copy would silently drift
// away from whatever the panel last saved.
function showStatus(container, message, isError) {
    container.innerHTML = `<div class="data-status${isError ? ' is-error' : ''}">${escapeHtml(message)}</div>`;
}

function loadSection({ url, container, render, loadingText, errorText }) {
    showStatus(container, loadingText, false);
    return fetch(url)
        .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                showStatus(container, 'Rien à afficher pour le moment.', false);
                return;
            }
            render(data);
        })
        .catch(err => {
            console.error(`Chargement de ${url} impossible :`, err);
            showStatus(container, errorText, true);
        });
}

loadSection({
    url: '/api/projects',
    container: inner,
    render: renderCarousel,
    loadingText: 'Chargement des projets…',
    errorText: 'Les projets sont momentanément indisponibles.',
});

loadSection({
    url: '/api/skills',
    container: eqBars,
    render: renderSkills,
    loadingText: 'Chargement des compétences…',
    errorText: 'Les compétences sont momentanément indisponibles.',
});

// Reveal on scroll
const reveals = document.querySelectorAll('.reveal');
const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('visible');
            // Animate EQ bars when visible
            if (e.target.classList.contains('eq-panel') || e.target.closest('.eq-panel')) {
                document.querySelectorAll('.eq-fill').forEach(f => {
                    f.style.width = f.dataset.pct + '%';
                });
            }
        }
    });
}, { threshold: .15 });

reveals.forEach(r => obs.observe(r));

// Animate EQ when section enters view
const eqObs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
        document.querySelectorAll('.eq-fill').forEach(f => {
            setTimeout(() => { f.style.width = f.dataset.pct + '%'; }, 200);
        });
        eqObs.disconnect();
    }
}, { threshold: .2 });

eqObs.observe(eqPanel);

// Auto-slide carousel
setInterval(() => slide(1), 4000);
