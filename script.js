// Target: Thursday, June 18, 2026, 00:00 Israel time
const RELEASE_DATE = new Date('2026-06-18T00:00:00+03:00').getTime();
const ORIGIN_DATE = new Date('2025-09-01T00:00:00+03:00').getTime(); // school year start as origin

// Israeli school holidays (no school) within the school year window.
// Format: 'YYYY-MM-DD' in Israel local time.
const SCHOOL_HOLIDAYS = new Set([
  // 5786 (2025-2026) - covering school days that fall mid-week
  '2025-09-23', '2025-09-24', // ראש השנה
  '2025-10-02',               // יום כיפור
  '2025-10-07', '2025-10-08', // סוכות + שמיני עצרת
  '2025-10-09', '2025-10-10', // חוה"מ סוכות
  '2025-10-13', '2025-10-14', // שמחת תורה + איסרו חג
  '2025-12-15', '2025-12-16', '2025-12-17', '2025-12-18', // חנוכה (חלק)
  '2026-03-03',               // פורים
  '2026-04-02', '2026-04-08', // פסח
  '2026-04-03', '2026-04-06', '2026-04-07', // חוה"מ פסח
  '2026-04-21',               // יום הזיכרון
  '2026-04-22',               // יום העצמאות
  '2026-05-21', '2026-05-22', // ערב שבועות + שבועות
]);

const $ = id => document.getElementById(id);

let mode = localStorage.getItem('chofesh-mode') || 'all';

const els = {
  d: $('days'), h: $('hours'), m: $('minutes'), s: $('seconds'),
  md: $('mDays'), mh: $('mHours'), mm: $('mMinutes'), ms: $('mSeconds'),
  bigDays: $('bigDays'),
  bigDaysLabel: $('bigDaysLabel'),
  daysLabel: $('daysLabel'),
  modeHint: $('modeHint'),
  pf: $('progressFill'), pl: $('progressLabel'),
};

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Count school days strictly between now-day and release day (Sun-Thu, not in holiday set).
function countSchoolDays(nowMs, targetMs) {
  if (targetMs <= nowMs) return 0;
  const cur = new Date(nowMs);
  cur.setHours(0, 0, 0, 0);
  cur.setDate(cur.getDate() + 1); // start counting from tomorrow
  const end = new Date(targetMs);
  end.setHours(0, 0, 0, 0);
  let count = 0;
  while (cur <= end) {
    const dow = cur.getDay(); // 0 Sun..6 Sat
    if (dow !== 5 && dow !== 6 && !SCHOOL_HOLIDAYS.has(isoDate(cur))) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

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

  const dShown = mode === 'school' ? countSchoolDays(now, RELEASE_DATE) : d;

  setNum(els.d, dShown, 'd', 3);
  setNum(els.h, h, 'h');
  setNum(els.m, m, 'm');
  setNum(els.s, s, 's');

  if (els.md) els.md.textContent = pad(dShown, 3);
  if (els.mh) els.mh.textContent = pad(h);
  if (els.mm) els.mm.textContent = pad(m);
  if (els.ms) els.ms.textContent = pad(s);
  if (els.bigDays) els.bigDays.textContent = dShown;

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

// ===== Mode switch (all days vs school days) =====
function applyMode() {
  const schoolLabel = 'ימי לימוד';
  const allLabel = 'ימים';
  const lbl = mode === 'school' ? schoolLabel : allLabel;
  if (els.daysLabel) els.daysLabel.textContent = lbl;
  if (els.bigDaysLabel) els.bigDaysLabel.textContent = lbl;
  if (els.modeHint) els.modeHint.classList.toggle('show', mode === 'school');
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  prev.d = -1; // force re-render of days flip animation
  tick();
}
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    localStorage.setItem('chofesh-mode', mode);
    applyMode();
  });
});
applyMode();

