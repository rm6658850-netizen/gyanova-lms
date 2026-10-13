/* Gyanova Educations – frontend (vanilla JS single-page app) */
const WA_NUMBER = '919684026097';
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hello, mujhe courses ke baare mein jaanna hai')}`;
const CONTACT_EMAIL = 'govindsurywanshi02@gmail.com';

const WA_ICO = '<svg class="wico" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12.04 2.2a9.8 9.8 0 0 0-8.4 14.8L2.2 21.8l5-1.3A9.8 9.8 0 1 0 12.04 2.2zm0 1.9a7.9 7.9 0 1 1-4.1 14.6l-.3-.2-2.4.6.7-2.3-.2-.3A7.9 7.9 0 0 1 12.04 4.1zM8.9 7.5c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9 2.2.9 2.6.7 3.1.7.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.4l-1.8-.9c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.4-1.8-.2-.3 0-.4.1-.5l.4-.5.3-.4c.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.4-.5-.6-.5z"/></svg>';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const S = { user: null, cfg: {}, cats: [], cart: JSON.parse(localStorage.getItem('dg_cart') || '[]') };
const saveCart = () => { localStorage.setItem('dg_cart', JSON.stringify(S.cart)); renderTop(); };
const FEST = {
  sale: ['🔥', 'Special offer'], winter: ['❄️', 'Winter'], summer: ['☀️', 'Summer'], diwali: ['🪔', 'Diwali'], holi: ['🎨', 'Holi'], newyear: ['🎆', 'New Year'], independence: ['🇮🇳', 'Independence Day'],
  dussehra: ['🏹', 'Dussehra'], eid: ['🌙', 'Eid'], christmas: ['🎄', 'Christmas'], raksha: ['🪢', 'Raksha Bandhan']
};
const DECO = {
  winter: ['❄️', '⛄', '🧣', '☕'], summer: ['☀️', '🍉', '🕶️', '🍦'], diwali: ['🪔', '🎆', '🪔', '✨'], holi: ['🎨', '🌈', '🎈', '🎨'],
  newyear: ['🎆', '🥂', '🎉', '✨'], independence: ['🇮🇳', '🎉', '🇮🇳', '✨'], dussehra: ['🏹', '🔥', '🪔', '✨'], eid: ['🌙', '⭐', '🌙', '✨'],
  christmas: ['🎄', '🎅', '🎁', '❄️'], raksha: ['🪢', '🎁', '🪔', '✨'], sale: ['🔥', '🎁', '⭐', '✨']
};
const TILES = [['📈', '#2F5BFF'], ['📣', '#E8431F'], ['🔎', '#0F9D58'], ['💻', '#7A4DFF'], ['🎨', '#F59E0B'], ['🤖', '#0EA5E9'], ['📱', '#EC4899'], ['💬', '#25D366'], ['🎓', '#161B4A']];
async function loadOffer() {
  try { const r = await api('/offer'); S.offer = r.offer; S.offset = r.now - Date.now(); } catch { S.offer = null; }
  renderOfferBar();
}
function renderOfferBar() {
  const o = S.offer, el = $('#offerbar'); if (!el) return;
  if (!o) { el.innerHTML = ''; return; }
  el.innerHTML = `<a class="offerbar th-${esc(o.festival)}" href="#/courses"><span>${FEST[o.festival]?.[0] || '🔥'} <b>${esc(o.title)}</b>${o.percent ? ` · Extra ${o.percent}% OFF` : ''}${o.code ? ` · Code <u>${esc(o.code)}</u>` : ''}</span><span class="obt">Ends in <b data-cd="${esc(o.end_at)}">…</b></span></a>`;
  tick();
}
function tick() {
  const now = Date.now() + (S.offset || 0), p = n => String(n).padStart(2, '0');
  document.querySelectorAll('[data-cd]').forEach(el => {
    const ms = Date.parse(el.dataset.cd) - now;
    if (ms <= 0) { if (!el.dataset.done) { el.dataset.done = 1; loadOffer().then(() => { if (!location.hash || location.hash === '#/') route(); }); } return; }
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), sec = Math.floor(ms % 6e4 / 1e3);
    const u = el.querySelectorAll('[data-u]');
    if (u.length) { const v = { d: p(d), h: p(h), m: p(m), s: p(sec) }; u.forEach(x => { x.textContent = v[x.dataset.u]; }); }
    else el.textContent = `${d ? d + 'd ' : ''}${p(h)}h ${p(m)}m ${p(sec)}s`;
  });
}
function copyText(t) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(t).catch(() => {});
  const i = document.createElement('input'); i.value = t; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); } catch { /* ignore */ } i.remove();
}

