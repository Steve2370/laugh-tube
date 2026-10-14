// Fond animé de l'accueil (remplace BG.mp4) : les doodles au trait du clip
// « On vient pour rire » — la mascotte, des icônes, des « HAHA » — montent comme
// des bulles, se dessinent, piquent des fous rires et s'écartent de la souris.
// Uniquement du DOM/SVG déplacé par transform : rien à télécharger, pas de canvas.

/* eslint-disable */
const MASCOT = {
    w: 690,
    h: 1000,
    d: "M633 277 609 268 584 265 584 278 613 291 636 313 646 332 649 356 643 379 634 396 617 412 592 428 587 513 579 589 572 627 561 656 551 673 536 692 519 708 497 722 445 747 393 759 341 758 313 753 284 743 251 729 220 711 197 694 182 678 166 650 158 619 139 453 112 437 95 422 85 404 80 383 81 361 90 340 112 318 145 302 144 290 116 294 93 303 73 319 61 336 54 352 50 370 50 386 53 403 60 422 72 439 88 453 107 466 124 619 134 649 151 682 182 719 204 736 231 752 259 765 288 775 320 782 349 785 350 886 309 889 280 895 253 904 238 914 229 928 228 950 234 967 249 979 273 988 310 995 356 998 404 997 444 992 475 984 500 973 514 959 518 946 516 925 510 915 500 907 483 899 455 892 402 885 400 784 433 778 463 769 493 756 521 740 545 723 565 704 583 680 596 656 606 629 612 606 625 439 646 423 663 405 673 385 679 361 677 337 668 312 652 291ZM548 131 531 102 509 79 480 62 444 51 396 44 329 45 281 52 243 65 219 78 198 98 184 118 171 146 162 180 158 214 159 311 178 311 176 277 199 276 205 271 209 263 208 252 202 245 194 243 176 243 177 216 199 215 205 209 208 202 207 193 201 185 194 182 181 182 191 147 202 128 216 112 236 96 257 84 259 150 265 160 273 163 284 160 291 149 291 73 316 68 317 148 322 158 332 162 343 159 349 148 348 64 374 64 375 147 379 155 388 161 400 159 407 147 406 66 432 71 433 147 436 154 443 160 456 159 465 149 464 82 495 98 510 110 524 126 532 141 540 163 544 177 532 177 525 180 520 188 519 197 522 204 529 210 549 212 551 238 528 240 521 248 519 257 522 265 529 271 551 272 552 287 570 284 570 245 563 180ZM564 494 537 554 528 611 513 646 495 666 473 682 472 661 468 652 459 647 448 649 442 654 440 661 440 699 420 706 415 707 414 660 410 652 402 648 390 649 383 659 382 714 357 713 356 662 352 654 345 649 334 649 325 659 324 708 299 699 298 662 294 654 288 650 277 650 269 655 266 663 266 683 239 666 223 649 212 630 204 601 198 552 170 499 185 613 199 644 220 672 243 691 280 712 316 723 355 729 393 728 433 719 467 706 495 688 519 667 535 644 547 620 553 597ZM612 339 605 317 594 304 577 296 558 296 543 303 534 312 572 315 557 333 539 350 501 374 467 387 429 396 389 400 339 401 270 393 237 384 212 374 187 361 165 344 178 338 203 331 181 323 164 321 144 327 127 342 119 359 117 381 119 393 122 394 144 359 161 434 183 493 210 542 243 579 275 602 312 617 355 625 396 625 430 619 463 605 491 586 516 560 537 525 554 481 591 326 612 347ZM500 930 498 937 490 943 464 954 426 963 376 966 330 965 284 957 256 947 249 942 246 935 247 928 252 922 269 913 305 906 351 902 351 917 336 923 332 930 340 937 354 941 392 941 407 937 417 932 419 929 418 924 402 916 402 901 431 903 473 911 492 920ZM293 199 274 206 257 226 245 258 242 294 249 328 261 351 279 365 301 369 315 367 324 361 341 343 352 315 354 281 348 249 335 220 317 204 306 200ZM488 244 476 235 461 234 447 238 432 247 419 261 408 281 404 299 404 317 427 302 445 296 471 296 491 305 498 305 499 297 495 289 475 275 455 275 430 284 438 272 453 260 471 254 493 252ZM297 216 312 219 325 232 336 253 341 279 340 308 333 331 320 349 302 356 285 354 270 342 259 320 255 295 257 266 266 237 279 222ZM388 800 389 923 376 926 374 808ZM102 259 91 251 74 248 56 248 34 253 18 262 6 273 1 283 2 295 6 303 13 308 29 307 44 299 70 274ZM324 420 402 419 407 444 405 463 395 470 374 474 349 474 330 469 325 464 322 452ZM484 404 485 437 483 447 476 456 463 462 443 467 419 469 414 466 411 454 414 418ZM281 18 273 10 261 5 246 5 232 10 220 19 205 35 200 47 199 59 215 44 230 34 254 26 283 26ZM293 252 284 256 276 267 271 297 274 315 279 327 287 336 296 338 306 335 314 323 318 306 319 288 316 274 310 262 302 254ZM46 204 44 217 53 228 64 232 98 236 125 247 110 218 91 199 75 194 62 193 53 195ZM252 409 314 418 317 448 312 463 306 466 298 467 270 462 257 456 252 450 250 440ZM541 374 541 398 532 418 511 438 498 446 493 446 491 442 493 400ZM453 21 452 26 474 24 493 29 508 38 520 52 522 50 521 41 514 24 505 14 495 8 485 5 470 7 459 13ZM614 234 637 243 657 258 670 264 682 263 689 254 689 245 684 238 664 226 635 224 623 228ZM195 386 241 404 243 443 241 448 236 449 223 444 206 428 196 408ZM654 183 649 179 640 178 622 187 611 201 604 225 621 214 652 203 658 194ZM66 261 31 292 21 296 15 294 14 290 15 283 28 271 45 263ZM56 212 62 206 74 207 88 213 97 222 64 218 58 215ZM428 325 429 329 436 330 468 328 444 320 433 321ZM646 235 658 236 670 241 677 247 677 253 667 251ZM301 265 306 267 311 273 310 281 305 285 300 284 296 277 297 270ZM646 192 641 196 624 200 638 190 643 189Z",
};
const ICONS = {
    'mic': "<path d=\"M12 19v3\" /> <path d=\"M19 10v2a7 7 0 0 1-14 0v-2\" /> <rect x=\"9\" y=\"2\" width=\"6\" height=\"13\" rx=\"3\" />",
    'laugh': "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z\" /> <line x1=\"9\" x2=\"9.01\" y1=\"9\" y2=\"9\" /> <line x1=\"15\" x2=\"15.01\" y1=\"9\" y2=\"9\" />",
    'message-circle': "<path d=\"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719\" />",
    'star': "<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\" />",
    'sparkles': "<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\" /> <path d=\"M20 2v4\" /> <path d=\"M22 4h-4\" /> <circle cx=\"4\" cy=\"20\" r=\"2\" />",
    'party-popper': "<path d=\"M5.8 11.3 2 22l10.7-3.79\" /> <path d=\"M4 3h.01\" /> <path d=\"M22 8h.01\" /> <path d=\"M15 2h.01\" /> <path d=\"M22 20h.01\" /> <path d=\"m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10\" /> <path d=\"m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17\" /> <path d=\"m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7\" /> <path d=\"M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z\" />",
    'drama': "<path d=\"M10 11h.01\" /> <path d=\"M14 6h.01\" /> <path d=\"M18 6h.01\" /> <path d=\"M6.5 13.1h.01\" /> <path d=\"M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3\" /> <path d=\"M17.4 9.9c-.8.8-2 .8-2.8 0\" /> <path d=\"M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7\" /> <path d=\"M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4\" />",
    'megaphone': "<path d=\"M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z\" /> <path d=\"M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14\" /> <path d=\"M8 6v8\" />",
    'heart': "<path d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\" />",
    'smile': "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M8 14s1.5 2 4 2 4-2 4-2\" /> <line x1=\"9\" x2=\"9.01\" y1=\"9\" y2=\"9\" /> <line x1=\"15\" x2=\"15.01\" y1=\"9\" y2=\"9\" />",
    'zap': "<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\" />",
    'music': "<path d=\"M9 18V5l12-2v13\" /> <circle cx=\"6\" cy=\"18\" r=\"3\" /> <circle cx=\"18\" cy=\"16\" r=\"3\" />",
    'thumbs-up': "<path d=\"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z\" /> <path d=\"M7 10v12\" />",
    'clapperboard': "<path d=\"M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z\" /> <path d=\"m6.2 5.3 3.1 3.9\" /> <path d=\"m12.4 3.4 3.1 4\" /> <path d=\"M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z\" />",
};
/* eslint-enable */

