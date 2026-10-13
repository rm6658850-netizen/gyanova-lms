require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, seed } = require('./db');

const PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || (PROD ? '' : 'dev-secret-change-me');
if (!JWT_SECRET) { console.error('\nERROR: JWT_SECRET is empty. Open your .env file and set JWT_SECRET (or set NODE_ENV=development for local testing).\n'); process.exit(1); }
const RZP_ID = process.env.RAZORPAY_KEY_ID || '';
const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RZP_ON = !!(RZP_ID && RZP_SECRET);
const DEMO_PAY = !RZP_ON && process.env.ALLOW_DEMO_PAYMENTS === 'true';

try { seed(); } catch (e) { console.error('\nERROR: ' + e.message + '\n'); process.exit(1); }
const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      frameSrc: ['https://www.youtube-nocookie.com', 'https://player.vimeo.com', 'https://api.razorpay.com'],
      connectSrc: ["'self'", 'https://lumberjack.razorpay.com'],
      mediaSrc: ["'self'", 'https:']
    }
  }
}));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());

/* ---------- helpers ---------- */
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const wrap = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => { console.error(e); bad(res, 'Server error', 500); });
const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const int = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : d; };
const okUrl = u => !u || /^https:\/\//i.test(u);
const okColor = c => /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#2F5BFF';

function sign(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
}
function setCookie(res, user) {
  res.cookie('dg_token', sign(user), { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 30 * 864e5 });
}
const publicUser = u => u && ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });

app.use((req, _res, next) => {
  try {
    const t = req.cookies.dg_token;
    if (t) {
      const { id } = jwt.verify(t, JWT_SECRET);
      req.user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
    }
  } catch { /* invalid token = logged out */ }
  next();
});
const needAuth = (req, res, next) => req.user ? next() : bad(res, 'Please log in first.', 401);
const needAdmin = (req, res, next) => req.user?.role === 'admin' ? next() : bad(res, 'Admins only.', 403);

const COURSE_COLS = `c.id,c.slug,c.title,c.category,c.short_desc,c.price,c.mrp,c.duration_text,c.level,c.language,c.instructor,
  c.thumb_icon,c.thumb_color,c.thumb_url,c.created_at,
  (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) AS lesson_count,
  (SELECT COALESCE(SUM(minutes),0) FROM lessons l WHERE l.course_id=c.id) AS total_minutes,
  (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id) AS students,
  (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id AND e.created_at>=datetime('now','-30 days')) AS recent`;
const enrolled = (uid, cid) => !!db.prepare('SELECT 1 FROM enrollments WHERE user_id=? AND course_id=?').get(uid, cid);

/* ---------- auth ---------- */
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false });

app.post('/api/auth/register', authLimiter, wrap(async (req, res) => {
  const name = str(req.body.name, 80), email = str(req.body.email, 120).toLowerCase();
  const phone = str(req.body.phone, 20), password = String(req.body.password || '');
  if (name.length < 2) return bad(res, 'Please enter your name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad(res, 'Please enter a valid email.');
  if (password.length < 6) return bad(res, 'Password must be at least 6 characters.');
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return bad(res, 'This email is already registered. Please log in.');
  const id = db.prepare('INSERT INTO users(name,email,phone,password_hash) VALUES(?,?,?,?)')
    .run(name, email, phone, bcrypt.hashSync(password, 10)).lastInsertRowid;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  setCookie(res, user);
  res.json({ user: publicUser(user) });
}));

app.post('/api/auth/login', authLimiter, wrap(async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !bcrypt.compareSync(String(req.body.password || ''), user.password_hash))
    return bad(res, 'Wrong email or password.', 401);
  setCookie(res, user);
  res.json({ user: publicUser(user) });
}));
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('dg_token'); res.json({ ok: true }); });
app.get('/api/auth/me', (req, res) => res.json({ user: publicUser(req.user) || null }));