async function api(path, opts = {}) {
  const r = await fetch('/api' + path, {
    method: opts.method || 'GET', credentials: 'same-origin',
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  let j = {}; try { j = await r.json(); } catch { /* no body */ }
  if (!r.ok) { const e = new Error(j.error || 'Something went wrong. Please try again.'); e.status = r.status; throw e; }
  return j;
}
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
const go = h => { location.hash = h; };
const view = html => { $('#app').innerHTML = html; window.scrollTo(0, 0); };
const on = (sel, ev, fn) => { const el = typeof sel === 'string' ? $(sel) : sel; if (el) el.addEventListener(ev, fn); };
const pct = c => c.mrp > c.price ? Math.round((c.mrp - c.price) * 100 / c.mrp) : 0;
const ICO = {
  search: '<svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  cart: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.5a2 2 0 0 0 2 1.5h7.6a2 2 0 0 0 2-1.5L20 8H6"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>',
  menu: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
};
const hrs = m => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + 'm' : ''}`.trim() : (m ? m + ' min' : '');

/* ---------- shared pieces ---------- */
function thumb(c, cls = '') {
  const bg = `linear-gradient(135deg,${esc(c.thumb_color)},#161B4A)`;
  const img = c.thumb_url ? `<img src="${esc(c.thumb_url)}" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : '';
  return `<div class="thumb ${cls}" style="background:${bg}">${c.thumb_url ? '' : `<span class="ti">${esc(c.thumb_icon)}</span>`}${img}${cls ? '' : `<span class="lv">${esc(c.level)}</span>`}</div>`;
}
function courseCard(c) {
  const off = pct(c);
  const dur = hrs(c.total_minutes) || c.duration_text;
  return `<a class="card" href="#/course/${esc(c.slug)}">${thumb(c)}
    <div class="body"><h3>${esc(c.title)}</h3>
    <div class="meta">▶ ${c.lesson_count} ${c.lesson_count === 1 ? 'Lesson' : 'Lessons'}${dur ? ' · ' + esc(dur) : ''}</div>
    <p class="d">${esc(c.short_desc)}</p>
    <div class="price"><b>${c.price ? inr(c.price) : 'Free'}</b>${c.mrp > c.price ? `<s>${inr(c.mrp)}</s>` : ''}</div>
    ${off ? `<span class="offbadge">${off}% OFF – limited time</span>` : ''}</div></a>`;
}
function bundleCard(b) {
  const n = b.courses.length, save = b.mrp - b.price, off = b.mrp > b.price ? Math.round(save * 100 / b.mrp) : 0;
  const shown = b.courses.slice(0, 4);
  return `<article class="deal2">
    <div class="dl"><span class="dtag">BUNDLE</span><span class="dic">${esc(b.icon)}</span>${off ? `<span class="doff">${off}% OFF</span>` : ''}</div>
    <div class="dr"><span class="dn">${n} Courses</span><h3>${esc(b.title)}</h3>
      <ul class="dlist">${shown.map(c => `<li>${esc(c.title)}</li>`).join('')}${n > shown.length ? `<li class="more">+ ${n - shown.length} more</li>` : ''}</ul>
      <div class="dfoot"><div class="dp"><b>${inr(b.price)}</b>${b.mrp > b.price ? `<s>${inr(b.mrp)}</s><em>You save ${inr(save)}</em>` : ''}</div>
        <a class="btn" href="#/bundle/${esc(b.slug)}">View Bundle →</a></div></div></article>`;
}
function renderTop() {
  const u = S.user, n = S.cart.length;
  $('#topbar').innerHTML = `<div class="wrap">
    <a class="brand" href="#/" aria-label="Gyanova Educations home"><img src="/logo-icon.png" alt="Gyanova logo"><span class="bt"><b>GYANOVA</b><small>Educations Pvt. Ltd.</small></span></a>
    <div class="explore" id="explore"><button type="button" aria-haspopup="true">${ICO.menu} Explore</button>
      <div class="dd"><a href="#/courses"><span>All courses</span></a>${S.cats.map(c => `<a href="#/courses?category=${encodeURIComponent(c.name)}"><span>${esc(c.name)}</span><span>${c.n}</span></a>`).join('')}</div></div>
    <form class="search" id="sf" role="search"><input name="q" placeholder="What do you want to learn today?" aria-label="Search courses" autocomplete="off"><button aria-label="Search">${ICO.search}</button></form>
    <nav class="nav-right">
      <a class="cart" href="#/cart" aria-label="Cart">${ICO.cart}${n ? `<b>${n}</b>` : ''}</a>
      ${u ? `${u.role === 'admin' ? '<a href="#/admin">Admin</a>' : ''}<a href="#/my">My Learning</a><a href="#" id="logout">Logout</a>`
        : `<a href="#/login">Log in</a><a class="nav-btn" href="#/register">Sign up</a>`}
    </nav></div>
    <div class="mobile-search"><form class="search" id="sf2" role="search"><input name="q" placeholder="Search courses" aria-label="Search courses"><button aria-label="Search">${ICO.search}</button></form></div>`;
  for (const id of ['#sf', '#sf2']) on(id, 'submit', e => { e.preventDefault(); const q = new FormData(e.target).get('q').trim(); if (q) go('#/courses?q=' + encodeURIComponent(q)); });
  on('#explore button', 'click', () => $('#explore').classList.toggle('open'));
  on('#logout', 'click', async e => { e.preventDefault(); await api('/auth/logout', { method: 'POST' }); S.user = null; renderTop(); toast('Logged out'); go('#/'); });
}
function renderFooter() {
  $('#footer').innerHTML = `<div class="wrap"><div class="cols">
    <div><img class="flogo" src="/logo.png" alt="Gyanova Educations Pvt. Ltd.">
      <p>Job-ready digital skills taught in simple Hindi. Learn live, practice real tasks and earn a certificate.</p></div>
    <div><h4>Explore</h4><a href="#/courses">All courses</a><a href="#/my">My Learning</a><a href="#/cart">Cart</a></div>
    <div><h4>Contact</h4><a href="${WA_LINK}" target="_blank" rel="noopener">${WA_ICO} WhatsApp: +91 96840 26097</a><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></div>
    </div><div class="copy">© ${new Date().getFullYear()} Gyanova Educations Pvt. Ltd. All rights reserved.</div></div>
    <a class="fab" href="${WA_LINK}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${WA_ICO}</a>`;
}

/* ---------- catalog block (category tabs + best sellers/trending/latest) ---------- */
function catalogBlock(el, { category = '', q = '', showTabs = true }) {
  const st = { category, sort: 'best' };
  async function draw() {
    const qs = new URLSearchParams({ sort: st.sort }); if (st.category) qs.set('category', st.category); if (q) qs.set('q', q);
    const list = await api('/courses?' + qs);
    el.innerHTML = `${showTabs ? `<div class="cat-tabs">
        <a href="#" data-c="" class="${!st.category ? 'on' : ''}">All</a>${S.cats.map(c => `<a href="#" data-c="${esc(c.name)}" class="${st.category === c.name ? 'on' : ''}">${esc(c.name)}</a>`).join('')}</div>` : ''}
      <div class="sub-tabs">${[['best', 'Best Sellers'], ['trending', 'Trending'], ['latest', 'Latest']].map(([k, t]) => `<button data-s="${k}" class="${st.sort === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      ${list.length ? `<div class="grid">${list.map(courseCard).join('')}</div>` : '<div class="empty">No courses found. Try another category or search.</div>'}`;
    el.querySelectorAll('[data-c]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); st.category = a.dataset.c; draw(); }));
    el.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => { st.sort = b.dataset.s; draw(); }));
  }
  draw();
}

