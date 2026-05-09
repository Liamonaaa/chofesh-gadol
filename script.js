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

// Keyword index for search (Hebrew + English). Subset; emojis without entry only browsable.
const EMOJI_KEYWORDS = {
  '😀':'smile happy grin שמח חיוך מחייך פרצוף שמחה','😃':'smile happy שמח חיוך','😄':'smile happy laugh שמח חיוך','😁':'grin smile שמח חיוך','😆':'laugh צוחק','😅':'sweat laugh צוחק זיעה מבויש',
  '🤣':'rofl laugh בוכה צחוק לול','😂':'joy laugh cry בוכה צוחק לול דמעות','🙂':'smile slight חיוך','🙃':'upside הפוך משוגע','😉':'wink קריצה','😊':'blush smile מסמיק חיוך מבויש',
  '😇':'angel halo מלאך','🥰':'love hearts אוהב מאוהב לבבות','😍':'love heart eyes מאוהב לבבות','🤩':'star eyes מתפעל מתלהב','😘':'kiss נשיקה','😗':'kiss נשיקה','😚':'kiss נשיקה','😙':'kiss נשיקה',
  '🥲':'tear smile דמעות חיוך','😋':'yum טעים','😛':'tongue לשון','😜':'tongue wink לשון קריצה','🤪':'crazy מטורף','😝':'tongue לשון','🤑':'money כסף','🤗':'hug חיבוק',
  '🤭':'oops shy שקט ששש','🤫':'shh שקט סוד','🤔':'think חושב מחשבה','🤐':'zip שקט סגור','🤨':'eyebrow חשוד','😐':'neutral רגיל','😑':'expressionless ללא הבעה',
  '😶':'no mouth שותק','😏':'smirk שובב','😒':'unamused משועמם מתעצבן','🙄':'eye roll גלגול עיניים','😬':'grimace מבויש','🤥':'lie liar שקרן','😌':'relieved נינוח','😔':'pensive עצוב מהורהר',
  '😪':'sleepy עייף','🤤':'drool ריר','😴':'sleep ישן','😷':'mask מסכה חולה','🤒':'sick חולה חום','🤕':'hurt פצוע','🤢':'nausea בחילה','🤮':'vomit מקיא',
  '🥵':'hot חם','🥶':'cold קר','🥴':'woozy שיכור','😵':'dizzy סחרחר','🤯':'mind blown מטורף','🤠':'cowboy בוקר','🥳':'party מסיבה חוגג','🥸':'disguise תחפושת',
  '😎':'cool sunglasses קול משקפיים','🤓':'nerd חנון','🧐':'monocle חוקר','😕':'confused מבולבל','😟':'worried דואג','🙁':'frown עצוב','☹️':'frown עצוב','😮':'surprised מופתע',
  '😯':'surprised מופתע','😲':'shocked הלם','😳':'flushed נבוך','🥺':'pleading מתחנן','😦':'frown עצוב','😧':'anguish יסורים','😨':'fear פחד','😰':'anxious חרדה',
  '😥':'sad עצוב','😢':'cry בוכה דמעה','😭':'sob בוכה בכי','😱':'scream צרחה פחד','😖':'confounded מבולבל','😣':'persevere מתאמץ','😞':'disappointed מאוכזב','😓':'sweat זיעה לחץ',
  '😩':'weary מותש','😫':'tired עייף','🥱':'yawn מפהק','😤':'huff כועס','😡':'angry rage כועס עצבני','😠':'angry כועס','🤬':'curse קללה','😈':'devil שטן',
  '👿':'imp שדון','💀':'skull גולגולת מוות','☠️':'skull crossbones גולגולת','💩':'poop קקי','🤡':'clown ליצן','👻':'ghost רוח','👽':'alien חייזר','🤖':'robot רובוט',

  '🌞':'sun summer שמש קיץ','☀️':'sun שמש','🌝':'moon ירח','🌚':'moon ירח','🌛':'moon ירח','🌜':'moon ירח','🌙':'moon ירח crescent','⭐':'star כוכב','🌟':'star כוכב נצנוץ','✨':'sparkle נצנוץ קסם','⚡':'lightning ברק','🔥':'fire אש',
  '💥':'boom פיצוץ','☁️':'cloud ענן','⛅':'cloud sun ענן','🌤️':'sun cloud שמש','🌥️':'sun cloud שמש','🌦️':'rain sun גשם','🌈':'rainbow קשת','☔':'rain umbrella גשם מטריה','💧':'drop טיפה','💦':'sweat splash זיעה מים',
  '🌊':'wave sea ים גל','🏖️':'beach חוף','🏝️':'island אי','🏜️':'desert מדבר','🏕️':'camp קמפינג','🌅':'sunrise זריחה','🌄':'sunrise זריחה','🌇':'sunset שקיעה','🌆':'sunset עיר','🌃':'night לילה',
  '🌌':'milky way לילה כוכבים','🎆':'fireworks זיקוקים','🎇':'sparkler נצנוץ','🌴':'palm tree דקל','🌳':'tree עץ','🌲':'pine tree עץ','🌵':'cactus קקטוס','🌾':'wheat שיבולת','🌿':'herb עשב','☘️':'shamrock תלתן',
  '🍀':'clover תלתן מזל','🍃':'leaf עלה','🍂':'leaf עלה','🍁':'maple leaf עלה','🌸':'blossom פרח','💐':'bouquet פרחים זר','🌷':'tulip צבעוני','🌹':'rose ורד','🥀':'wilted ורד','🌺':'hibiscus פרח','🌻':'sunflower חמנייה',

  '🍦':'icecream גלידה','🍨':'icecream גלידה','🍧':'shaved ice ברד','🍉':'watermelon אבטיח','🍌':'banana בננה','🍓':'strawberry תות','🍒':'cherry דובדבן','🍑':'peach אפרסק','🥭':'mango מנגו','🍍':'pineapple אננס',
  '🥥':'coconut קוקוס','🥝':'kiwi קיווי','🍇':'grapes ענבים','🍈':'melon מלון','🍋':'lemon לימון','🍊':'orange תפוז','🍎':'apple תפוח','🍏':'apple תפוח','🍐':'pear אגס','🥑':'avocado אבוקדו',
  '🍅':'tomato עגבנייה','🍆':'eggplant חציל','🥒':'cucumber מלפפון','🌽':'corn תירס','🥕':'carrot גזר','🌶️':'pepper פלפל חריף','🥔':'potato תפוח אדמה','🥐':'croissant קרואסון','🥯':'bagel בייגל','🍞':'bread לחם',
  '🥖':'baguette לחם','🥨':'pretzel בייגלה','🧀':'cheese גבינה','🥚':'egg ביצה','🍳':'fried egg ביצה','🥞':'pancakes פנקייק','🧇':'waffle ופל','🥓':'bacon בייקון','🥩':'steak סטייק','🍗':'chicken עוף',
  '🍖':'meat בשר','🌭':'hotdog נקניקייה','🍔':'burger המבורגר','🍟':'fries צ\'יפס','🍕':'pizza פיצה','🥪':'sandwich סנדוויץ\'','🌮':'taco טאקו','🌯':'burrito בוריטו','🥗':'salad סלט','🍝':'pasta פסטה',
  '🍜':'noodles נודלס אטריות','🍲':'stew מרק','🍛':'curry קארי','🍱':'bento ארוחה','🍣':'sushi סושי','🍤':'shrimp שרימפס','🍙':'rice ball אורז','🍚':'rice אורז','🍰':'cake עוגה','🎂':'birthday cake יומולדת',
  '🧁':'cupcake עוגה','🥧':'pie פאי','🍫':'chocolate שוקולד','🍬':'candy סוכרייה','🍭':'lollipop סוכרייה','🍮':'pudding פודינג','🍯':'honey דבש','🍿':'popcorn פופקורן','🥤':'cup soda שתייה','🧋':'bubble tea באבל טי',
  '🧃':'juice מיץ','🍹':'cocktail קוקטייל','🍸':'martini קוקטייל','🍷':'wine יין','🥂':'champagne שמפניה','🍺':'beer בירה','🍻':'beers בירה','☕':'coffee קפה','🍵':'tea תה','🥛':'milk חלב',

  '⚽':'soccer ball כדורגל','🏀':'basketball כדורסל','🏈':'football פוטבול','⚾':'baseball בייסבול','🎾':'tennis טניס','🏐':'volleyball כדורעף','🥏':'frisbee פריזבי','🎱':'pool ביליארד','🏓':'pingpong פינגפונג','🏸':'badminton בדמינטון',
  '🥅':'goal שער','⛳':'golf גולף','🎣':'fishing דיג','🥊':'boxing אגרוף','🎽':'jersey חולצה ספורט','🛹':'skateboard סקייטבורד','⛸️':'skate החלקה','🎿':'ski סקי','🏂':'snowboard סנובורד','🏋️':'lift הרמה כושר',
  '🤸':'cartwheel גלגלון','🏊':'swim שחייה','🚴':'bike אופניים','🎮':'gaming משחקים','🕹️':'joystick ג\'ויסטיק','🎯':'target מטרה','🎳':'bowling באולינג','🎤':'mic מיקרופון','🎧':'headphones אוזניות',
  '🎵':'music note מוזיקה','🎶':'music מוזיקה','🎹':'piano פסנתר','🥁':'drum תופים','🎷':'sax סקסופון','🎺':'trumpet חצוצרה','🎸':'guitar גיטרה','🎻':'violin כינור','🎬':'clapper סרט קולנוע','🎨':'art ציור אומנות',

  '✈️':'plane מטוס','🚀':'rocket טיל חלל','🛸':'ufo עב\"מ','🚁':'helicopter מסוק','⛵':'sailboat סירה','🚤':'boat סירה','🛳️':'cruise ship ספינה','🚢':'ship ספינה','⚓':'anchor עוגן','🚗':'car רכב מכונית',
  '🚕':'taxi מונית','🚙':'suv ג\'יפ','🚌':'bus אוטובוס','🏎️':'race car מירוץ','🚓':'police משטרה','🚑':'ambulance אמבולנס','🚒':'fire truck כבאית','🛵':'scooter קטנוע','🏍️':'motorcycle אופנוע','🚲':'bike אופניים',
  '🛴':'scooter קורקינט','🚂':'train רכבת','🚆':'train רכבת','🚇':'subway רכבת תחתית','🗺️':'map מפה','🗽':'liberty פסל החירות','🏰':'castle טירה','🏟️':'stadium אצטדיון','🎡':'ferris wheel גלגל ענק','🎢':'roller coaster רכבת הרים',
  '🎠':'carousel קרוסלה','⛲':'fountain מזרקה','🌋':'volcano הר געש','⛰️':'mountain הר','🏔️':'mountain הר','🗻':'mountain fuji הר','⛺':'tent אוהל קמפינג','🏠':'house בית','🏡':'house garden בית','🏥':'hospital בית חולים',
  '🏫':'school בית ספר ספר','💒':'wedding חתונה','⛪':'church כנסייה','🕌':'mosque מסגד','🕍':'synagogue בית כנסת',

  '❤️':'heart red לב אדום אהבה','🧡':'heart orange לב כתום','💛':'heart yellow לב צהוב','💚':'heart green לב ירוק','💙':'heart blue לב כחול','💜':'heart purple לב סגול','🤎':'heart brown לב חום','🖤':'heart black לב שחור','🤍':'heart white לב לבן','💔':'broken heart לב שבור',
  '❣️':'heart לב','💕':'hearts לבבות','💞':'hearts לבבות','💓':'beating heart לב','💗':'growing heart לב','💖':'sparkling heart לב','💘':'cupid לב חץ','💝':'gift heart מתנה','💟':'heart לב','💌':'love letter מכתב אהבה','💋':'kiss נשיקה',
  '💯':'hundred מאה מושלם','💢':'anger כעס','💫':'dizzy סחרחורת',

  '🎒':'backpack תיק תרמיל','📚':'books ספרים','📖':'book ספר','📕':'book ספר','📗':'book ספר','📘':'book ספר','📙':'book ספר','📓':'notebook מחברת','📰':'news עיתון','📜':'scroll מגילה',
  '💰':'money כסף','💵':'dollar דולר','💸':'flying money כסף','💳':'card כרטיס אשראי','💎':'diamond יהלום','🔑':'key מפתח','🎁':'gift מתנה','🎈':'balloon בלון','🎉':'party מסיבה חוגג','🎊':'confetti חגיגה',
  '🛍️':'shopping קניות','🛒':'cart עגלה קניות','📝':'memo פתק רשימה','✏️':'pencil עיפרון','🔍':'search חיפוש','🔒':'lock נעילה','🔓':'unlock פתוח','📱':'phone טלפון','💻':'laptop מחשב','⏰':'alarm שעון מעורר',

  '🦠':'germ חיידק','🧬':'dna גנים','💉':'syringe זריקה','💊':'pill כדור','🩺':'stethoscope רופא','🌡️':'thermometer מדחום',
};