/* ---------- festival offers & coupons ---------- */
const FESTIVALS = ['sale', 'winter', 'summer', 'diwali', 'holi', 'newyear', 'independence', 'dussehra', 'eid', 'christmas', 'raksha'];
function liveOffers() {
  const now = Date.now();
  return db.prepare('SELECT * FROM offers WHERE active=1').all()
    .filter(o => Date.parse(o.start_at) <= now && now <= Date.parse(o.end_at))
    .sort((a, b) => Date.parse(a.end_at) - Date.parse(b.end_at));
}
function couponPercent(code) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return 0;
  const o = liveOffers().find(x => x.code && x.code.toUpperCase() === c && x.percent > 0);
  return o ? o.percent : 0;
}
app.get('/api/offer', (_req, res) => {
  const o = liveOffers()[0];
  res.json({ now: Date.now(), offer: o ? { title: o.title, tagline: o.tagline, subtitle: o.subtitle, festival: o.festival, percent: o.percent, code: o.code, end_at: o.end_at, cta_text: o.cta_text } : null });
});
app.get('/api/coupon/:code', (req, res) => {
  const pct = couponPercent(req.params.code);
  if (!pct) return bad(res, 'This coupon is invalid or has expired.', 404);
  res.json({ code: req.params.code.toUpperCase(), percent: pct });
});

/* ---------- public catalog ---------- */
app.get('/api/config', (_req, res) => res.json({ razorpay: RZP_ON, demoPayments: DEMO_PAY }));

app.get('/api/categories', (_req, res) => {
  res.json(db.prepare('SELECT category name, COUNT(*) n FROM courses WHERE published=1 GROUP BY category ORDER BY MIN(id)').all());
});

app.get('/api/courses', (req, res) => {
  const where = ['c.published=1'], args = [];
  if (req.query.category) { where.push('c.category=?'); args.push(str(req.query.category, 80)); }
  if (req.query.q) { where.push('(c.title LIKE ? OR c.short_desc LIKE ? OR c.category LIKE ?)'); const q = `%${str(req.query.q, 60)}%`; args.push(q, q, q); }
  const order = { best: 'students DESC, c.id ASC', trending: 'recent DESC, students DESC, c.id DESC', latest: 'c.id DESC' }[req.query.sort] || 'students DESC, c.id ASC';
  res.json(db.prepare(`SELECT ${COURSE_COLS} FROM courses c WHERE ${where.join(' AND ')} ORDER BY ${order}`).all(...args));
});

app.get('/api/courses/:slug', (req, res) => {
  const c = db.prepare(`SELECT ${COURSE_COLS}, c.description, c.live_schedule FROM courses c WHERE c.slug=? AND c.published=1`).get(req.params.slug);
  if (!c) return bad(res, 'Course not found.', 404);
  c.lessons = db.prepare('SELECT id,position,title,kind,minutes FROM lessons WHERE course_id=? ORDER BY position').all(c.id);
  c.enrolled = !!req.user && enrolled(req.user.id, c.id);
  res.json(c);
});

function bundleWithCourses(b, uid) {
  b.courses = db.prepare(`SELECT ${COURSE_COLS} FROM bundle_items bi JOIN courses c ON c.id=bi.course_id WHERE bi.bundle_id=? AND c.published=1`).all(b.id);
  b.enrolledAll = !!uid && b.courses.length > 0 && b.courses.every(c => enrolled(uid, c.id));
  return b;
}
app.get('/api/bundles', (req, res) => {
  res.json(db.prepare('SELECT * FROM bundles WHERE published=1 ORDER BY id').all().map(b => bundleWithCourses(b, req.user?.id)));
});
app.get('/api/bundles/:slug', (req, res) => {
  const b = db.prepare('SELECT * FROM bundles WHERE slug=? AND published=1').get(req.params.slug);
  if (!b) return bad(res, 'Bundle not found.', 404);
  res.json(bundleWithCourses(b, req.user?.id));
});