/* ---------- pages ---------- */
async function pHome() {
  await loadOffer();
  const [bundles, list] = await Promise.all([api('/bundles'), api('/courses?sort=best')]);
  const feat = list.find(c => c.slug === 'digital-marketing-professional-course') || list[0];
  const o = S.offer, fe = o ? (FEST[o.festival] || FEST.sale) : null;
  const stats = '<ul class="hstats"><li><b>Live</b><span>Classes + doubt support</span></li><li><b>Hindi</b><span>Simple teaching</span></li><li><b>Practical</b><span>Templates & tasks</span></li><li><b>Certificate</b><span>On completion</span></li></ul>';
  const wa = `<a class="btn glass" href="${WA_LINK}" target="_blank" rel="noopener">${WA_ICO} Talk to us on WhatsApp</a>`;
  const dc = o ? (DECO[o.festival] || DECO.sale) : [];
  const cta = o ? esc(o.cta_text || 'Claim offer') : '';
  const sub = o ? (o.subtitle || (o.percent ? `Extra ${o.percent}% OFF on every course and bundle.` : '')) : '';
  const hero = o ? `<section class="sale th-${esc(o.festival)}">
      <svg class="waves" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true"><path d="M0 120C200 40 380 170 560 95S900 15 1200 110"/><path d="M0 335C220 255 430 385 650 310S980 250 1200 325"/></svg>
      <span class="deco d1">${dc[0]}</span><span class="deco d2">${dc[1]}</span><span class="deco d3">${dc[2]}</span><span class="deco d4">${dc[3]}</span>
      <div class="tiles" aria-hidden="true">${TILES.map(([e, col]) => `<span class="tile" style="background:linear-gradient(145deg,${col},#161B4A)">${e}</span>`).join('')}</div>
      <div class="wrap"><div class="salecard">
        <p class="tag">${esc(o.tagline || 'Learn More, Pay Less')}</p>
        <h1>${esc(o.title)}</h1><i class="rule"></i>
        ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
        <button class="btn big" id="claim">${cta} →</button>
        <div class="mini">${o.percent ? `<span class="mp"><b>${o.percent}%</b> EXTRA OFF</span>` : ''}
          ${o.code ? `<div class="code"><span>Use code</span><b>${esc(o.code)}</b><button type="button" id="copy">Copy</button></div>` : ''}</div>
        <div class="cdl">Offer ends in</div>
        <div class="cdbox sm" data-cd="${esc(o.end_at)}"><span><b data-u="d">00</b>Days</span><span><b data-u="h">00</b>Hrs</span><span><b data-u="m">00</b>Min</span><span><b data-u="s">00</b>Sec</span></div>
      </div></div></section>
      <div class="wrap perks"><div><i>📡</i><b>Live classes</b><span>+ doubt support</span></div><div><i>🗣️</i><b>Hindi</b><span>Simple teaching</span></div><div><i>🛠️</i><b>Practical</b><span>Templates & tasks</span></div><div><i>🏅</i><b>Certificate</b><span>On completion</span></div></div>`
    : `<section class="hero"><div class="blob b1"></div><div class="blob b2"></div><div class="wrap">
      <div class="hl"><span class="pill"><i class="dot"></i> New batches open · Live classes in Hindi</span>
        <h1>Learn digital skills that <em>get you hired</em> or grow your business</h1>
        <p>Digital marketing, web and design courses for students, business owners and freelancers. Start from zero, practice real tasks and get a certificate.</p>
        <div class="cta"><a class="btn" href="#/courses">Explore courses</a>${wa}</div>${stats}</div>
      ${feat ? `<div class="hr"><a class="fcard" href="#/course/${esc(feat.slug)}">
        <div class="ftop" style="background:linear-gradient(135deg,${esc(feat.thumb_color)},#161B4A)"><span class="ficon">${esc(feat.thumb_icon)}</span><small>Featured course</small><h3>${esc(feat.title)}</h3></div>
        <div class="fbody"><ul><li>Live classes in Hindi</li><li>Templates and practical tasks</li><li>Doubt support + certificate</li></ul><span class="btn block">See the course →</span></div></a>
        <div class="chip c1">📡 Live classes</div><div class="chip c2">🏅 Certificate</div></div>` : ''}</div></section>`;
  view(`${hero}
    ${bundles.length ? `<section class="section"><div class="wrap"><div class="head-row"><div><h2>Mighty Deals</h2><p class="hint" style="margin:6px 0 0">Buy courses together and save more.</p></div></div><div class="deals">${bundles.map(bundleCard).join('')}</div></div></section>` : ''}
    <section class="section"><div class="wrap"><h2 class="title">Course Categories</h2><div id="cb"></div>
      <p style="text-align:center;margin-top:26px"><a class="btn blue" href="#/courses">View all courses</a></p></div></section>
    <section class="section steps"><div class="wrap"><h2 class="title" style="text-align:center">How it works</h2><div class="stp">
      <div><i>1</i><h4>Choose a course</h4><p>Pick the skill you want to learn.</p></div>
      <div><i>2</i><h4>Pay securely</h4><p>UPI, card or net banking.</p></div>
      <div><i>3</i><h4>Join live classes</h4><p>Learn live and clear doubts.</p></div>
      <div><i>4</i><h4>Get certified</h4><p>Finish lessons, download certificate.</p></div></div></div></section>
    <section class="section why"><div class="wrap"><h2 class="title">Why learn with Gyanova?</h2><div class="grid">
      <div class="it"><i>🗣️</i><h4>Hindi (Hinglish) teaching</h4><p>Simple language so everyone understands.</p></div>
      <div class="it"><i>📡</i><h4>Live classes + doubt support</h4><p>Learn live and get your doubts solved.</p></div>
      <div class="it"><i>🛠️</i><h4>Practical tasks</h4><p>Templates and projects, not just theory.</p></div>
      <div class="it"><i>🏅</i><h4>Completion certificate</h4><p>Finish all lessons and download your certificate.</p></div></div></div></section>`);
  catalogBlock($('#cb'), {});
  const claim = () => {
    if (o?.code) { localStorage.setItem('dg_coupon', o.code); toast(`Code ${o.code} saved. It will be applied at checkout.`); }
    go('#/courses');
  };
  on('#claim', 'click', claim); on('#claim2', 'click', claim);
  on('#copy', 'click', () => { copyText(o.code); toast('Code copied: ' + o.code); });
  tick();
}

async function pCourses(q) {
  const title = q.q ? `Results for “${esc(q.q)}”` : q.category ? esc(q.category) : 'All Courses';
  view(`<section class="section"><div class="wrap"><h2 class="title">${title}</h2><div id="cb"></div></div></section>`);
  catalogBlock($('#cb'), { category: q.category || '', q: q.q || '', showTabs: !q.q });
}

