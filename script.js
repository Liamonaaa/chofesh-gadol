// Target: Thursday, June 18, 2026, 00:00 Israel time
const RELEASE_DATE = new Date('2026-06-18T00:00:00+03:00').getTime();
const ORIGIN_DATE = new Date('2025-09-01T00:00:00+03:00').getTime(); // school year start as origin

const $ = id => document.getElementById(id);

const els = {
  d: $('days'), h: $('hours'), m: $('minutes'), s: $('seconds'),
  md: $('mDays'), mh: $('mHours'), mm: $('mMinutes'), ms: $('mSeconds'),
  bigDays: $('bigDays'),
  pf: $('progressFill'), pl: $('progressLabel'),
};

const prev = { d: -1, h: -1, m: -1, s: -1 };
const pad = (n, w = 2) => String(Math.max(0, n)).padStart(w, '0');

function setNum(el, val, key, width = 2) {
  if (!el) return;
  if (prev[key] !== val) {
    el.textContent = pad(val, width);
    el.classList.remove('flip');
    void el.offsetWidth;
    el.classList.add('flip');
    prev[key] = val;
  }
}

function tick() {
  const now = Date.now();
  let diff = RELEASE_DATE - now;

  if (diff <= 0) {
    ['d','h','m','s'].forEach(k => { if (els[k]) els[k].textContent = k === 'd' ? '000' : '00'; });
    if (els.md) els.md.textContent = '000';
    ['mh','mm','ms'].forEach(k => { if (els[k]) els[k].textContent = '00'; });
    if (els.pf) els.pf.style.width = '100%';
    if (els.pl) els.pl.textContent = '🌞 חופש!';
    if (els.bigDays) els.bigDays.textContent = '0';
    return;
  }

  const SEC = 1000, MIN = 60 * SEC, HR = 60 * MIN, DAY = 24 * HR;
  const d = Math.floor(diff / DAY); diff -= d * DAY;
  const h = Math.floor(diff / HR);  diff -= h * HR;
  const m = Math.floor(diff / MIN); diff -= m * MIN;
  const s = Math.floor(diff / SEC);

  setNum(els.d, d, 'd', 3);
  setNum(els.h, h, 'h');
  setNum(els.m, m, 'm');
  setNum(els.s, s, 's');

  if (els.md) els.md.textContent = pad(d, 3);
  if (els.mh) els.mh.textContent = pad(h);
  if (els.mm) els.mm.textContent = pad(m);
  if (els.ms) els.ms.textContent = pad(s);
  if (els.bigDays) els.bigDays.textContent = d;

  const total = RELEASE_DATE - ORIGIN_DATE;
  const elapsed = Date.now() - ORIGIN_DATE;
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  if (els.pf) els.pf.style.width = pct.toFixed(2) + '%';
  if (els.pl) els.pl.textContent = pct.toFixed(1) + '% מהדרך הושלמו';
}

function scheduleTick() {
  tick();
  const now = Date.now();
  const delay = 1000 - (now % 1000) + 8;
  setTimeout(scheduleTick, delay);
}
scheduleTick();

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) tick();
});

// ===== Sticky mini-bar =====
const miniBar = document.getElementById('miniBar');
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (y > 400) miniBar.classList.add('show');
  else miniBar.classList.remove('show');
}, { passive: true });

// ===== Reveal on scroll =====
const revealTargets = document.querySelectorAll('.section');
revealTargets.forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      io.unobserve(en.target);
    }
  });
}, { threshold: 0.12 });
revealTargets.forEach(el => io.observe(el));

// ===== Stat counter =====
const statNums = document.querySelectorAll('.stat-num');
const statIO = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target;
    const target = parseInt(el.dataset.target, 10) || 0;
    const suffix = el.dataset.suffix || '';
    const dur = 1400;
    const start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const v = Math.floor(target * ease(t));
      el.textContent = v + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(step);
    statIO.unobserve(el);
  });
}, { threshold: 0.5 });
statNums.forEach(el => statIO.observe(el));

// ===== Tour: sticky scroll-bound cinematic =====
const tourSection = document.getElementById('tour');
if (tourSection) {
  const panels = tourSection.querySelectorAll('.tour-panel');
  const dots = tourSection.querySelectorAll('.tour-dot');
  const N = panels.length;
  let raf = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function update() {
    raf = 0;
    const rect = tourSection.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = tourSection.offsetHeight - vh;
    if (total <= 0) return;
    const scrolled = clamp(-rect.top, 0, total);
    const progress = scrolled / total;
    const slot = 1 / (N - 1);
    const DWELL = 0.55;

    panels.forEach((p, i) => {
      const center = i * slot;
      const dist = (progress - center) / slot;
      const adist = Math.abs(dist);
      const fadeT = clamp((adist - DWELL) / (1 - DWELL), 0, 1);
      const op = 1 - fadeT;
      const local = 1 - clamp(fadeT * 1.3, 0, 1);
      const frac = clamp((dist + 1) / 2, 0, 1);
      p.style.setProperty('--op', op.toFixed(3));
      p.style.setProperty('--local', local.toFixed(3));
      p.style.setProperty('--frac', frac.toFixed(3));
      p.style.setProperty('--dist', dist.toFixed(3));
      p.classList.toggle('active', adist < 0.5);
    });

    let activeIdx = clamp(Math.round(progress * (N - 1)), 0, N - 1);
    dots.forEach((d, i) => {
      const center = i * slot;
      const near = clamp(1 - Math.abs(progress - center) / slot, 0, 1);
      d.style.setProperty('--near', near.toFixed(3));
      d.classList.toggle('active', i === activeIdx);
    });
  }

  function onScroll() { if (!raf) raf = requestAnimationFrame(update); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}