// ===== Marquee: rAF-driven seamless loop. Two identical halves, wrap = halfPx =====
const mqTrack = document.getElementById('marqueeTrack');
let mqHalfPx = 0;
let mqOffset = 0;
let mqLastT = 0;
const MQ_SPEED = 80; // px/sec

function buildMarquee() {
  const track = mqTrack;
  const firstHalf = document.getElementById('marqueeHalf');
  if (!track || !firstHalf) return;

  // Wipe any clones from prior build.
  Array.from(track.children).forEach((c, i) => { if (i > 0) c.remove(); });

  // Reset firstHalf to its original items.
  if (!firstHalf.dataset.original) {
    firstHalf.dataset.original = firstHalf.innerHTML;
  } else {
    firstHalf.innerHTML = firstHalf.dataset.original;
  }

  const vw = window.innerWidth;
  let halfWidth = firstHalf.getBoundingClientRect().width;
  if (halfWidth <= 0) return;

  // Pad firstHalf with item clones until it spans ≥ 1.1 * viewport.
  const items = Array.from(firstHalf.children).map(n => n.cloneNode(true));
  let safety = 0;
  while (firstHalf.getBoundingClientRect().width < vw * 1.1 && safety < 40) {
    items.forEach(n => firstHalf.appendChild(n.cloneNode(true)));
    safety++;
  }
  halfWidth = firstHalf.getBoundingClientRect().width;

  // Duplicate entire first half → exactly 2 identical halves.
  const clone = firstHalf.cloneNode(true);
  clone.removeAttribute('id');
  delete clone.dataset.original;
  clone.setAttribute('aria-hidden', 'true');
  track.appendChild(clone);

  mqHalfPx = halfWidth;
  // Keep current offset valid after rebuild.
  if (mqOffset >= mqHalfPx) mqOffset = mqOffset % mqHalfPx;
}

function mqTick(t) {
  if (mqTrack && mqHalfPx > 0) {
    if (!mqLastT) mqLastT = t;
    const dt = (t - mqLastT) / 1000;
    mqLastT = t;
    // Cap dt to avoid huge jumps after tab unfocus.
    const safeDt = Math.min(dt, 0.1);
    mqOffset += MQ_SPEED * safeDt;
    if (mqOffset >= mqHalfPx) mqOffset -= mqHalfPx;
    mqTrack.style.transform = `translateX(${-mqOffset}px)`;
  } else {
    mqLastT = t;
  }
  requestAnimationFrame(mqTick);
}

buildMarquee();
requestAnimationFrame(mqTick);

// Re-measure after fonts load (emoji/font widths can shift).
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(buildMarquee);
}

// Reset clock on tab return so dt doesn't blow up.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) mqLastT = 0;
});

let mqResizeT = 0;
window.addEventListener('resize', () => {
  clearTimeout(mqResizeT);
  mqResizeT = setTimeout(buildMarquee, 150);
});