const KIND = { video: '🎥', live: '📡', note: '📄' };
async function pCourse(slug) {
  const c = await api('/courses/' + slug);
  const off = pct(c), inCart = S.cart.some(i => i.type === 'course' && i.slug === slug);
  const learn = c.description.split('\n').map(s => s.trim()).filter(Boolean);
  const buy = c.enrolled
    ? `<a class="btn blue block" href="#/learn/${esc(c.slug)}">Go to course →</a>`
    : `<button class="btn block" id="buy">${c.price ? 'Buy now' : 'Enroll for free'}</button>${c.price ? `<button class="btn ghost block" id="add">${inCart ? '✓ In cart' : 'Add to cart'}</button>` : ''}`;
  view(`<section class="detail-head"><div class="wrap"><div>
      <div class="crumbs"><a href="#/">Home</a> / <a href="#/courses?category=${encodeURIComponent(c.category)}">${esc(c.category)}</a></div>
      <h1>${esc(c.title)}</h1><p>${esc(c.short_desc)}</p>
      <div class="chips"><span>👤 ${esc(c.instructor)}</span><span>🎯 ${esc(c.level)}</span><span>🗣️ ${esc(c.language)}</span>${c.duration_text ? `<span>⏱️ ${esc(c.duration_text)}</span>` : ''}<span>▶ ${c.lesson_count} lessons</span>${c.students ? `<span>🎓 ${c.students} students</span>` : ''}</div></div>
      <aside class="buybox">${thumb(c, 'x')}<div><span class="big">${c.price ? inr(c.price) : 'Free'}</span>${c.mrp > c.price ? `<s>${inr(c.mrp)}</s>` : ''}</div>
        ${off ? `<div class="offbadge" style="margin:8px 0">${off}% OFF – limited time</div>` : ''}${buy}
        <a class="btn wa block" style="margin-top:10px" href="${WA_LINK}" target="_blank" rel="noopener">${WA_ICO} Ask on WhatsApp</a>
        <ul><li>✓ Live classes with doubt support</li><li>✓ Templates and practical tasks</li><li>✓ Completion certificate</li></ul></aside></div></section>
    <div class="wrap detail-body"><div>
      <div class="box"><h2>What you will learn</h2><ul class="ticks">${learn.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>
      <div class="box"><h2>Course content</h2>${c.live_schedule ? `<p class="hint">📡 ${esc(c.live_schedule)}</p>` : ''}
        <ul class="curr">${c.lessons.map(l => `<li><span class="k">${KIND[l.kind] || '🎥'}</span><span>${esc(l.title)}</span>${l.minutes ? `<span class="m">${hrs(l.minutes)}</span>` : ''}</li>`).join('') || '<li>Lessons coming soon.</li>'}</ul></div>
    </div><div></div></div>`);
  on('#add', 'click', () => { if (!S.cart.some(i => i.type === 'course' && i.slug === slug)) S.cart.push({ type: 'course', slug }); saveCart(); $('#add').textContent = '✓ In cart'; toast('Added to cart'); });
  on('#buy', 'click', () => { if (!S.cart.some(i => i.type === 'course' && i.slug === slug)) S.cart.push({ type: 'course', slug }); saveCart(); go('#/cart'); });
}

async function pBundle(slug) {
  const b = await api('/bundles/' + slug), inCart = S.cart.some(i => i.type === 'bundle' && i.slug === slug);
  view(`<section class="detail-head"><div class="wrap"><div><div class="crumbs"><a href="#/">Home</a> / Mighty Deals</div>
    <h1>${esc(b.icon)} ${esc(b.title)}</h1><p>Get ${b.courses.length} courses together and save more.</p></div>
    <aside class="buybox"><div><span class="big">${inr(b.price)}</span>${b.mrp > b.price ? `<s>${inr(b.mrp)}</s>` : ''}</div>
      ${b.enrolledAll ? '<a class="btn blue block" href="#/my">Already yours – open My Learning</a>' : `<button class="btn block" id="buy">Buy bundle</button><button class="btn ghost block" id="add">${inCart ? '✓ In cart' : 'Add to cart'}</button>`}</aside></div></section>
    <div class="wrap section"><h2 class="title">Courses in this bundle</h2><div class="grid">${b.courses.map(courseCard).join('')}</div></div>`);
  const add = () => { if (!S.cart.some(i => i.type === 'bundle' && i.slug === slug)) S.cart.push({ type: 'bundle', slug }); saveCart(); };
  on('#add', 'click', () => { add(); $('#add').textContent = '✓ In cart'; toast('Added to cart'); });
  on('#buy', 'click', () => { add(); go('#/cart'); });
}

/* ---------- cart & checkout ---------- */
async function pCart() {
  const lines = [];
  for (const it of S.cart) {
    try {
      const d = await api(`/${it.type === 'bundle' ? 'bundles' : 'courses'}/${it.slug}`);
      lines.push({ it, title: d.title, price: d.price, icon: d.thumb_icon || d.icon, color: d.thumb_color || '#1F57D6', url: d.thumb_url, sub: it.type === 'bundle' ? `Bundle · ${d.courses.length} courses` : d.category });
    } catch { /* removed course */ }
  }
  S.cart = lines.map(l => l.it); localStorage.setItem('dg_cart', JSON.stringify(S.cart)); renderTop();
  const total = lines.reduce((s, l) => s + l.price, 0);
  let code = (localStorage.getItem('dg_coupon') || '').toUpperCase(), pct = 0;
  if (code) { try { pct = (await api('/coupon/' + encodeURIComponent(code))).percent; } catch { localStorage.removeItem('dg_coupon'); code = ''; } }
  S.coupon = pct ? code : '';
  const discount = Math.floor(total * pct / 100), payable = total - discount;
  view(`<div class="wrap cart-wrap"><div><h1 style="margin-bottom:10px">Shopping cart</h1>
    ${lines.length ? lines.map((l, i) => `<div class="cart-item">${thumb({ thumb_color: l.color, thumb_icon: l.icon, thumb_url: l.url }, 'x')}
      <div><h4>${esc(l.title)}</h4><span class="hint">${esc(l.sub)}</span></div><b style="margin-left:auto">${inr(l.price)}</b><button class="x" data-i="${i}">Remove</button></div>`).join('')
      : '<div class="empty">Your cart is empty. <a class="link" href="#/courses">Browse courses</a></div>'}</div>
    ${lines.length ? `<aside class="summary"><div class="sr"><span>Subtotal</span><span>${inr(total)}</span></div>
      ${pct ? `<div class="sr off"><span>Coupon ${esc(code)} (−${pct}%) <button class="x" id="rmc" type="button">remove</button></span><span>−${inr(discount)}</span></div>` : ''}
      <div class="t"><span>Total</span><span>${inr(payable)}</span></div>
      ${pct ? '' : '<form id="cf" class="cform"><input name="c" placeholder="Have a coupon code?" aria-label="Coupon code" autocomplete="off"><button class="btn sm blue">Apply</button></form>'}
      <div id="cerr"></div><button class="btn block" id="pay">${S.user ? (payable ? 'Pay securely' : 'Enroll now') : 'Log in to checkout'}</button>
      <p class="hint" style="margin-top:12px">UPI, cards and net banking supported. You get instant access after payment.</p></aside>` : ''}</div>`);
  document.querySelectorAll('.x[data-i]').forEach(b => b.addEventListener('click', () => { S.cart.splice(+b.dataset.i, 1); saveCart(); pCart(); }));
  on('#pay', 'click', checkout);
  on('#rmc', 'click', () => { localStorage.removeItem('dg_coupon'); pCart(); });
  on('#cf', 'submit', async e => {
    e.preventDefault(); const c = new FormData(e.target).get('c').trim().toUpperCase(); if (!c) return;
    try { await api('/coupon/' + encodeURIComponent(c)); localStorage.setItem('dg_coupon', c); toast('Coupon applied'); pCart(); }
    catch (er) { $('#cerr').innerHTML = `<div class="err">${esc(er.message)}</div>`; }
  });
}

