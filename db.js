const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const file = path.join(dataDir, 'digiventry.db');

function openDb() {
  if (process.env.FORCE_NODE_SQLITE !== '1') {
    try { const D = require('better-sqlite3'); const d = new D(file); console.log('[db] using better-sqlite3'); return d; }
    catch (e) { console.log('[db] better-sqlite3 not available, trying built-in node:sqlite ...'); }
  }
  try {
    const { DatabaseSync } = require('node:sqlite');
    const raw = new DatabaseSync(file);
    console.log('[db] using built-in node:sqlite');
    return {
      exec: s => raw.exec(s),
      pragma: s => raw.exec('PRAGMA ' + s),
      prepare: s => raw.prepare(s),
      transaction: fn => (...a) => {
        raw.exec('BEGIN');
        try { const r = fn(...a); raw.exec('COMMIT'); return r; } catch (e) { raw.exec('ROLLBACK'); throw e; }
      }
    };
  } catch (e) {
    console.error('\nERROR: No database engine found.\nPlease install Node.js 22 LTS (or newer) from https://nodejs.org and run "npm install" again.\n');
    process.exit(1);
  }
}
const db = openDb();
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS courses(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, category TEXT NOT NULL,
  short_desc TEXT DEFAULT '', description TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0, mrp INTEGER NOT NULL DEFAULT 0,
  duration_text TEXT DEFAULT '', level TEXT DEFAULT 'Beginner', language TEXT DEFAULT 'Hindi',
  instructor TEXT DEFAULT 'Gyanova Team',
  thumb_icon TEXT DEFAULT '📘', thumb_color TEXT DEFAULT '#2F5BFF', thumb_url TEXT DEFAULT '',
  live_link TEXT DEFAULT '', live_schedule TEXT DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS lessons(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0, title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'video', url TEXT DEFAULT '', minutes INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS bundles(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, icon TEXT DEFAULT '🎓',
  price INTEGER NOT NULL, mrp INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS bundle_items(
  bundle_id INTEGER NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY(bundle_id, course_id)
);
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'created',
  provider TEXT DEFAULT '', provider_order_id TEXT DEFAULT '', payment_id TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items(
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  bundle_id INTEGER
);
CREATE TABLE IF NOT EXISTS enrollments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_id INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, course_id)
);
CREATE TABLE IF NOT EXISTS offers(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, subtitle TEXT DEFAULT '', festival TEXT NOT NULL DEFAULT 'sale',
  percent INTEGER NOT NULL DEFAULT 0, code TEXT DEFAULT '',
  start_at TEXT NOT NULL, end_at TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
  cta_text TEXT DEFAULT 'Claim offer'
);
CREATE TABLE IF NOT EXISTS progress(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(user_id, lesson_id)
);
`);

try { db.exec("UPDATE courses SET instructor='Gyanova Team' WHERE instructor='Digiventry Technology Team'"); } catch { /* ignore */ }
for (const q of ["ALTER TABLE orders ADD COLUMN coupon TEXT DEFAULT ''", 'ALTER TABLE orders ADD COLUMN discount INTEGER DEFAULT 0', "ALTER TABLE offers ADD COLUMN tagline TEXT DEFAULT ''"]) {
  try { db.exec(q); } catch { /* column already exists */ }
}

function seed() {
  const prod = process.env.NODE_ENV === 'production';
  const email = (process.env.ADMIN_EMAIL || (prod ? '' : 'admin@digiventry.local')).toLowerCase();
  const pass = process.env.ADMIN_PASSWORD || (prod ? '' : 'admin123');
  if (!email || !pass) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env for production.');
  if (!db.prepare('SELECT 1 FROM users WHERE role=?').get('admin')) {
    db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)')
      .run('Admin', email, bcrypt.hashSync(pass, 10), 'admin');
    console.log(`[seed] Admin created: ${email}` + (prod ? '' : ' / ' + pass + '  (change this!)'));
  }
  if (db.prepare('SELECT COUNT(*) n FROM offers').get().n === 0) {
    const now = Date.now();
    db.prepare('INSERT INTO offers(title,tagline,subtitle,festival,percent,code,start_at,end_at,active,cta_text) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run('Winter Sale', 'Learn More, Pay Less', 'Learn in-demand skills & unlock new opportunities with limited-time offers.', 'winter', 20, 'WINTER20',
        new Date(now - 864e5).toISOString(), new Date(now + 14 * 864e5).toISOString(), 1, 'Claim offer');
    console.log('[seed] Sample festival offer created. Edit it in Admin > Offers.');
  }
  if (db.prepare('SELECT COUNT(*) n FROM courses').get().n > 0) return;

  const addCourse = db.prepare(`INSERT INTO courses(slug,title,category,short_desc,description,price,mrp,duration_text,level,language,thumb_icon,thumb_color,live_schedule)
    VALUES(@slug,@title,@category,@short_desc,@description,@price,@mrp,@duration_text,@level,@language,@thumb_icon,@thumb_color,@live_schedule)`);
  const addLesson = db.prepare('INSERT INTO lessons(course_id,position,title,kind,minutes) VALUES(?,?,?,?,?)');
  const mk = (c, lessons) => {
    const id = addCourse.run(c).lastInsertRowid;
    lessons.forEach((l, i) => addLesson.run(id, i + 1, l[0], l[1] || 'video', l[2] || 0));
    return id;
  };

  const dm = mk({
    slug: 'digital-marketing-professional-course', title: 'Digital Marketing Professional Course',
    category: 'Digital Marketing',
    short_desc: 'Learn Instagram, Meta Ads, Google and WhatsApp marketing in 7 days, in Hindi.',
    description: [
      'Create a marketing funnel and your own 30-day plan',
      'Generate followers and leads on Instagram and Facebook',
      'Launch your first Meta Ads campaign',
      'Attract local customers with Google Ads, SEO and Google Business Profile',
      'Drive sales and follow-ups with WhatsApp Business',
      'Create posters and Reels using Canva and AI tools',
      'Price your services, pitch clients and finish a final project'
    ].join('\n'),
    price: 1999, mrp: 4999, duration_text: '7 days · ~2 hrs/day', level: 'Beginner', language: 'Hindi',
    thumb_icon: '📈', thumb_color: '#2F5BFF', live_schedule: 'Daily live class (set the time in Admin)'
  }, [
    ['Day 1: Digital Marketing basics (funnel, audience, goals)', 'live', 120],
    ['Day 2: Instagram & Facebook (content, Reels, growth)', 'live', 120],
    ['Day 3: Meta Ads (audience, budget, first ad)', 'live', 120],
    ['Day 4: Google Ads & SEO (search ads, local customers)', 'live', 120],
    ['Day 5: WhatsApp & Email (broadcast, follow-up)', 'live', 120],
    ['Day 6: Canva & AI tools (posters, Reels, creatives)', 'live', 120],
    ['Day 7: Freelancing & your first client (pricing, pitch, project)', 'live', 120]
  ]);

  const samples = [
    ['meta-ads-masterclass', 'Meta Ads Masterclass', 'Digital Marketing', '📣', '#E8431F', 999, 2499, '3 weeks',
      ['Ad account & pixel setup', 'Audience research', 'Creatives that convert', 'Budget and scaling', 'Reading the reports']],
    ['google-ads-seo-essentials', 'Google Ads & SEO Essentials', 'Digital Marketing', '🔎', '#0F9D58', 999, 2499, '3 weeks',
      ['Keyword research', 'Search ads step by step', 'On-page SEO', 'Google Business Profile', 'Tracking results']],
    ['html-css-javascript-beginners', 'HTML, CSS & JavaScript for Beginners', 'Web Development', '💻', '#7A4DFF', 1499, 3999, '6 weeks',
      ['HTML foundations', 'CSS layouts & responsive design', 'JavaScript basics', 'DOM and events', 'Build your portfolio site']],
    ['wordpress-website-development', 'WordPress Website Development', 'Web Development', '🌐', '#0EA5E9', 1299, 2999, '4 weeks',
      ['WordPress setup', 'Themes and page builders', 'Plugins that matter', 'Launch and security']],
    ['canva-ai-design-mastery', 'Canva & AI Design Mastery', 'Design & Creative', '🎨', '#F59E0B', 799, 1999, '2 weeks',
      ['Design basics', 'Posters and social posts', 'Reels and short videos', 'AI tools for creatives']],
    ['freelancing-kickstart', 'Freelancing Kickstart', 'Career & Freelancing', '🚀', '#14213D', 699, 1799, '1 week',
      ['Choose your service', 'Build a portfolio', 'Find your first client', 'Pricing and proposals', 'Delivering and getting paid']]
  ];
  const ids = { dm };
  for (const s of samples) {
    ids[s[0]] = mk({
      slug: s[0], title: s[1], category: s[2],
      short_desc: 'Sample course. Edit this text from the Admin panel.',
      description: 'Practical, project-based lessons\nHindi (Hinglish) explanations\nTemplates and tasks included\nCertificate on completion',
      price: s[5], mrp: s[6], duration_text: s[7], level: 'Beginner', language: 'Hindi',
      thumb_icon: s[3], thumb_color: s[4], live_schedule: ''
    }, s[8].map((t, i) => [`Lesson ${i + 1}: ${t}`, 'video', 15]));
  }

  const b = db.prepare('INSERT INTO bundles(slug,title,icon,price,mrp) VALUES(?,?,?,?,?)')
    .run('mighty-digital-marketing-bundle', 'Mighty Digital Marketing Bundle', '📢', 2999, 6495).lastInsertRowid;
  [ids.dm, ids['meta-ads-masterclass'], ids['google-ads-seo-essentials'], ids['freelancing-kickstart']]
    .forEach(cid => db.prepare('INSERT INTO bundle_items VALUES(?,?)').run(b, cid));
  console.log('[seed] Sample courses and bundle created. Edit or delete them in Admin.');
}

module.exports = { db, seed };