// ===== Emoji picker =====
const EMOJI_CATEGORIES = [
  { tab: '😀', name: 'פרצופים', list: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👻','👽','🤖'] },
  { tab: '🌞', name: 'קיץ', list: ['🌞','☀️','🌝','🌚','🌛','🌜','🌙','⭐','🌟','✨','⚡','🔥','💥','☁️','⛅','🌤️','🌥️','🌦️','🌈','☔','💧','💦','🌊','🏖️','🏝️','🏜️','🏕️','🌅','🌄','🌇','🌆','🌃','🌌','🎆','🎇','🌴','🌳','🌲','🌵','🌾','🌿','☘️','🍀','🍃','🍂','🍁','🌸','💐','🌷','🌹','🥀','🌺','🌻','🪷'] },
  { tab: '🍦', name: 'אוכל', list: ['🍦','🍨','🍧','🍉','🍌','🍓','🍒','🍑','🥭','🍍','🥥','🥝','🍇','🍈','🍋','🍊','🍎','🍏','🍐','🥑','🍅','🍆','🥒','🌽','🥕','🌶️','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🌮','🌯','🥗','🍝','🍜','🍲','🍛','🍱','🍣','🍤','🍙','🍚','🍘','🥟','🍢','🍡','🍧','🍨','🍰','🎂','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍿','🥤','🧋','🧃','🍹','🍸','🍷','🥂','🍾','🍺','🍻','☕','🍵','🥛'] },
  { tab: '⚽', name: 'פעילויות', list: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤸','🤼','🤽','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🎮','🕹️','🎰','🎲','🧩','🎯','🎳','🎤','🎧','🎼','🎵','🎶','🎹','🥁','🎷','🎺','🎸','🪕','🎻','🪘','🎬','🎨'] },
  { tab: '✈️', name: 'נסיעות', list: ['✈️','🛫','🛬','🛩️','💺','🚀','🛸','🚁','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🚜','🛵','🏍️','🚲','🛴','🛹','🚂','🚆','🚊','🚉','🚇','🚈','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','⛪','🕌','🕍','🛕','🕋','⛩️'] },
  { tab: '❤️', name: 'לבבות', list: ['❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💌','💋','💯','💢','💥','💫','💦','💨','🕳️','💣','💬','💭','🗯️','♻️','🌟','⭐','🔥'] },
  { tab: '🎒', name: 'אובייקטים', list: ['🎒','📚','📖','📕','📗','📘','📙','📓','📔','📒','📃','📜','📄','📰','🗞️','📑','🔖','🏷️','💰','💴','💵','💶','💷','💸','💳','💎','⚖️','🪜','🧰','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧱','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','⚱️','🏺','🔮','📿','🧿','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🧴','🛎️','🔑','🗝️','🚪','🛋️','🛏️','🛌','🧸','🖼️','🪞','🪟','🛍️','🛒','🎁','🎈','🎏','🎀','🎊','🎉','🎎','🏮','🎐','🧧','✉️','📩','📨','📧','💌','📥','📤','📦','🏷️','📪','📫','📬','📭','📮','📯','📜','📃','📄','📑','🧾','📊','📈','📉','🗒️','🗓️','📅','📆','🗑️','📇','🗃️','🗳️','🗄️','📋','📁','📂','🗂️','🗞️','📰','📓','📔','📒','📕','📗','📘','📙','📚','📖','🔖','🧷','🔗','📎','🖇️','📐','📏','🧮','📌','📍','✂️','🖊️','🖋️','✒️','🖌️','🖍️','📝','✏️','🔍','🔎','🔏','🔐','🔒','🔓'] },
];

const emojiBtn = document.getElementById('byeIconBtn');
const emojiHidden = document.getElementById('byeIcon');
const emojiPicker = document.getElementById('emojiPicker');
const emojiTabs = document.getElementById('emojiTabs');
const emojiGrid = document.getElementById('emojiGrid');
const emojiSearch = document.getElementById('emojiSearch');
let emojiCatIdx = 0;

function renderEmojiTabs() {
  if (!emojiTabs) return;
  emojiTabs.innerHTML = '';
  EMOJI_CATEGORIES.forEach((cat, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emoji-tab' + (i === emojiCatIdx ? ' active' : '');
    b.textContent = cat.tab;
    b.title = cat.name;
    b.setAttribute('aria-label', cat.name);
    b.addEventListener('click', () => {
      emojiCatIdx = i;
      if (emojiSearch) emojiSearch.value = '';
      renderEmojiTabs();
      renderEmojiGrid();
    });
    emojiTabs.appendChild(b);
  });
}
function renderEmojiGrid(filter = '') {
  if (!emojiGrid) return;
  emojiGrid.innerHTML = '';
  let list;
  if (filter) {
    const seen = new Set();
    list = [];
    EMOJI_CATEGORIES.forEach(c => c.list.forEach(e => { if (!seen.has(e)) { seen.add(e); list.push(e); } }));
    // No reliable name match without a names map; just show all when searching.
    // Optional: filter by codepoint match of typed emoji.
    if (filter.trim()) {
      const f = filter.trim();
      list = list.filter(e => e.includes(f));
      if (list.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'emoji-empty';
        empty.textContent = 'לא נמצא';
        emojiGrid.appendChild(empty);
        return;
      }
    }
  } else {
    list = EMOJI_CATEGORIES[emojiCatIdx].list;
  }
  list.forEach(e => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emoji-cell';
    b.textContent = e;
    b.setAttribute('aria-label', e);
    b.addEventListener('click', () => selectEmoji(e));
    emojiGrid.appendChild(b);
  });
}
function selectEmoji(e) {
  if (emojiBtn) emojiBtn.textContent = e;
  if (emojiHidden) emojiHidden.value = e;
  closeEmojiPicker();
}
function openEmojiPicker() {
  if (!emojiPicker) return;
  emojiPicker.hidden = false;
  if (emojiBtn) emojiBtn.setAttribute('aria-expanded', 'true');
  renderEmojiTabs();
  renderEmojiGrid();
}
function closeEmojiPicker() {
  if (!emojiPicker) return;
  emojiPicker.hidden = true;
  if (emojiBtn) emojiBtn.setAttribute('aria-expanded', 'false');
  if (emojiSearch) emojiSearch.value = '';
}
if (emojiBtn) {
  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (emojiPicker.hidden) openEmojiPicker(); else closeEmojiPicker();
  });
}
if (emojiSearch) {
  emojiSearch.addEventListener('input', () => renderEmojiGrid(emojiSearch.value));
  emojiSearch.addEventListener('click', e => e.stopPropagation());
}
document.addEventListener('click', (e) => {
  if (!emojiPicker || emojiPicker.hidden) return;
  if (emojiPicker.contains(e.target) || emojiBtn.contains(e.target)) return;
  closeEmojiPicker();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && emojiPicker && !emojiPicker.hidden) closeEmojiPicker();
});

