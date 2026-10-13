# Gyanova Educations – Online Course Platform

Full-stack website (Node.js + Express + SQLite). Students can sign up, buy courses (Razorpay), attend live classes, watch lessons, track progress and download a certificate. Admin can manage everything.

## 1. Run on your computer
1. Install Node.js 18+ from nodejs.org
2. Open a terminal in this folder and run:
   ```
   npm install
   cp .env.example .env        (Windows: copy .env.example .env)
   ```
3. The default `.env` already works for testing (demo payments on). Nothing to edit.
4. `npm start`, then open http://localhost:3000
5. Admin login (test): `admin@digiventry.local` / `admin123` (change before going live)

## 2. What students can do
- Browse categories, Best Sellers / Trending / Latest, search
- Buy single courses or "Mighty Deals" bundles
- My Learning: lessons, live class button, progress, certificate (after 100%)

## 3. What you (admin) can do – open `/#/admin`
- Courses: add/edit, price, lessons, **live class link (Google Meet/Zoom), visible only to enrolled students**
- Students list, orders, manual enroll (for UPI/WhatsApp payments), bundles
- The sample courses are placeholders: edit or delete them.

## 4. Go live (real website)
This is a server app, so it cannot run on plain static hosting. Use Render.com, Railway, or a VPS.
1. Upload this folder to GitHub, create a "Web Service" on Render (Build: `npm install`, Start: `npm start`).
2. Add a **persistent disk** and set `DATA_DIR` to its path (otherwise the database resets on every deploy).
3. Set environment variables (see `.env.example`): `NODE_ENV=production`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`. Keep `ALLOW_DEMO_PAYMENTS=false`.
4. Connect your domain (HTTPS is automatic on Render).

## 5. Payments
With Razorpay keys set, checkout opens the Razorpay window and the server verifies the payment signature before enrolling the student. Start with Razorpay **test keys**, then switch to live keys.

## 6. Good to know
- Back up `data/digiventry.db` regularly.
- Passwords are hashed; login uses a secure HttpOnly cookie.
- Videos: paste unlisted YouTube/Vimeo links or .mp4 links in the lesson list.

## 7. If it does not start
- **"npm is not recognized"**: install Node.js 22 LTS from nodejs.org, then close and reopen the terminal.
- **"JWT_SECRET is empty"**: your `.env` says `NODE_ENV=production`. Set `NODE_ENV=development` for local testing.
- **"Port 3000 is already in use"**: set `PORT=3001` in `.env`.
- **better-sqlite3 install errors**: ignore them. The app automatically uses the built-in database of Node 22+.
- **Windows copy command**: use `copy .env.example .env`.
- Always open the site at http://localhost:3000 (not by double-clicking index.html).