/* ---------- student: my learning ---------- */
function progressFor(uid, cid) {
  const total = db.prepare('SELECT COUNT(*) n FROM lessons WHERE course_id=?').get(cid).n;
  const done = db.prepare('SELECT COUNT(*) n FROM progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=? AND l.course_id=?').get(uid, cid).n;
  return { total, done, percent: total ? Math.round(done * 100 / total) : 0 };
}
app.get('/api/my/courses', needAuth, (req, res) => {
  const rows = db.prepare(`SELECT ${COURSE_COLS}, e.created_at enrolled_at FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=? ORDER BY e.id DESC`).all(req.user.id);
  rows.forEach(c => c.progress = progressFor(req.user.id, c.id));
  res.json(rows);
});
app.get('/api/my/courses/:slug', needAuth, (req, res) => {
  const c = db.prepare(`SELECT ${COURSE_COLS}, c.description, c.live_link, c.live_schedule FROM courses c WHERE c.slug=?`).get(req.params.slug);
  if (!c || (!enrolled(req.user.id, c.id) && req.user.role !== 'admin')) return bad(res, 'You are not enrolled in this course.', 403);
  const done = new Set(db.prepare('SELECT lesson_id FROM progress WHERE user_id=?').all(req.user.id).map(r => r.lesson_id));
  c.lessons = db.prepare('SELECT id,position,title,kind,url,minutes FROM lessons WHERE course_id=? ORDER BY position').all(c.id)
    .map(l => ({ ...l, done: done.has(l.id) }));
  c.progress = progressFor(req.user.id, c.id);
  res.json(c);
});
app.post('/api/my/lessons/:id/toggle', needAuth, (req, res) => {
  const l = db.prepare('SELECT * FROM lessons WHERE id=?').get(int(req.params.id));
  if (!l || !enrolled(req.user.id, l.course_id)) return bad(res, 'Not allowed.', 403);
  const has = db.prepare('SELECT 1 FROM progress WHERE user_id=? AND lesson_id=?').get(req.user.id, l.id);
  if (has) db.prepare('DELETE FROM progress WHERE user_id=? AND lesson_id=?').run(req.user.id, l.id);
  else db.prepare('INSERT INTO progress(user_id,lesson_id) VALUES(?,?)').run(req.user.id, l.id);
  res.json({ done: !has, progress: progressFor(req.user.id, l.course_id) });
});
app.get('/api/my/certificate/:slug', needAuth, (req, res) => {
  const c = db.prepare('SELECT id,title,duration_text FROM courses WHERE slug=?').get(req.params.slug);
  const e = c && db.prepare('SELECT * FROM enrollments WHERE user_id=? AND course_id=?').get(req.user.id, c.id);
  if (!e) return bad(res, 'Not enrolled.', 403);
  const p = progressFor(req.user.id, c.id);
  if (!p.total || p.percent < 100) return bad(res, 'Complete all lessons to get your certificate.', 403);
  const last = db.prepare('SELECT MAX(completed_at) d FROM progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=? AND l.course_id=?').get(req.user.id, c.id).d;
  res.json({ name: req.user.name, course: c.title, duration: c.duration_text, date: last, certId: 'DG-' + String(e.id).padStart(6, '0') });
});

/* ---------- checkout ---------- */
function fulfill(orderId, paymentId) {
  db.transaction(() => {
    const o = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
    if (!o || o.status === 'paid') return;
    db.prepare("UPDATE orders SET status='paid', payment_id=? WHERE id=?").run(paymentId || '', orderId);
    for (const it of db.prepare('SELECT course_id FROM order_items WHERE order_id=?').all(orderId))
      db.prepare('INSERT OR IGNORE INTO enrollments(user_id,course_id,order_id) VALUES(?,?,?)').run(o.user_id, it.course_id, orderId);
  })();
}

