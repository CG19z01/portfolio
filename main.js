// Custom cursor
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;

// Initialize cursor position
cursor.style.left = mx + 'px';
cursor.style.top = my + 'px';
ring.style.left = rx + 'px';
ring.style.top = ry + 'px';

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
    requestAnimationFrame(animateRing);
}
animateRing();

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

// Seed data: matches api/_lib/seed.js. Used for the first paint (no network
// round-trip needed) and as a fallback if the API fetch fails.
const seedProjects = [
    {
        id: 'forum', title: 'Forum', desc: "Réalisation d'un forum",
        img: 'maquette_forum.png', tags: ['SQLite', 'HTML/CSS', 'JS'],
        githubUrl: '', demoUrl: '',
    },
    {
        id: 'profily', title: 'Profily', desc: 'Une IA pour trouver la meilleure entreprise',
        img: 'maquette_profily.png', tags: ['React', 'Web Audio API', 'TypeScript'],
        githubUrl: '', demoUrl: '',
    },
    {
        id: 'track-mixer', title: 'TRACK MIXER',
        desc: 'Application de mixage audio en temps réel avec Python & Flask.',
        img: 'travail_en_cours.png', tags: ['Python', 'Flask', 'WebSockets'],
        githubUrl: '', demoUrl: '',
    },
];

const seedSkills = [
    { id: 'golang', name: 'Golang', pct: 70 },
    { id: 'javascript', name: 'JavaScript', pct: 85 },
    { id: 'html-css', name: 'HTML / CSS', pct: 70 },
    { id: 'rust', name: 'Rust', pct: 30 },
    { id: 'docker', name: 'Docker', pct: 45 },
    { id: 'sqlite', name: 'SQLite', pct: 40 },
];

// Carousel
let cur = 0;
let slides = [];
const inner = document.getElementById('carouselInner');

function slide(dir) {
    if (!slides.length) return;
    cur = (cur + dir + slides.length) % slides.length;
    inner.style.transform = `translateX(-${cur * 100}%)`;
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
        ${p.githubUrl ? `<a class="tag" href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener">GitHub</a>` : ''}
        ${p.demoUrl ? `<a class="tag" href="${escapeHtml(p.demoUrl)}" target="_blank" rel="noopener">Démo</a>` : ''}
      </div>
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

// First paint: render synchronously with seed data, identical to the
// previous hardcoded markup, with zero dependency on the network.
renderCarousel(seedProjects);
renderSkills(seedSkills);

// Then fetch live data in the background and re-render if it succeeds.
fetch('/api/projects')
    .then(res => (res.ok ? res.json() : Promise.reject()))
    .then(renderCarousel)
    .catch(() => {});

fetch('/api/skills')
    .then(res => (res.ok ? res.json() : Promise.reject()))
    .then(renderSkills)
    .catch(() => {});

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