const emojiBtn = document.getElementById('byeIconBtn');
const emojiHidden = document.getElementById('byeIcon');
const emojiPicker = document.getElementById('emojiPicker');
const emojiTabs = document.getElementById('emojiTabs');
const emojiGrid = document.getElementById('emojiGrid');
const emojiSearch = document.getElementById('emojiSearch');
const emojiPasteInput = document.getElementById('emojiPaste');
const emojiPasteBtn = document.getElementById('emojiPasteBtn');
let emojiCatIdx = 0;
let emojiTabsBuilt = false;

function buildEmojiTabsOnce() {
  if (!emojiTabs || emojiTabsBuilt) return;
  emojiTabs.innerHTML = '';
  EMOJI_CATEGORIES.forEach((cat, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emoji-tab' + (i === emojiCatIdx ? ' active' : '');
    b.textContent = cat.tab;
    b.title = cat.name;
    b.dataset.idx = String(i);
    b.setAttribute('aria-label', cat.name);
    emojiTabs.appendChild(b);
  });
  emojiTabsBuilt = true;
  // Single delegated listener — does NOT rebuild DOM, only flips active class.
  emojiTabs.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const t = ev.target.closest('.emoji-tab');
    if (!t) return;
    const idx = parseInt(t.dataset.idx, 10);
    if (Number.isNaN(idx)) return;
    emojiCatIdx = idx;
    if (emojiSearch) emojiSearch.value = '';
    Array.from(emojiTabs.children).forEach((c, i) => c.classList.toggle('active', i === idx));
    renderEmojiGrid();
  });
}