function loadRazorpay() {
  return new Promise((ok, no) => {
    if (window.Razorpay) return ok();
    const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = ok; s.onerror = () => no(new Error('Could not load the payment window. Check your internet.')); document.head.appendChild(s);
  });
}
async function checkout() {
  if (!S.user) return go('#/login?next=cart');
  const btn = $('#pay'), err = $('#cerr'); btn.disabled = true; err.innerHTML = '';
  const done = () => { S.cart = []; localStorage.removeItem('dg_coupon'); saveCart(); toast('🎉 Enrolled! Your course is ready.'); go('#/my'); };
  try {
    const o = await api('/checkout', { method: 'POST', body: { items: S.cart, coupon: S.coupon || '' } });
    if (o.mode === 'free') return done();
    if (o.mode === 'demo') {
      if (!confirm(`DEMO MODE – no real payment.\nConfirm test payment of ${inr(o.amount)}?`)) { btn.disabled = false; return; }
      await api('/checkout/demo-confirm', { method: 'POST', body: { orderId: o.orderId } }); return done();
    }
    await loadRazorpay();
    new window.Razorpay({
      key: o.key, amount: o.amount * 100, currency: 'INR', name: 'Gyanova Educations', description: 'Course enrollment',
      order_id: o.razorpayOrderId, prefill: { name: o.name, email: o.email, contact: o.phone || '' }, theme: { color: '#1F57D6' },
      handler: async r => {
        try { await api('/checkout/verify', { method: 'POST', body: { orderId: o.orderId, ...r } }); done(); }
        catch (e) { err.innerHTML = `<div class="err">${esc(e.message)} If money was deducted, WhatsApp us with your payment ID.</div>`; btn.disabled = false; }
      },
      modal: { ondismiss: () => { btn.disabled = false; } }
    }).open();
  } catch (e) { err.innerHTML = `<div class="err">${esc(e.message)}</div>`; btn.disabled = false; }
}