// ===== Bye section: user-added cards =====
const BYE_KEY = 'chofesh-bye-extras';
const byeGrid = document.getElementById('byeGrid');
const byeForm = document.getElementById('byeAddForm');
const byeIconInput = document.getElementById('byeIcon');
const byeTextInput = document.getElementById('byeText');

function loadByeExtras() {
  try { return JSON.parse(localStorage.getItem(BYE_KEY)) || []; }
  catch { return []; }
}
function saveByeExtras(list) {
  localStorage.setItem(BYE_KEY, JSON.stringify(list));
}
function renderByeExtras() {
  if (!byeGrid) return;
  // Drop any existing user cards.
  byeGrid.querySelectorAll('.bye-card.user').forEach(n => n.remove());
  const list = loadByeExtras();
  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'bye-card user';
    card.dataset.id = item.id;
    card.innerHTML = `
      <button class="bye-remove" type="button" aria-label="הסר">✕</button>
      <span class="bye-x">✕</span>
      <span class="bye-icon">${escapeHtml(item.icon || '✨')}</span>
      <span class="bye-text">${escapeHtml(item.text)}</span>
    `;
    card.querySelector('.bye-remove').addEventListener('click', () => {
      const next = loadByeExtras().filter(x => x.id !== item.id);
      saveByeExtras(next);
      renderByeExtras();
    });
    byeGrid.appendChild(card);
  });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
if (byeForm) {
  byeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (byeTextInput.value || '').trim();
    if (!text) return;
    const icon = (byeIconInput.value || '').trim() || '✨';
    // Reset trigger button visual to placeholder for next add.
    if (emojiBtn) emojiBtn.textContent = '🙃';
    const list = loadByeExtras();
    list.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), icon, text });
    saveByeExtras(list);
    byeIconInput.value = '';
    byeTextInput.value = '';
    renderByeExtras();
  });
}
renderByeExtras();

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