function searchEmojis(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  // Allow finding by exact emoji paste.
  if (Object.prototype.hasOwnProperty.call(EMOJI_KEYWORDS, query.trim()) || /\p{Extended_Pictographic}/u.test(q)) {
    // If user pasted an emoji, just return it (and any keyword match).
    const direct = [];
    if (/\p{Extended_Pictographic}/u.test(query.trim())) direct.push(query.trim());
    return direct;
  }
  const terms = q.split(/\s+/).filter(Boolean);
  const results = [];
  for (const [emoji, kw] of Object.entries(EMOJI_KEYWORDS)) {
    const tokens = (emoji + ' ' + kw).toLowerCase().split(/\s+/);
    // Each query term must match the start of at least one keyword token (word-prefix).
    if (terms.every(t => tokens.some(tok => tok.startsWith(t)))) results.push(emoji);
  }
  return results;
}

function renderEmojiGrid(filter = '') {
  if (!emojiGrid) return;
  emojiGrid.innerHTML = '';
  let list;
  const q = (filter || '').trim();
  if (q) {
    list = searchEmojis(q);
    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'emoji-empty';
      empty.textContent = 'לא נמצא — נסה לכתוב באנגלית או להדביק אימוג\'י למטה';
      emojiGrid.appendChild(empty);
      return;
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
    emojiGrid.appendChild(b);
  });
}
if (emojiGrid) {
  emojiGrid.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const cell = ev.target.closest('.emoji-cell');
    if (!cell) return;
    selectEmoji(cell.textContent);
  });
}