app.post('/api/checkout', needAuth, wrap(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 20) : [];
  const lines = []; // {course_id, bundle_id}
  let total = 0;
  const seen = new Set();
  for (const it of items) {
    if (it.type === 'bundle') {
      const b = db.prepare('SELECT * FROM bundles WHERE slug=? AND published=1').get(str(it.slug, 100));
      if (!b) continue;
      const cids = db.prepare('SELECT course_id FROM bundle_items WHERE bundle_id=?').all(b.id).map(r => r.course_id);
      if (!cids.length || cids.every(id => enrolled(req.user.id, id))) continue;
      total += b.price; cids.forEach(id => { lines.push({ course_id: id, bundle_id: b.id }); seen.add(id); });
    } else {
      const c = db.prepare('SELECT * FROM courses WHERE slug=? AND published=1').get(str(it.slug, 100));
      if (!c || enrolled(req.user.id, c.id) || seen.has(c.id)) continue;
      total += c.price; seen.add(c.id); lines.push({ course_id: c.id, bundle_id: null });
    }
  }
  if (!lines.length) return bad(res, 'Nothing to buy. You may already own these courses.');
  let coupon = '', discount = 0;
  const code = str(req.body.coupon, 30).toUpperCase();
  if (code) {
    const pct = couponPercent(code);
    if (!pct) return bad(res, 'This coupon is invalid or has expired.');
    discount = Math.floor(total * pct / 100); total -= discount; coupon = code;
  }
  const orderId = db.transaction(() => {
    const id = db.prepare('INSERT INTO orders(user_id,total,provider,coupon,discount) VALUES(?,?,?,?,?)').run(req.user.id, total, total === 0 ? 'free' : RZP_ON ? 'razorpay' : 'demo', coupon, discount).lastInsertRowid;
    lines.forEach(l => db.prepare('INSERT INTO order_items VALUES(?,?,?)').run(id, l.course_id, l.bundle_id));
    return id;
  })();
  if (total === 0) { fulfill(orderId, 'free'); return res.json({ mode: 'free', orderId }); }
  if (RZP_ON) {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${RZP_ID}:${RZP_SECRET}`).toString('base64') },
      body: JSON.stringify({ amount: total * 100, currency: 'INR', receipt: 'dg_' + orderId })
    });
    const j = await r.json();
    if (!r.ok) { console.error('Razorpay error', j); return bad(res, 'Payment gateway error. Please try again.', 502); }
    db.prepare('UPDATE orders SET provider_order_id=? WHERE id=?').run(j.id, orderId);
    return res.json({ mode: 'razorpay', orderId, amount: total, key: RZP_ID, razorpayOrderId: j.id, name: req.user.name, email: req.user.email, phone: req.user.phone });
  }
  if (DEMO_PAY) return res.json({ mode: 'demo', orderId, amount: total });
  return bad(res, 'Online payment is not configured yet. Please contact the institute on WhatsApp.', 503);
}));

app.post('/api/checkout/verify', needAuth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(int(req.body.orderId), req.user.id);
  if (!o || o.provider !== 'razorpay') return bad(res, 'Order not found.', 404);
  const pid = str(req.body.razorpay_payment_id, 100), sig = str(req.body.razorpay_signature, 200);
  const expected = crypto.createHmac('sha256', RZP_SECRET).update(`${o.provider_order_id}|${pid}`).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    db.prepare("UPDATE orders SET status='failed' WHERE id=? AND status='created'").run(o.id);
    return bad(res, 'Payment could not be verified.', 400);
  }
  fulfill(o.id, pid);
  res.json({ ok: true });
});

app.post('/api/checkout/demo-confirm', needAuth, (req, res) => {
  if (!DEMO_PAY) return bad(res, 'Demo payments are disabled.', 403);
  const o = db.prepare("SELECT * FROM orders WHERE id=? AND user_id=? AND provider='demo'").get(int(req.body.orderId), req.user.id);
  if (!o) return bad(res, 'Order not found.', 404);
  fulfill(o.id, 'DEMO-' + Date.now());
  res.json({ ok: true });
});

/* ---------- admin ---------- */
app.get('/api/admin/stats', needAuth, needAdmin, (_req, res) => {
  const n = q => db.prepare(q).get().n;
  res.json({
    students: n("SELECT COUNT(*) n FROM users WHERE role='student'"),
    courses: n('SELECT COUNT(*) n FROM courses'),
    enrollments: n('SELECT COUNT(*) n FROM enrollments'),
    revenue: n("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status='paid' AND provider!='demo'"),
    demoRevenue: n("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status='paid' AND provider='demo'")
  });
});
app.get('/api/admin/courses', needAuth, needAdmin, (_req, res) => {
  res.json(db.prepare(`SELECT ${COURSE_COLS}, c.published FROM courses c ORDER BY c.id DESC`).all());
});
app.get('/api/admin/courses/:id', needAuth, needAdmin, (req, res) => {
  const c = db.prepare('SELECT * FROM courses WHERE id=?').get(int(req.params.id));
  if (!c) return bad(res, 'Not found.', 404);
  c.lessons = db.prepare('SELECT title,kind,url,minutes FROM lessons WHERE course_id=? ORDER BY position').all(c.id);
  res.json(c);
});
function readCourse(b) {
  const c = {
    title: str(b.title, 140), category: str(b.category, 60), short_desc: str(b.short_desc, 300),
    description: str(b.description, 4000), price: int(b.price), mrp: int(b.mrp),
    duration_text: str(b.duration_text, 60), level: str(b.level, 30) || 'Beginner', language: str(b.language, 30) || 'Hindi',
    instructor: str(b.instructor, 80) || 'Gyanova Team',
    thumb_icon: str(b.thumb_icon, 8) || '📘', thumb_color: okColor(b.thumb_color), thumb_url: str(b.thumb_url, 400),
    live_link: str(b.live_link, 400), live_schedule: str(b.live_schedule, 200), published: b.published ? 1 : 0
  };
  if (!c.title || !c.category) throw new Error('Title and category are required.');
  if (!okUrl(c.thumb_url) || !okUrl(c.live_link)) throw new Error('Links must start with https://');
  const lessons = (Array.isArray(b.lessons) ? b.lessons : []).slice(0, 200).map(l => ({
    title: str(l.title, 160), kind: ['video', 'live', 'note'].includes(l.kind) ? l.kind : 'video', url: str(l.url, 400), minutes: int(l.minutes)
  })).filter(l => l.title);
  if (lessons.some(l => !okUrl(l.url))) throw new Error('Lesson links must start with https://');
  return { c, lessons };
}
function saveLessons(cid, lessons) {
  db.prepare('DELETE FROM lessons WHERE course_id=?').run(cid);
  lessons.forEach((l, i) => db.prepare('INSERT INTO lessons(course_id,position,title,kind,url,minutes) VALUES(?,?,?,?,?,?)').run(cid, i + 1, l.title, l.kind, l.url, l.minutes));
}
app.post('/api/admin/courses', needAuth, needAdmin, (req, res) => {
  try {
    const { c, lessons } = readCourse(req.body);
    let slug = slugify(req.body.slug || c.title) || 'course', n = 1;
    while (db.prepare('SELECT 1 FROM courses WHERE slug=?').get(n > 1 ? `${slug}-${n}` : slug)) n++;
    slug = n > 1 ? `${slug}-${n}` : slug;
    const id = db.transaction(() => {
      const cols = Object.keys(c);
      const id = db.prepare(`INSERT INTO courses(slug,${cols.join(',')}) VALUES(?,${cols.map(() => '?').join(',')})`).run(slug, ...cols.map(k => c[k])).lastInsertRowid;
      saveLessons(id, lessons); return id;
    })();
    res.json({ id, slug });
  } catch (e) { bad(res, e.message); }
});
app.put('/api/admin/courses/:id', needAuth, needAdmin, (req, res) => {
  try {
    const id = int(req.params.id);
    if (!db.prepare('SELECT 1 FROM courses WHERE id=?').get(id)) return bad(res, 'Not found.', 404);
    const { c, lessons } = readCourse(req.body);
    db.transaction(() => {
      const cols = Object.keys(c);
      db.prepare(`UPDATE courses SET ${cols.map(k => k + '=?').join(',')} WHERE id=?`).run(...cols.map(k => c[k]), id);
      saveLessons(id, lessons);
    })();
    res.json({ ok: true });
  } catch (e) { bad(res, e.message); }
});
app.delete('/api/admin/courses/:id', needAuth, needAdmin, (req, res) => {
  const id = int(req.params.id);
  if (db.prepare('SELECT 1 FROM enrollments WHERE course_id=?').get(id) || db.prepare('SELECT 1 FROM order_items WHERE course_id=?').get(id))
    return bad(res, 'Students have enrolled in this course. Unpublish it instead of deleting.');
  db.prepare('DELETE FROM courses WHERE id=?').run(id);
  res.json({ ok: true });
});
app.get('/api/admin/students', needAuth, needAdmin, (_req, res) => {
  res.json(db.prepare(`SELECT u.id,u.name,u.email,u.phone,u.created_at,
    (SELECT GROUP_CONCAT(c.title, ', ') FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=u.id) AS courses
    FROM users u WHERE u.role='student' ORDER BY u.id DESC`).all());
});
app.get('/api/admin/orders', needAuth, needAdmin, (_req, res) => {
  res.json(db.prepare(`SELECT o.id,o.total,o.status,o.provider,o.payment_id,o.coupon,o.discount,o.created_at,u.name,u.email,
    (SELECT GROUP_CONCAT(c.title, ', ') FROM order_items oi JOIN courses c ON c.id=oi.course_id WHERE oi.order_id=o.id) AS items
    FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC LIMIT 200`).all());
});
app.post('/api/admin/enroll', needAuth, needAdmin, (req, res) => {
  const u = db.prepare('SELECT id FROM users WHERE email=?').get(str(req.body.email, 120).toLowerCase());
  const c = db.prepare('SELECT id FROM courses WHERE id=?').get(int(req.body.courseId));
  if (!u) return bad(res, 'No student with this email. Ask them to sign up first.', 404);
  if (!c) return bad(res, 'Course not found.', 404);
  db.prepare('INSERT OR IGNORE INTO enrollments(user_id,course_id) VALUES(?,?)').run(u.id, c.id);
  res.json({ ok: true });
});
app.post('/api/admin/bundles', needAuth, needAdmin, (req, res) => {
  const title = str(req.body.title, 120), ids = (Array.isArray(req.body.courseIds) ? req.body.courseIds : []).map(int).filter(Boolean);
  if (!title || ids.length < 2) return bad(res, 'Give a title and pick at least 2 courses.');
  let slug = slugify(title), n = 1;
  while (db.prepare('SELECT 1 FROM bundles WHERE slug=?').get(n > 1 ? `${slug}-${n}` : slug)) n++;
  slug = n > 1 ? `${slug}-${n}` : slug;
  const mrp = ids.reduce((s, id) => s + (db.prepare('SELECT price FROM courses WHERE id=?').get(id)?.price || 0), 0);
  db.transaction(() => {
    const bid = db.prepare('INSERT INTO bundles(slug,title,icon,price,mrp) VALUES(?,?,?,?,?)').run(slug, title, str(req.body.icon, 8) || '🎓', int(req.body.price), mrp).lastInsertRowid;
    ids.forEach(id => db.prepare('INSERT OR IGNORE INTO bundle_items VALUES(?,?)').run(bid, id));
  })();
  res.json({ ok: true });
});
app.get('/api/admin/bundles', needAuth, needAdmin, (_req, res) => res.json(db.prepare('SELECT * FROM bundles ORDER BY id DESC').all()));
app.delete('/api/admin/bundles/:id', needAuth, needAdmin, (req, res) => {
  db.prepare('DELETE FROM bundles WHERE id=?').run(int(req.params.id)); res.json({ ok: true });
});

app.get('/api/admin/offers', needAuth, needAdmin, (_req, res) => res.json(db.prepare('SELECT * FROM offers ORDER BY id DESC').all()));
function readOffer(b) {
  const o = {
    title: str(b.title, 80), tagline: str(b.tagline, 80), subtitle: str(b.subtitle, 220), festival: FESTIVALS.includes(b.festival) ? b.festival : 'sale',
    percent: Math.min(90, int(b.percent)), code: str(b.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, ''),
    start_at: new Date(b.start_at).toISOString(), end_at: new Date(b.end_at).toISOString(),
    active: b.active ? 1 : 0, cta_text: str(b.cta_text, 30) || 'Claim offer'
  };
  if (!o.title) throw new Error('Please enter an offer title.');
  if (Date.parse(o.end_at) <= Date.parse(o.start_at)) throw new Error('End time must be after start time.');
  return o;
}
function offerCols(o) { const cols = Object.keys(o); return { cols, vals: cols.map(k => o[k]) }; }
app.post('/api/admin/offers', needAuth, needAdmin, (req, res) => {
  try {
    const { cols, vals } = offerCols(readOffer(req.body));
    db.prepare(`INSERT INTO offers(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`).run(...vals);
    res.json({ ok: true });
  } catch (e) { bad(res, e.message.includes('Invalid time') ? 'Please pick valid start and end dates.' : e.message); }
});
app.put('/api/admin/offers/:id', needAuth, needAdmin, (req, res) => {
  try {
    const { cols, vals } = offerCols(readOffer(req.body));
    db.prepare(`UPDATE offers SET ${cols.map(k => k + '=?').join(',')} WHERE id=?`).run(...vals, int(req.params.id));
    res.json({ ok: true });
  } catch (e) { bad(res, e.message.includes('Invalid time') ? 'Please pick valid start and end dates.' : e.message); }
});
app.delete('/api/admin/offers/:id', needAuth, needAdmin, (req, res) => {
  db.prepare('DELETE FROM offers WHERE id=?').run(int(req.params.id)); res.json({ ok: true });
});

/* ---------- static site ---------- */
app.use('/api', (_req, res) => bad(res, 'Not found.', 404));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: PROD ? '1h' : 0 }));
app.use((_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const server = app.listen(PORT, () => {
  console.log(`Gyanova platform running on http://localhost:${PORT}`);
  console.log(RZP_ON ? 'Payments: Razorpay LIVE/TEST keys detected.' : DEMO_PAY ? 'Payments: DEMO mode (no real money). Add Razorpay keys for real payments.' : 'Payments: not configured.');
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`\nERROR: Port ${PORT} is already in use. Close the other app or change PORT in .env (e.g. PORT=3001).\n`);
  else console.error(e);
  process.exit(1);
});
