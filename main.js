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

// Carousel
let cur = 0;
const slides = document.querySelectorAll('.slide');
const inner = document.getElementById('carouselInner');

function slide(dir) {
    cur = (cur + dir + slides.length) % slides.length;
    inner.style.transform = `translateX(-${cur * 100}%)`;
}

// Barcode generation
const bc = document.getElementById('barcode');
for (let i = 0; i < 52; i++) {
    const bar = document.createElement('div');
    bar.className = 'barcode-bar';
    const w = [1, 2, 3][Math.floor(Math.random() * 3)];
    bar.style.width = w + 'px';
    bar.style.opacity = (Math.random() * .4 + .6).toString();
    bc.appendChild(bar);
}

// Equalizer bars
const skills = [
    { name: 'Golang', pct: 70 },
    { name: 'JavaScript', pct: 85 },
    { name: 'HTML / CSS', pct: 70 },
    { name: 'Rust', pct: 30 },
    { name: 'Docker', pct: 45 },
    { name: 'SQLite', pct: 40 },
];

const eqBars = document.getElementById('eqBars');
skills.forEach(s => {
    const row = document.createElement('div');
    row.className = 'eq-bar-row';
    row.innerHTML = `
    <div class="eq-skill-name">${s.name}</div>
    <div class="eq-track">
      <div class="eq-fill" data-pct="${s.pct}" style="width:0%"></div>
      <div class="eq-segments">${Array(20).fill('<div class="eq-seg"></div>').join('')}</div>
    </div>
    <div class="eq-db">${s.pct} dB</div>
  `;
    eqBars.appendChild(row);
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
const eqPanel = document.querySelector('.eq-panel');
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