function extractFirstEmoji(s) {
  if (!s) return '';
  const trimmed = String(s).trim();
  if (!trimmed) return '';
  // Use Intl.Segmenter for grapheme cluster, fallback to first 4 chars.
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
      for (const { segment } of seg.segment(trimmed)) {
        if (/\p{Extended_Pictographic}/u.test(segment)) return segment;
      }
      return '';
    }
  } catch {}
  // Fallback: take first cluster up to 8 chars
  return trimmed.slice(0, 8);
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
  buildEmojiTabsOnce();
  renderEmojiGrid();
}
function closeEmojiPicker() {
  if (!emojiPicker) return;
  emojiPicker.hidden = true;
  if (emojiBtn) emojiBtn.setAttribute('aria-expanded', 'false');
  if (emojiSearch) emojiSearch.value = '';
  if (emojiPasteInput) emojiPasteInput.value = '';
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
if (emojiPasteInput) {
  emojiPasteInput.addEventListener('click', e => e.stopPropagation());
  emojiPasteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applyPastedEmoji(); }
  });
}
if (emojiPasteBtn) {
  emojiPasteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    applyPastedEmoji();
  });
}
function applyPastedEmoji() {
  if (!emojiPasteInput) return;
  const raw = emojiPasteInput.value;
  const ext = extractFirstEmoji(raw);
  if (ext) selectEmoji(ext);
  else if (raw && raw.trim()) selectEmoji(raw.trim().slice(0, 4));
}
document.addEventListener('click', (e) => {
  if (!emojiPicker || emojiPicker.hidden) return;
  if (emojiPicker.contains(e.target) || emojiBtn.contains(e.target)) return;
  closeEmojiPicker();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && emojiPicker && !emojiPicker.hidden) closeEmojiPicker();
});