const ICON_NAMES = Object.keys(ICONS);
const WORDS = ['HA', 'HAHA', 'LOL', 'MDR', 'PTDR', 'HIHI'];
const COL = { blue: '#3b82f6', ink: '#1e40af', yellow: '#eab308', red: '#ef4444', sky: '#0ea5e9' };
const FUNNY = new Set(['laugh', 'smile', 'drama']);
const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const easeOutBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

// Un clic « dans le vide » : la cible et tous ses parents sont transparents
// (on ne réagit pas aux clics sur une carte, un bouton, l'en-tête, etc.).
function isBackgroundClick(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest('a,button,input,textarea,select,label,video,img,[role="button"]')) return false;
    for (let n = target; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.backgroundImage !== 'none') return false;
        const bg = s.backgroundColor;
        if (bg && bg !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(bg)) return false;
    }
    return true;
}

export function createLaughDoodles(root, { animate = true } = {}) {
    root.innerHTML = '<div class="lt-bg-grid"></div>';
    const grid = root.firstChild;
    let W = window.innerWidth;
    let H = window.innerHeight;
    let items = [];
    let bucket = -1;
    let time = 0;
    let nextLaugh = 1.2;
    let lastSy = window.scrollY;
    let vel = 0;
    let last = null;
    const pointer = { x: -1e4, y: -1e4, on: false };
    const parts = [];

    function makeItem(kind, z) {
        const svg = document.createElementNS(NS, 'svg');
        const it = { kind, z, el: svg, px: 0, py: 0, laugh: 0, sx: 0, sy: 0 };
        const k = 0.62 + 0.38 * z;
        const small = W < 640 ? 0.72 : 1;
        if (kind === 'mascot') {
            it.h = rand(150, 210) * k * small;
            it.w = it.h * MASCOT.w / MASCOT.h;
            svg.setAttribute('viewBox', `0 0 ${MASCOT.w} ${MASCOT.h}`);
            svg.innerHTML = `<path d="${MASCOT.d}" pathLength="1"/>`;
            svg.setAttribute('stroke-width', (2.4 * MASCOT.h / it.h).toFixed(2));
            svg.setAttribute('stroke', COL.ink);
            it.alpha = 0.13 + 0.17 * z;
            it.draws = true;
        } else if (kind === 'word') {
            const word = pick(WORDS);
            const vbw = 100 * (0.25 + 0.68 * word.length);
            it.h = rand(40, 66) * k * small;
            it.w = it.h * vbw / 100;
            svg.setAttribute('viewBox', `0 0 ${vbw} 100`);
            const c = Math.random() < 0.65 ? COL.blue : COL.yellow;
            svg.innerHTML = `<text x="${vbw / 2}" y="54" text-anchor="middle" dominant-baseline="middle" font-size="86" fill="${c}" fill-opacity="0.10" stroke="${c}" stroke-width="${(2.2 * 100 / it.h).toFixed(2)}">${word}</text>`;
            it.alpha = 0.22 + 0.28 * z;
            it.draws = false;
        } else {
            const name = pick(ICON_NAMES);
            it.h = it.w = rand(44, 78) * k * small;
            svg.setAttribute('viewBox', '-1 -1 26 26');
            svg.innerHTML = ICONS[name];
            svg.querySelectorAll('*').forEach((e) => e.setAttribute('pathLength', '1'));
            svg.setAttribute('stroke-width', (2.1 * 26 / it.h).toFixed(2));
            const c = name === 'heart' ? COL.red
                : (name === 'star' || name === 'sparkles' || name === 'zap') ? COL.yellow
                    : Math.random() < 0.75 ? COL.blue : COL.sky;
            svg.setAttribute('stroke', c);
            it.alpha = (c === COL.yellow ? 0.32 : 0.2) + 0.25 * z;
            it.draws = true;
            it.funny = FUNNY.has(name);
        }
        svg.setAttribute('class', 'lt-dd' + (it.draws ? ' draw' : ''));
        svg.setAttribute('width', it.w.toFixed(1));
        svg.setAttribute('height', it.h.toFixed(1));
        svg.style.opacity = it.alpha.toFixed(3);
        respawn(it, true);
        return it;
    }

    function respawn(it, initial) {
        it.x = rand(0.02, 0.98) * W;
        it.y = initial ? rand(-0.05, 1.05) * H : H + it.h * 0.6 + rand(0, 60);
        it.vy = rand(9, 22) * (0.5 + 0.5 * it.z);
        it.sway = rand(6, 20);
        it.swf = rand(0.22, 0.55);
        it.ph = rand(0, TAU);
        it.rot0 = rand(-16, 16);
        it.rsp = rand(3, 8);
        it.prog = !animate || (initial && Math.random() < 0.55) ? 1 : 0;
        it.delay = !animate ? 0 : initial ? rand(0, 1.6) : rand(0, 0.4);
        if (it.draws) it.el.style.setProperty('--d', it.prog >= 1 ? '0' : '1');
    }

    function build() {
        items.forEach((it) => it.el.remove());
        const n = W >= 1100 ? 28 : W >= 700 ? 20 : 13;
        const mascots = W >= 700 ? 3 : 2;
        items = [];
        for (let i = 0; i < n; i++) {
            const kind = i < mascots ? 'mascot' : i < mascots + Math.round(n * 0.28) ? 'word' : 'icon';
            items.push(makeItem(kind, rand(0.35, 1)));
        }
        // les plus lointains derrière, avant les petits « ha »
        items.sort((a, b) => a.z - b.z).forEach((it) => root.insertBefore(it.el, parts[0]?.el || null));
        bucket = W >= 1100 ? 2 : W >= 700 ? 1 : 0;
    }

    // petits « ha » qui s'échappent d'un doodle qui rit
    if (animate) {
        for (let i = 0; i < 14; i++) {
            const d = document.createElement('div');
            d.className = 'lt-ha';
            root.appendChild(d);
            parts.push({ el: d, life: 0 });
        }
    }
    function emitHa(x, y, n, big) {
        for (let i = 0; i < n; i++) {
            const p = parts.find((q) => q.life <= 0);
            if (!p) return;
            p.el.textContent = pick(['ha', 'ha', 'HA', 'hi', 'ha!']);
            p.el.style.color = pick(['#2563eb', '#2563eb', '#ca8a04', '#ef4444']);
            p.el.style.fontSize = `${big ? rand(22, 30) : rand(14, 20)}px`;
            const a = big ? rand(0, TAU) : rand(-2.4, -0.7);
            const sp = big ? rand(90, 160) : rand(55, 95);
            p.x = x; p.y = y;
            p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
            p.max = p.life = rand(0.9, 1.3);
            p.rot = rand(-25, 25);
        }
    }
    function laugh(it) {
        it.laugh = 0.95;
        emitHa(it.sx, it.sy - it.h * 0.45, it.kind === 'mascot' ? 3 : 2, false);
    }

    function step(dt) {
        time += dt;
        const sy = window.scrollY;
        const dS = sy - lastSy;
        lastSy = sy;
        if (dt > 0) vel = lerp(vel, dS / dt, 0.25);
        grid.style.transform = `translate3d(0,${(-(sy * 0.08) % 28).toFixed(2)}px,0)`;
        const tilt = clamp(vel * 0.006, -9, 9);

        for (const it of items) {
            it.y -= it.vy * dt + dS * 0.22 * it.z;
            if (it.y < -it.h * 0.7) respawn(it, false);
            else if (it.y > H + it.h * 0.7 + 80) it.y -= H + it.h * 1.4;

            if (it.delay > 0) it.delay -= dt;
            else if (it.prog < 1) {
                it.prog = Math.min(1, it.prog + dt / (it.kind === 'mascot' ? 2.2 : 1.3));
                if (it.draws) it.el.style.setProperty('--d', (1 - easeOutCubic(it.prog)).toFixed(4));
            }

            const sx = it.x + Math.sin(time * it.swf + it.ph) * it.sway;
            let tx = 0, ty = 0;
            if (pointer.on) {
                const dx = sx - pointer.x, dy = it.y - pointer.y, R = 170, d2 = dx * dx + dy * dy;
                if (d2 < R * R && d2 > 1) {
                    const d = Math.sqrt(d2), f = 1 - d / R;
                    tx = dx / d * f * 70; ty = dy / d * f * 70;
                }
            }
            it.px = lerp(it.px, tx, 0.09);
            it.py = lerp(it.py, ty, 0.09);
            it.sx = sx + it.px;
            it.sy = it.y + it.py;

            let rot = it.rot0 + Math.sin(time * it.swf * 0.8 + it.ph) * it.rsp + tilt * it.z;
            let sc = it.draws ? 1 : easeOutBack(Math.min(1, it.prog * 1.6));
            if (it.laugh > 0) {
                it.laugh -= dt;
                const k = Math.max(0, it.laugh / 0.95);
                rot += Math.sin(time * 42) * 10 * k;
                sc *= 1 + Math.sin(time * 31) * 0.08 * k;
            }
            it.el.style.transform = `translate3d(${(it.sx - it.w / 2).toFixed(1)}px,${(it.sy - it.h / 2).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        }

        if (!animate) return;
        nextLaugh -= dt;
        if (nextLaugh <= 0) {
            nextLaugh = rand(1.3, 2.4);
            const vis = items.filter((it) => it.prog >= 1 && it.laugh <= 0 && it.sy > 60 && it.sy < H - 40);
            const fav = vis.filter((it) => it.kind !== 'icon' || it.funny);
            const it = Math.random() < 0.7 && fav.length ? pick(fav) : vis.length ? pick(vis) : null;
            if (it) laugh(it);
        }
        for (const p of parts) {
            if (p.life <= 0) continue;
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 30 * dt;
            const u = 1 - p.life / p.max;
            const s = u < 0.2 ? easeOutBack(u / 0.2) : 1;
            p.el.style.opacity = (p.life <= 0 ? 0 : Math.min(1, (p.life / p.max) * 1.6) * 0.85).toFixed(3);
            p.el.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) translate(-50%,-50%) rotate(${p.rot}deg) scale(${s.toFixed(3)})`;
        }
    }

    function onResize() {
        const ox = W;
        W = window.innerWidth;
        H = window.innerHeight;
        const b = W >= 1100 ? 2 : W >= 700 ? 1 : 0;
        if (b !== bucket) build();
        else items.forEach((it) => { it.x *= W / ox; });
        if (!animate) step(0);
    }
    function onMove(e) {
        if (e.pointerType !== 'mouse') return;
        pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
    }
    function onLeave() { pointer.on = false; }
    function onDown(e) {
        if (!isBackgroundClick(e.target)) return;
        let best = null, bd = 260 * 260;
        for (const it of items) {
            const d = (it.sx - e.clientX) ** 2 + (it.sy - e.clientY) ** 2;
            if (d < bd && it.prog >= 1) { bd = d; best = it; }
        }
        if (best) laugh(best);
        emitHa(e.clientX, e.clientY, 5, true);
    }

    build();
    window.addEventListener('resize', onResize);
    if (animate) {
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerdown', onDown, { passive: true });
        document.documentElement.addEventListener('pointerleave', onLeave);
    } else {
        step(0);
    }

    return {
        // à appeler à chaque image avec le temps rAF (ms)
        frame(t) {
            const dt = last === null ? 1 / 60 : Math.min(0.05, (t - last) / 1000);
            last = t;
            step(dt);
        },
        dispose() {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerdown', onDown);
            document.documentElement.removeEventListener('pointerleave', onLeave);
            root.innerHTML = '';
        },
    };
}