/* ---------- auth ---------- */
function pAuth(mode, q) {
  const reg = mode === 'register';
  view(`<div class="auth"><h1>${reg ? 'Create your account' : 'Welcome back'}</h1><p class="sub">${reg ? 'Sign up to buy courses and start learning.' : 'Log in to continue learning.'}</p>
    <div id="aerr"></div><form id="af">
      ${reg ? '<div class="field"><label>Full name</label><input name="name" required autocomplete="name"></div>' : ''}
      <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email"></div>
      ${reg ? '<div class="field"><label>Mobile / WhatsApp number</label><input name="phone" inputmode="tel" autocomplete="tel"></div>' : ''}
      <div class="field"><label>Password</label><input name="password" type="password" required minlength="6" autocomplete="${reg ? 'new-password' : 'current-password'}"></div>
      <button class="btn block" id="asub">${reg ? 'Sign up' : 'Log in'}</button></form>
    <p class="hint" style="margin-top:14px;text-align:center">${reg ? 'Already registered? <a class="link" href="#/login">Log in</a>' : 'New here? <a class="link" href="#/register">Create an account</a>'}</p></div>`);
  on('#af', 'submit', async e => {
    e.preventDefault(); const b = $('#asub'); b.disabled = true;
    try {
      const { user } = await api('/auth/' + mode, { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
      S.user = user; renderTop(); toast(`Welcome, ${user.name.split(' ')[0]}!`); go('#/' + (q.next || (user.role === 'admin' ? 'admin' : 'my')));
    } catch (er) { $('#aerr').innerHTML = `<div class="err">${esc(er.message)}</div>`; b.disabled = false; }
  });
}

/* ---------- my learning & player ---------- */
async function pMy() {
  const list = await api('/my/courses');
  view(`<div class="wrap section"><h1 style="margin-bottom:6px">My Learning</h1><p class="hint" style="margin-bottom:22px">Hi ${esc(S.user.name)}, continue where you left off.</p>
    ${list.length ? `<div class="grid">${list.map(c => `<div class="card">${thumb(c)}<div class="body"><h3>${esc(c.title)}</h3>
      <div class="pbar"><i style="width:${c.progress.percent}%"></i></div><div class="meta">${c.progress.done}/${c.progress.total} lessons · ${c.progress.percent}%</div>
      <a class="btn blue sm" style="margin-top:8px" href="#/learn/${esc(c.slug)}">${c.progress.percent ? 'Continue' : 'Start learning'}</a></div></div>`).join('')}</div>`
      : '<div class="empty">You have not enrolled in any course yet.<br><br><a class="btn" href="#/courses">Browse courses</a></div>'}</div>`);
}

function embed(url) {
  if (!url) return '<div style="padding:30px;text-align:center">Video will be added soon.</div>';
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([\w-]{11})/);
  if (yt) return `<iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Lesson video"></iframe>`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `<iframe src="https://player.vimeo.com/video/${vm[1]}" allow="fullscreen; picture-in-picture" allowfullscreen title="Lesson video"></iframe>`;
  if (/\.mp4(\?|$)/i.test(url)) return `<video controls controlsList="nodownload" src="${esc(url)}"></video>`;
  return `<div style="padding:30px;text-align:center"><a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Open lesson ↗</a></div>`;
}
async function pLearn(slug) {
  const c = await api('/my/courses/' + slug);
  let cur = Math.max(0, c.lessons.findIndex(l => !l.done));
  function draw() {
    const l = c.lessons[cur], p = c.progress;
    let stage;
    if (!l) stage = '<div class="live-card"><h2>No lessons yet</h2><p>Lessons will appear here soon.</p></div>';
    else if (l.kind === 'live') {
      const link = l.url || c.live_link;
      stage = `<div class="live-card"><h2>📡 ${esc(l.title)}</h2><p>${esc(c.live_schedule || 'Live class')}</p>
        ${link ? `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Join live class ↗</a><p class="hint" style="color:#d5def7;margin-top:12px">Missed the class? Ask for the recording in the doubt group.</p>`
          : '<p>The live class link will be shared here by your instructor.</p>'}</div>`;
    } else if (l.kind === 'note') stage = `<div class="live-card"><h2>📄 ${esc(l.title)}</h2>${l.url ? `<p><a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">Open notes ↗</a></p>` : '<p>Notes will be added soon.</p>'}</div>`;
    else stage = `<div class="screen">${embed(l.url)}</div>`;
    view(`<div class="player"><div class="stage"><div class="crumbs" style="color:var(--mute)"><a href="#/my">← My Learning</a></div>
      <h2 style="margin-bottom:14px">${esc(c.title)}</h2>${stage}
      ${l ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button class="btn ${l.done ? 'ghost' : ''}" id="mark">${l.done ? '✓ Completed (tap to undo)' : 'Mark as complete'}</button>
        ${cur < c.lessons.length - 1 ? '<button class="btn blue" id="next">Next lesson →</button>' : ''}
        ${p.percent === 100 ? `<a class="btn" style="background:var(--green)" href="#/certificate/${esc(c.slug)}">🏅 Get certificate</a>` : ''}</div>` : ''}</div>
      <aside class="side"><h3>Course content</h3><div class="pbar"><i style="width:${p.percent}%"></i></div>
        ${c.lessons.map((x, i) => `<button class="lesson ${i === cur ? 'on' : ''} ${x.done ? 'done' : ''}" data-i="${i}"><span class="ck">${x.done ? '✓' : ''}</span><span>${KIND[x.kind] || ''} ${esc(x.title)}</span></button>`).join('')}</aside></div>`);
    document.querySelectorAll('.lesson').forEach(b => b.addEventListener('click', () => { cur = +b.dataset.i; draw(); }));
    on('#next', 'click', () => { cur++; draw(); });
    on('#mark', 'click', async () => {
      const r = await api(`/my/lessons/${l.id}/toggle`, { method: 'POST' });
      l.done = r.done; c.progress = r.progress;
      if (r.done && cur < c.lessons.length - 1) cur++;
      if (r.progress.percent === 100 && r.done) toast('🎉 Course completed! Your certificate is ready.');
      draw();
    });
  }
  draw();
}

async function pCert(slug) {
  try {
    const d = await api('/my/certificate/' + slug);
    view(`<div class="wrap"><div class="cert"><img src="/logo.png" alt="Gyanova"><h1>Certificate of Completion</h1><p>This is to certify that</p>
      <div class="nm">${esc(d.name)}</div><p>has successfully completed the course</p><h2>${esc(d.title || d.course)}</h2>
      <p class="hint">${esc(d.duration || '')}</p><p style="margin-top:26px">Date: ${esc((d.date || '').slice(0, 10))} &nbsp;·&nbsp; Certificate ID: <b>${esc(d.certId)}</b></p>
      <p><b>Gyanova Educations Pvt. Ltd.</b></p></div><p class="noprint" style="text-align:center"><button class="btn" onclick="print()">🖨️ Print / Save as PDF</button></p></div>`);
  } catch (e) { view(`<div class="wrap section"><div class="empty">${esc(e.message)}<br><br><a class="btn" href="#/learn/${esc(slug)}">Back to course</a></div></div>`); }
}

/* ---------- admin ---------- */
async function pAdmin(q) {
  const tab = q.tab || 'dash';
  const tabs = [['dash', 'Dashboard'], ['courses', 'Courses'], ['students', 'Students'], ['orders', 'Orders'], ['bundles', 'Bundles'], ['offers', 'Offers']];
  const head = `<div class="wrap section"><h1 style="margin-bottom:14px">Admin panel</h1><div class="tabs">${tabs.map(([k, t]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`).join('')}</div><div id="ab"></div></div>`;
  view(head);
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => go('#/admin?tab=' + b.dataset.t)));
  const box = $('#ab');
  const table = (cols, rows) => `<div class="tbl-wrap"><table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${cols.length}">Nothing here yet.</td></tr>`}</tbody></table></div>`;

  if (tab === 'dash') {
    const s = await api('/admin/stats');
    box.innerHTML = `<div class="stats"><div class="stat"><b>${s.students}</b>Students</div><div class="stat"><b>${s.courses}</b>Courses</div>
      <div class="stat"><b>${s.enrollments}</b>Enrollments</div><div class="stat"><b>${inr(s.revenue)}</b>Revenue (real payments)</div>
      ${s.demoRevenue ? `<div class="stat"><b>${inr(s.demoRevenue)}</b>Demo / test payments</div>` : ''}</div>
      <p class="hint">Tip: add the live class (Google Meet / Zoom) link inside each course so only enrolled students can see it.</p>`;
  }
  if (tab === 'courses') {
    const list = await api('/admin/courses');
    box.innerHTML = `<p><a class="btn sm" href="#/admin?tab=edit">+ New course</a></p><br>` + table(['Course', 'Category', 'Price', 'Students', 'Status', ''],
      list.map(c => `<tr><td><b>${esc(c.title)}</b><br><span class="hint">${c.lesson_count} lessons</span></td><td>${esc(c.category)}</td><td>${inr(c.price)}</td><td>${c.students}</td>
        <td><span class="tag ${c.published ? '' : 'off'}">${c.published ? 'Published' : 'Hidden'}</span></td>
        <td><a class="btn sm ghost" href="#/admin?tab=edit&id=${c.id}">Edit</a> <button class="btn sm ghost" data-del="${c.id}" style="color:var(--red);border-color:var(--red)">Delete</button></td></tr>`));
    document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete this course?')) return;
      try { await api('/admin/courses/' + b.dataset.del, { method: 'DELETE' }); toast('Deleted'); pAdmin(q); } catch (e) { toast(e.message); }
    }));
  }
  if (tab === 'edit') {
    const c = q.id ? await api('/admin/courses/' + q.id) : { title: '', category: '', short_desc: '', description: '', price: 0, mrp: 0, duration_text: '', level: 'Beginner', language: 'Hindi', instructor: 'Gyanova Team', thumb_icon: '📘', thumb_color: '#2F5BFF', thumb_url: '', live_link: '', live_schedule: '', published: 1, lessons: [] };
    const cats = (await api('/categories')).map(x => x.name);
    const f = (n, l, t = 'text', extra = '') => `<div class="field"><label>${l}</label><input name="${n}" type="${t}" value="${esc(c[n])}" ${extra}></div>`;
    box.innerHTML = `<h2 style="margin-bottom:14px">${q.id ? 'Edit course' : 'New course'}</h2><div id="eerr"></div><form id="ef">
      ${f('title', 'Course title *', 'text', 'required')}
      <div class="row2"><div class="field"><label>Category *</label><input name="category" list="cl" value="${esc(c.category)}" required><datalist id="cl">${cats.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>${f('instructor', 'Instructor')}</div>
      ${f('short_desc', 'Short description (shown on cards)')}
      <div class="field"><label>What students will learn (one point per line)</label><textarea name="description" rows="6">${esc(c.description)}</textarea></div>
      <div class="row3">${f('price', 'Selling price (₹)', 'number', 'min="0"')}${f('mrp', 'Original price / MRP (₹)', 'number', 'min="0"')}${f('duration_text', 'Duration text (e.g. 7 days)')}</div>
      <div class="row3">${f('level', 'Level')}${f('language', 'Language')}${f('thumb_icon', 'Card emoji')}</div>
      <div class="row2"><div class="field"><label>Card colour</label><input name="thumb_color" type="color" value="${esc(c.thumb_color)}"></div>${f('thumb_url', 'Thumbnail image link (optional, https://)', 'url')}</div>
      <div class="row2">${f('live_link', 'Live class link (Google Meet / Zoom, https://)', 'url')}${f('live_schedule', 'Live class schedule (e.g. Daily 7 PM)')}</div>
      <div class="field"><label>Lessons (one per line): <code>kind | title | link | minutes</code></label>
        <textarea name="lessons" rows="9" placeholder="live | Day 1: Basics | | 120&#10;video | Intro video | https://youtu.be/xxxxxxxxxxx | 12&#10;note | Day 1 notes | https://drive.google.com/...">${esc(c.lessons.map(l => [l.kind, l.title, l.url, l.minutes || ''].join(' | ')).join('\n'))}</textarea>
        <span class="hint">kind = video, live or note. Video links: YouTube (unlisted), Vimeo or direct .mp4. For live lessons leave the link empty to use the course live link.</span></div>
      <label style="display:flex;gap:8px;align-items:center;margin-bottom:16px"><input type="checkbox" name="published" ${c.published ? 'checked' : ''}> Published (visible to students)</label>
      <button class="btn" id="esub">Save course</button> <a class="btn ghost" href="#/admin?tab=courses">Cancel</a></form>`;
    on('#ef', 'submit', async e => {
      e.preventDefault(); const fd = new FormData(e.target), body = Object.fromEntries(fd);
      body.published = fd.get('published') === 'on';
      body.lessons = String(fd.get('lessons')).split('\n').map(s => s.trim()).filter(Boolean).map(line => {
        const p = line.split('|').map(x => x.trim()), k = ['video', 'live', 'note'].includes((p[0] || '').toLowerCase());
        return k ? { kind: p[0].toLowerCase(), title: p[1] || '', url: p[2] || '', minutes: p[3] || 0 } : { kind: 'video', title: p[0], url: p[1] || '', minutes: p[2] || 0 };
      });
      $('#esub').disabled = true;
      try { await api(q.id ? '/admin/courses/' + q.id : '/admin/courses', { method: q.id ? 'PUT' : 'POST', body }); toast('Saved'); go('#/admin?tab=courses'); }
      catch (er) { $('#eerr').innerHTML = `<div class="err">${esc(er.message)}</div>`; $('#esub').disabled = false; }
    });
  }
  if (tab === 'students') {
    const [list, courses] = await Promise.all([api('/admin/students'), api('/admin/courses')]);
    box.innerHTML = `<div class="box"><h2>Enroll a student manually</h2><p class="hint">Use this when a student paid by UPI/WhatsApp. They must have signed up first.</p><div id="merr"></div>
      <form id="mf" class="row3" style="align-items:end"><div class="field"><label>Student email</label><input name="email" type="email" required></div>
      <div class="field"><label>Course</label><select name="courseId">${courses.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select></div><div class="field"><button class="btn block">Enroll</button></div></form></div>`
      + table(['Name', 'Email', 'Phone', 'Joined', 'Courses'], list.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${esc(s.phone)}</td><td>${esc(s.created_at.slice(0, 10))}</td><td>${esc(s.courses || '—')}</td></tr>`));
    on('#mf', 'submit', async e => {
      e.preventDefault();
      try { await api('/admin/enroll', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast('Student enrolled'); pAdmin(q); }
      catch (er) { $('#merr').innerHTML = `<div class="err">${esc(er.message)}</div>`; }
    });
  }
  if (tab === 'orders') {
    const list = await api('/admin/orders');
    box.innerHTML = table(['#', 'Student', 'Items', 'Amount', 'Coupon', 'Status', 'Mode', 'Date'], list.map(o => `<tr><td>${o.id}</td><td>${esc(o.name)}<br><span class="hint">${esc(o.email)}</span></td><td>${esc(o.items)}</td><td>${inr(o.total)}</td><td>${o.coupon ? esc(o.coupon) + ' (−' + inr(o.discount) + ')' : '—'}</td>
      <td><span class="tag ${o.status === 'paid' ? '' : o.status === 'failed' ? 'off' : 'warn'}">${esc(o.status)}</span></td><td>${esc(o.provider)}</td><td>${esc(o.created_at.slice(0, 16))}</td></tr>`));
  }
  if (tab === 'offers') {
    const list = await api('/admin/offers'), e = q.id ? list.find(x => String(x.id) === q.id) : null;
    const lc = iso => { const d = new Date(iso), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
    const o = e || { title: 'Winter Sale', tagline: 'Learn More, Pay Less', subtitle: '', festival: 'winter', percent: 20, code: '', cta_text: 'Claim offer', active: 1, start_at: new Date().toISOString(), end_at: new Date(Date.now() + 7 * 864e5).toISOString() };
    const status = x => { const n = Date.now(); if (!x.active) return ['Off', 'off']; if (n < Date.parse(x.start_at)) return ['Scheduled', 'warn']; if (n > Date.parse(x.end_at)) return ['Ended', 'off']; return ['Live', '']; };
    box.innerHTML = `<div class="box"><h2>${e ? 'Edit offer' : 'New festival offer'}</h2><p class="hint">The live offer is shown first on the home page (banner, countdown and coupon). If several are live, the one ending soonest is shown.</p><div id="oerr"></div>
      <form id="of"><div class="row2"><div class="field"><label>Offer title *</label><input name="title" value="${esc(o.title)}" required placeholder="Diwali Dhamaka Sale"></div>
        <div class="field"><label>Festival theme (colours and emoji)</label><select name="festival">${Object.entries(FEST).map(([k, v]) => `<option value="${k}" ${o.festival === k ? 'selected' : ''}>${v[0]} ${v[1]}</option>`).join('')}</select></div></div>
      <div class="row2"><div class="field"><label>Small line above the title</label><input name="tagline" value="${esc(o.tagline || '')}" placeholder="Learn More, Pay Less"></div>
        <div class="field"><label>Message below the title</label><input name="subtitle" value="${esc(o.subtitle)}" placeholder="Learn in-demand skills &amp; unlock new opportunities."></div></div>
      <div class="row3"><div class="field"><label>Extra discount (%)</label><input name="percent" type="number" min="0" max="90" value="${o.percent}"></div>
        <div class="field"><label>Coupon code (optional)</label><input name="code" value="${esc(o.code)}" placeholder="DIWALI20" style="text-transform:uppercase"></div>
        <div class="field"><label>Button text</label><input name="cta_text" value="${esc(o.cta_text)}"></div></div>
      <div class="row2"><div class="field"><label>Starts</label><input name="start_at" type="datetime-local" value="${lc(o.start_at)}" required></div>
        <div class="field"><label>Ends</label><input name="end_at" type="datetime-local" value="${lc(o.end_at)}" required></div></div>
      <label style="display:flex;gap:8px;align-items:center;margin-bottom:16px"><input type="checkbox" name="active" ${o.active ? 'checked' : ''}> Active</label>
      <button class="btn" id="osub">${e ? 'Save offer' : 'Create offer'}</button> ${e ? '<a class="btn ghost" href="#/admin?tab=offers">Cancel</a>' : ''}</form></div>`
      + table(['Offer', 'Code', 'Discount', 'Runs', 'Status', ''], list.map(x => { const [t, c] = status(x); return `<tr><td>${FEST[x.festival]?.[0] || ''} <b>${esc(x.title)}</b></td><td>${esc(x.code || '—')}</td><td>${x.percent ? x.percent + '%' : '—'}</td>
        <td>${esc(new Date(x.start_at).toLocaleString())}<br>to ${esc(new Date(x.end_at).toLocaleString())}</td><td><span class="tag ${c}">${t}</span></td>
        <td><a class="btn sm ghost" href="#/admin?tab=offers&id=${x.id}">Edit</a> <button class="btn sm ghost" data-od="${x.id}" style="color:var(--red);border-color:var(--red)">Delete</button></td></tr>`; }));
    on('#of', 'submit', async ev => {
      ev.preventDefault(); const fd = new FormData(ev.target), body = Object.fromEntries(fd);
      body.active = fd.get('active') === 'on'; body.start_at = new Date(fd.get('start_at')).toISOString(); body.end_at = new Date(fd.get('end_at')).toISOString();
      $('#osub').disabled = true;
      try { await api(e ? '/admin/offers/' + e.id : '/admin/offers', { method: e ? 'PUT' : 'POST', body }); await loadOffer(); toast('Offer saved'); go('#/admin?tab=offers'); pAdmin({ tab: 'offers' }); }
      catch (er) { $('#oerr').innerHTML = `<div class="err">${esc(er.message)}</div>`; $('#osub').disabled = false; }
    });
    document.querySelectorAll('[data-od]').forEach(b => b.addEventListener('click', async () => { if (confirm('Delete this offer?')) { await api('/admin/offers/' + b.dataset.od, { method: 'DELETE' }); await loadOffer(); pAdmin({ tab: 'offers' }); } }));
  }
  if (tab === 'bundles') {
    const [bl, courses] = await Promise.all([api('/admin/bundles'), api('/admin/courses')]);
    box.innerHTML = `<div class="box"><h2>Create a bundle (Mighty Deal)</h2><div id="berr"></div><form id="bf">
      <div class="row3"><div class="field"><label>Title</label><input name="title" required></div><div class="field"><label>Bundle price (₹)</label><input name="price" type="number" min="0" required></div><div class="field"><label>Emoji</label><input name="icon" value="🎓"></div></div>
      <div class="field"><label>Pick at least 2 courses</label>${courses.map(c => `<label style="display:flex;gap:8px;padding:4px 0"><input type="checkbox" name="cid" value="${c.id}"> ${esc(c.title)} (${inr(c.price)})</label>`).join('')}</div>
      <button class="btn">Create bundle</button></form></div>` + table(['Bundle', 'Price', 'MRP', ''], bl.map(b => `<tr><td>${esc(b.icon)} ${esc(b.title)}</td><td>${inr(b.price)}</td><td>${inr(b.mrp)}</td><td><button class="btn sm ghost" data-bd="${b.id}" style="color:var(--red);border-color:var(--red)">Delete</button></td></tr>`));
    on('#bf', 'submit', async e => {
      e.preventDefault(); const fd = new FormData(e.target);
      try { await api('/admin/bundles', { method: 'POST', body: { title: fd.get('title'), price: fd.get('price'), icon: fd.get('icon'), courseIds: fd.getAll('cid') } }); toast('Bundle created'); pAdmin(q); }
      catch (er) { $('#berr').innerHTML = `<div class="err">${esc(er.message)}</div>`; }
    });
    document.querySelectorAll('[data-bd]').forEach(b => b.addEventListener('click', async () => { if (confirm('Delete this bundle?')) { await api('/admin/bundles/' + b.dataset.bd, { method: 'DELETE' }); pAdmin(q); } }));
  }
}

/* ---------- router ---------- */
async function route() {
  const raw = location.hash.slice(1) || '/', [path, qs] = raw.split('?'), q = Object.fromEntries(new URLSearchParams(qs || ''));
  const seg = path.split('/').filter(Boolean), page = seg[0] || '', arg = seg[1];
  $('#explore')?.classList.remove('open');
  const needUser = () => { if (!S.user) { go(`#/login?next=${encodeURIComponent(raw.slice(1))}`); return true; } };
  try {
    if (page === '') await pHome();
    else if (page === 'courses') await pCourses(q);
    else if (page === 'course') await pCourse(arg);
    else if (page === 'bundle') await pBundle(arg);
    else if (page === 'cart') await pCart();
    else if (page === 'login' || page === 'register') { if (S.user) return go('#/my'); pAuth(page, q); }
    else if (page === 'my') { if (!needUser()) await pMy(); }
    else if (page === 'learn') { if (!needUser()) await pLearn(arg); }
    else if (page === 'certificate') { if (!needUser()) await pCert(arg); }
    else if (page === 'admin') { if (!needUser()) { if (S.user.role !== 'admin') return view('<div class="wrap section"><div class="empty">Admins only.</div></div>'); await pAdmin(q); } }
    else view('<div class="wrap section"><div class="empty">Page not found. <a class="link" href="#/">Go home</a></div></div>');
  } catch (e) {
    if (e.status === 401) { S.user = null; renderTop(); return go('#/login'); }
    view(`<div class="wrap section"><div class="empty">${esc(e.message)}<br><br><a class="btn" href="#/courses">Browse courses</a></div></div>`);
  }
}

(async function init() {
  try {
    const [me, cfg, cats] = await Promise.all([api('/auth/me'), api('/config'), api('/categories')]);
    S.user = me.user; S.cfg = cfg; S.cats = cats;
  } catch (e) { console.error(e); }
  renderTop(); renderFooter(); await loadOffer(); setInterval(tick, 1000);
  window.addEventListener('hashchange', route);
  route();
})();