// ===== Bye section: shared community cards via Worker API =====
const BYE_API = 'https://chofesh-gadol-api.liamonaaa.workers.dev/items';
const BYE_CACHE_KEY = 'chofesh-bye-cache';
const BYE_MINE_KEY = 'chofesh-bye-mine'; // ids the current user added (so they can delete their own)
const byeGrid = document.getElementById('byeGrid');
const byeForm = document.getElementById('byeAddForm');
const byeIconInput = document.getElementById('byeIcon');
const byeTextInput = document.getElementById('byeText');
const byeAddBtn = byeForm ? byeForm.querySelector('.bye-add-btn') : null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function loadCache() {
  try { return JSON.parse(localStorage.getItem(BYE_CACHE_KEY)) || []; }
  catch { return []; }
}
function saveCache(list) {
  try { localStorage.setItem(BYE_CACHE_KEY, JSON.stringify(list)); } catch {}
}
function loadMine() {
  try { return new Set(JSON.parse(localStorage.getItem(BYE_MINE_KEY)) || []); }
  catch { return new Set(); }
}
function saveMine(set) {
  try { localStorage.setItem(BYE_MINE_KEY, JSON.stringify([...set])); } catch {}
}

async function fetchItems() {
  const res = await fetch(BYE_API, { method: 'GET' });
  if (!res.ok) throw new Error('GET failed: ' + res.status);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}
async function postItem(icon, text) {
  const res = await fetch(BYE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ icon, text }),
  });
  if (!res.ok) throw new Error('POST failed: ' + res.status);
  return (await res.json()).item;
}
async function deleteItem(id) {
  const res = await fetch(BYE_API + '/' + encodeURIComponent(id), { method: 'DELETE' });
  if (!res.ok) throw new Error('DELETE failed: ' + res.status);
  return true;
}

function renderByeExtras(list) {
  if (!byeGrid) return;
  byeGrid.querySelectorAll('.bye-card.user').forEach(n => n.remove());
  const mine = loadMine();
  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'bye-card user';
    card.dataset.id = item.id;
    const isMine = mine.has(item.id);
    card.innerHTML = `
      ${isMine ? '<button class="bye-remove" type="button" aria-label="הסר">✕</button>' : ''}
      <span class="bye-x">✕</span>
      <span class="bye-icon">${escapeHtml(item.icon || '✨')}</span>
      <span class="bye-text">${escapeHtml(item.text)}</span>
    `;
    const rm = card.querySelector('.bye-remove');
    if (rm) {
      rm.addEventListener('click', async () => {
        rm.disabled = true;
        try {
          await deleteItem(item.id);
          const next = mine; next.delete(item.id); saveMine(next);
          await refreshByeFromServer();
        } catch (err) {
          rm.disabled = false;
          console.warn('delete failed', err);
        }
      });
    }
    byeGrid.appendChild(card);
  });
}

