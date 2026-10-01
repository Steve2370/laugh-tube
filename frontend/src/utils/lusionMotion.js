import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// Scroll fluide (façon lusion.co) + cartes 3D (façon lusion.co/about) pilotés par
// une seule boucle requestAnimationFrame : on lit toutes les positions, puis on
// écrit tous les transforms, sans passer par le state React.

const canAnimate = typeof window !== 'undefined'
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FLIP_MS = 1100;
const STAGGER_MS = 90;
const REST = 'perspective(1000px) translate3d(0,120px,0) rotateY(-180deg)';

let lenis = null;
let started = false;
let velocity = 0;
let observer = null;
const cards = new Set();
const byWrap = new Map();

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const expoOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

function render(c, time, vw, vh) {
    const r = c.rect;
    const small = vw < 640;
    const nx = clamp((r.left + r.width / 2 - vw / 2) / (vw / 2), -1, 1);
    const ny = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2), -1.4, 1.4);

    c.hover += ((c.hovered ? 1 : 0) - c.hover) * 0.1;
    c.px += (c.tx - c.px) * 0.1;
    c.py += (c.ty - c.py) * 0.1;

    const p = c.revealAt === null ? 0 : expoOut(clamp((time - c.revealAt) / FLIP_MS, 0, 1));
    const rest = 1 - c.hover * 0.75;
    const fan = nx * (small ? 0 : 22);
    const drum = -ny * (small ? 6 : 12);
    const speed = clamp(-velocity * 0.3, -10, 10);

    const rx = (drum + speed) * rest - c.py * 20 * c.hover;
    const ry = fan * rest + c.px * 20 * c.hover - (1 - p) * 180;
    const y = (1 - p) * 120;
    const z = c.hover * 50;

    c.el.style.transform = `perspective(1000px) translate3d(0,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    c.el.style.setProperty('--glare', c.hover.toFixed(3));

    if (c.img) {
        c.img.style.transform = `translate3d(0,${(-ny * 6).toFixed(2)}%,0) scale(${(1.14 + c.hover * 0.08).toFixed(3)})`;
    }
}

function frame(time) {
    lenis?.raf(time);
    velocity += ((lenis ? lenis.velocity : 0) - velocity) * 0.1;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const active = [];
    const fresh = [];

    for (const c of cards) {
        if (!c.inView) continue;
        c.rect = c.wrap.getBoundingClientRect();
        active.push(c);
        if (c.revealAt === null && c.rect.top < vh * 0.92 && c.rect.bottom > 0) fresh.push(c);
    }

    fresh
        .sort((a, b) => (a.rect.top - b.rect.top) || (a.rect.left - b.rect.left))
        .forEach((c, i) => { c.revealAt = time + i * STAGGER_MS; });

    for (const c of active) render(c, time, vw, vh);
    requestAnimationFrame(frame);
}

function getObserver() {
    if (!observer) {
        observer = new IntersectionObserver((entries) => {
            for (const e of entries) {
                const c = byWrap.get(e.target);
                if (c) c.inView = e.isIntersecting;
            }
        }, { rootMargin: '20% 0px 20% 0px' });
    }
    return observer;
}

export function initMotion() {
    if (started || !canAnimate) return;
    started = true;
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, allowNestedScroll: true, autoRaf: false });
    requestAnimationFrame(frame);
}

const noop = () => {};
const NOOP_HANDLERS = { onPointerMove: noop, onPointerEnter: noop, onPointerLeave: noop };

export function trackCard(wrap, el, img) {
    if (!canAnimate || !wrap || !el) return { handlers: NOOP_HANDLERS, dispose: noop };

    const c = { wrap, el, img, rect: null, inView: false, revealAt: null, hovered: false, hover: 0, tx: 0, ty: 0, px: 0, py: 0 };
    el.style.transform = REST;
    if (img) img.style.transition = 'none';
    cards.add(c);
    byWrap.set(wrap, c);
    getObserver().observe(wrap);

    const handlers = {
        onPointerEnter: (e) => { if (e.pointerType === 'mouse') c.hovered = true; },
        onPointerLeave: () => { c.hovered = false; c.tx = 0; c.ty = 0; },
        onPointerMove: (e) => {
            if (e.pointerType !== 'mouse') return;
            const r = c.rect || wrap.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;
            c.tx = clamp(x, 0, 1) - 0.5;
            c.ty = clamp(y, 0, 1) - 0.5;
            el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
            el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
        },
    };

    return {
        handlers,
        dispose: () => {
            cards.delete(c);
            byWrap.delete(wrap);
            observer?.unobserve(wrap);
            el.style.transform = '';
            if (img) { img.style.transform = ''; img.style.transition = ''; }
        },
    };
}
