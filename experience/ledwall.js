// The big LED wall behind the DJ: a slideshow of the real projects
// (image, title, technologies from /api/projects), between "CODE & MUSIQUE"
// title cards. When a project is opened, the wall switches to it and holds;
// closing the panel resumes the rotation. Under prefers-reduced-motion the
// wall never changes on its own and swaps without a transition.

import * as THREE from 'three';
import { loadImage, drawCover } from './images.js';

const W = 1024;
const H = 410;
const HOLD = 5.5;   // s per slide
const WIPE = 0.9;   // s per transition
const pad2 = n => String(n).padStart(2, '0');

function grid(ctx) {
    ctx.fillStyle = 'rgba(13,13,15,.35)';
    for (let x = 0; x < W; x += 6) ctx.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 1);
}

function drawBrand(ctx) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#2b0b3d');
    g.addColorStop(0.5, '#6F0EAD');
    g.addColorStop(1, '#2b0b3d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.font = "700 120px 'Bebas Neue', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f0eefa';
    ctx.fillText('CODE & MUSIQUE', W / 2, H / 2);
}

function fit(ctx, text, maxW, size, family) {
    let s = size;
    ctx.font = `700 ${s}px ${family}`;
    while (ctx.measureText(text).width > maxW && s > 30) {
        s -= 4;
        ctx.font = `700 ${s}px ${family}`;
    }
    return s;
}

function drawProject(ctx, p, i, n, img) {
    ctx.fillStyle = '#0d0d0f';
    ctx.fillRect(0, 0, W, H);
    const imgX = W * 0.38;
    if (img) {
        drawCover(ctx, img, imgX, 0, W - imgX, H);
    } else {
        ctx.fillStyle = '#2b0b3d';
        ctx.fillRect(imgX, 0, W - imgX, H);
    }
    // Fade the image into the text side
    const fade = ctx.createLinearGradient(imgX, 0, imgX + 260, 0);
    fade.addColorStop(0, 'rgba(13,13,15,1)');
    fade.addColorStop(1, 'rgba(13,13,15,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(imgX, 0, 262, H);
    ctx.fillStyle = 'rgba(111,14,173,.25)';
    ctx.fillRect(0, 0, W, H);

    const x = 56;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ee0055';
    ctx.beginPath();
    ctx.arc(x + 7, 96, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0eefa';
    ctx.font = "400 22px 'IBM Plex Mono', monospace";
    ctx.fillText('NOW PLAYING', x + 26, 104);
    ctx.fillStyle = '#b06aff';
    ctx.fillText(`TRACK ${pad2(i + 1)} / ${pad2(n)}`, x, 146);

    ctx.fillStyle = '#f0eefa';
    const size = fit(ctx, p.title, imgX + 120 - x, 112, "'Bebas Neue', sans-serif");
    ctx.fillText(p.title, x, 146 + size);

    // Technologies: as many as fit on one line, then "+N".
    const all = p.tags || [];
    if (all.length) {
        ctx.fillStyle = 'rgba(240,238,250,.75)';
        ctx.font = "400 22px 'IBM Plex Mono', monospace";
        const maxW = imgX + 40 - x;
        let shown = all.length;
        const line = k => all.slice(0, k).join(' · ') + (k < all.length ? ` · +${all.length - k}` : '');
        while (shown > 1 && ctx.measureText(line(shown)).width > maxW) shown--;
        ctx.fillText(line(shown), x, 146 + size + 46);
    }
    ctx.fillStyle = '#A30DAD';
    ctx.fillRect(x, H - 60, 120, 5);
}

export function createLedWall(material, projects, { reducedMotion }) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    material.emissiveMap?.dispose();
    material.emissiveMap = tex;
    material.needsUpdate = true;

    // Slides: title card, then each project, title card again…
    const slides = [{ kind: 'brand' }, ...projects.map((p, i) => ({ kind: 'project', p, i, img: null }))];
    const buffers = [0, 1].map(() => {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        return c;
    });

    function render(slide, target) {
        const c = target.getContext('2d');
        if (slide.kind === 'brand') drawBrand(c);
        else drawProject(c, slide.p, slide.i, projects.length, slide.img);
        grid(c);
    }

    let current = 0;   // index in slides
    let next = -1;
    let wipe = 0;
    let clock = 0;
    let held = false;  // a project is open: no rotation
    let disposed = false;

    render(slides[0], buffers[0]);
    ctx.drawImage(buffers[0], 0, 0);
    tex.needsUpdate = true;

    // Images arrive later; repaint the slide on screen if it is the one.
    slides.forEach((s, k) => {
        if (s.kind !== 'project') return;
        loadImage(s.p.img).then(img => {
            if (disposed || !img) return;
            s.img = img;
            if (k === current && next < 0) {
                render(s, buffers[0]);
                ctx.drawImage(buffers[0], 0, 0);
                tex.needsUpdate = true;
            }
        });
    });

    function goTo(k) {
        if (k === current && next < 0) return;
        if (reducedMotion.matches) {
            current = k;
            next = -1;
            render(slides[k], buffers[0]);
            ctx.drawImage(buffers[0], 0, 0);
            tex.needsUpdate = true;
            return;
        }
        if (next >= 0) {
            // Interrupting a wipe: what is on screen becomes the start frame.
            buffers[0].getContext('2d').drawImage(canvas, 0, 0);
        } else {
            render(slides[current], buffers[0]);
        }
        next = k;
        wipe = 0;
        render(slides[k], buffers[1]);
    }

    return {
        showProject(i) {
            held = true;
            goTo(i + 1);
        },
        resume() {
            held = false;
            clock = 0;
        },
        update(dt) {
            if (next >= 0) {
                wipe = Math.min(1, wipe + dt / WIPE);
                const e = 1 - Math.pow(1 - wipe, 3);
                const edge = Math.round(W * e);
                ctx.drawImage(buffers[0], 0, 0);
                ctx.drawImage(buffers[1], 0, 0, edge, H, 0, 0, edge, H);
                ctx.fillStyle = '#b06aff';
                ctx.fillRect(edge - 4, 0, 4, H);
                tex.needsUpdate = true;
                if (wipe >= 1) {
                    current = next;
                    next = -1;
                    ctx.drawImage(buffers[1], 0, 0);
                    [buffers[0], buffers[1]] = [buffers[1], buffers[0]];
                }
                return;
            }
            if (held || reducedMotion.matches || slides.length < 2) return;
            clock += dt;
            if (clock >= HOLD) {
                clock = 0;
                goTo((current + 1) % slides.length);
            }
        },
        dispose() {
            disposed = true;
            tex.dispose();
        },
    };
}