async function refreshByeFromServer() {
  try {
    const items = await fetchItems();
    saveCache(items);
    renderByeExtras(items);
  } catch (err) {
    console.warn('fetch failed, using cache', err);
  }
}

// Initial paint: cached data instantly, then live data when ready.
renderByeExtras(loadCache());
refreshByeFromServer();

// Poll for new items so other visitors' adds show up live.
setInterval(refreshByeFromServer, 12000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshByeFromServer();
});

if (byeForm) {
  byeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = (byeTextInput.value || '').trim();
    if (!text) return;
    const icon = (byeIconInput.value || '').trim() || '✨';
    if (byeAddBtn) byeAddBtn.disabled = true;
    try {
      const item = await postItem(icon, text);
      const mine = loadMine(); mine.add(item.id); saveMine(mine);
      byeIconInput.value = '';
      byeTextInput.value = '';
      if (typeof emojiBtn !== 'undefined' && emojiBtn) emojiBtn.textContent = '🙃';
      await refreshByeFromServer();
    } catch (err) {
      console.warn('add failed', err);
      alert('שגיאה בהוספה. נסה שוב בעוד רגע.');
    } finally {
      if (byeAddBtn) byeAddBtn.disabled = false;
    }
  });
}

// ===== Sound hint overlay (first visit) =====
const SOUND_HINT_KEY = 'chofesh-sound-hint-seen';
const soundHint = document.getElementById('soundHint');
const soundHintOk = document.getElementById('shOk');
const soundHintArrowPath = document.querySelector('.sh-arrow-path');

function dismissSoundHint() {
  if (!soundHint || soundHint.hidden) return;
  soundHint.hidden = true;
  document.body.classList.remove('sh-active');
  try { localStorage.setItem(SOUND_HINT_KEY, '1'); } catch {}
}

function aimArrowAtAudio() {
  if (!soundHintArrowPath) return;
  const audioPanel = document.getElementById('audioPanel');
  const muteBtn = document.getElementById('apMute');
  const target = muteBtn || audioPanel;
  if (!target) return;
  const r = target.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw === 0 || vh === 0) return;
  // viewBox is 600x600, preserveAspectRatio="none" → x scales by 600/vw, y by 600/vh.
  const tx = ((r.left + r.width / 2) / vw) * 600;
  const ty = ((r.top + r.height / 2) / vh) * 600;
  // Start near center-card bottom, curve down-left toward target.
  const sx = 320, sy = 240;
  const cx = (sx + tx) / 2 - 60;
  const cy = (sy + ty) / 2 + 40;
  // Stop arrowhead just shy of target so it points AT the button.
  const dx = tx - sx, dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  const back = 30;
  const ex = tx - (dx / len) * back;
  const ey = ty - (dy / len) * back;
  soundHintArrowPath.setAttribute('d', `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`);
}

if (soundHint) {
  let seen = false;
  try { seen = localStorage.getItem(SOUND_HINT_KEY) === '1'; } catch {}
  if (!seen) {
    soundHint.hidden = false;
    document.body.classList.add('sh-active');
    aimArrowAtAudio();
    window.addEventListener('resize', aimArrowAtAudio);
    // Dismiss on OK click.
    if (soundHintOk) soundHintOk.addEventListener('click', dismissSoundHint);
    // Dismiss on backdrop click.
    soundHint.querySelector('.sh-backdrop')?.addEventListener('click', dismissSoundHint);
    // Dismiss when user clicks the audio mute button.
    document.getElementById('apMute')?.addEventListener('click', dismissSoundHint, { once: false });
    // Dismiss on Escape.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !soundHint.hidden) dismissSoundHint();
    });
  }
}

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
