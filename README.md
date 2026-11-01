# HANGOUT + PANG FOREVER ♡
### A Cute Social Community, Group Chat & Random Task Platform

> **Tagline:** Find your people. Create your space. Make every day a little more fun.  
> **Signature Feature:** PANG FOREVER ♡ — *Little missions. Little moments. Lots of fun.*

HANGOUT is an interactive social platform built with HTML5, CSS3, and Vanilla JavaScript, designed for effortless deployment to **GitHub Pages** with **Supabase** (Authentication, PostgreSQL Database, Realtime, and Storage).

---

## 🌸 Table of Contents
1. [Tech Stack & Architecture](#tech-stack--architecture)
2. [Project File Structure](#project-file-structure)
3. [Supabase Backend Setup](#supabase-backend-setup)
   - Step 1: Create a Supabase Project
   - Step 2: Retrieve API Credentials
   - Step 3: Configure `supabase-config.js`
   - Step 4: Execute `database-setup.sql`
   - Step 5: Configure Storage Buckets
   - Step 6: Enable Supabase Realtime
   - Step 7: Securely Assign the First Owner / Admin
4. [Publishing to GitHub Pages](#publishing-to-github-pages)
5. [Connecting a Custom Domain](#connecting-a-custom-domain)
6. [Feature Verification & Testing Guide](#feature-verification--testing-guide)
7. [Troubleshooting Guide](#troubleshooting-guide)

---

## 🛠 Tech Stack & Architecture

- **Frontend:** Pure HTML5, modern CSS3 (with Daylight Pastel & Cozy Midnight themes), and Vanilla JavaScript (ES6+).
- **Backend Services:** Supabase (Auth, PostgreSQL with Row Level Security, Realtime WebSockets, Storage).
- **Hosting:** 100% static — zero build step required, works straight out of the box on GitHub Pages, Cloudflare Pages, or any static host.
- **Audio & Animations:** Native Web Audio API procedural chime synthesizer & Canvas Confetti.

---

## 📁 Project File Structure

```
HANGOUT/
├── index.html            # Complete website structure & view containers
├── style.css             # Daylight & Midnight styling, responsive layouts, components
├── script.js             # Application logic, Avatar Studio, Chat, PANG engine, Admin
├── supabase-config.js    # Supabase browser initialization & config persistence
├── database-setup.sql    # Complete PostgreSQL schema, RLS policies, triggers & seeds
├── README.md             # Complete step-by-step documentation
└── assets/
    ├── logo/             # Brand mascot & logo icons
    ├── avatars/          # Chibi starter avatars & accessories
    ├── icons/            # SVG icons
    ├── illustrations/    # Hero banner & PANG FOREVER artworks
    └── backgrounds/      # Cozy scenery & card backdrops
```

---

## 🚀 Supabase Backend Setup

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in or create an account.
2. Click **New Project**.
3. Choose your organization, assign a project name (e.g., `hangout-community`), and set a secure database password.
4. Select the cloud region nearest to your audience and click **Create new project**.

### Step 2: Retrieve API Credentials
1. In your Supabase project dashboard, navigate to **Project Settings** (gear icon) → **API**.
2. Copy the following two values:
   - **Project URL** (e.g., `https://abcdefghijklm.supabase.co`)
   - **anon public Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6...`)

> ⚠️ **Important Security Rule:** NEVER expose your `service_role` secret key in frontend files or GitHub repositories. Only use the public `anon` key.

### Step 3: Configure `supabase-config.js`
Open `supabase-config.js` in your editor and update the constants:
```javascript
const DEFAULT_SUPABASE_URL = 'https://YOUR_ACTUAL_PROJECT_ID.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'YOUR_ACTUAL_ANON_PUBLIC_KEY';
```
*(Tip: You can also enter or test these keys live in the running website by visiting **Settings** → **Supabase Backend Connection**).*

### Step 4: Execute `database-setup.sql`
1. In the Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Open `database-setup.sql` from this repository, copy all contents, paste them into the SQL editor, and click **Run**.
4. This script sets up:
   - `profiles` table with user XP, levels, and avatar JSON configurations.
   - `user_roles` with `is_admin()` and `is_moderator()` security definer functions.
   - `admin_notifications` for high-priority real-time registration alerts.
   - `groups`, `group_members`, and `messages` for real-time chat with emoji reactions.
   - `task_templates`, `task_assignments`, and `group_missions` for PANG FOREVER ♡.
   - `posts` and `post_comments` for the community social feed.
   - Strict Row Level Security (RLS) policies protecting private data.
   - The `on_auth_user_created` database trigger that auto-creates profiles and notifies the admin whenever a new user registers.

### Step 5: Configure Storage Buckets
1. In the Supabase Dashboard, navigate to **Storage**.
2. Click **New Bucket**:
   - Bucket 1: `avatars` (Set to **Public**)
   - Bucket 2: `chat-media` (Set to **Public**)
3. Under Storage Policies, allow authenticated users to upload files up to 5MB.

### Step 6: Enable Supabase Realtime
1. Navigate to **Database** → **Replication** in the Supabase Dashboard.
2. Enable replication for the following tables:
   - `admin_notifications`
   - `messages`
   - `group_missions`
   - `posts`
3. This allows instant push notifications and live chat without manual page reloads.

### Step 7: Securely Assign the First Owner / Admin
To prevent unauthorized users from claiming admin privileges, admin roles must be assigned via server-side SQL:
1. Register your account on the HANGOUT website (e.g., `owner@example.com`).
2. Go to the Supabase **SQL Editor** and run:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'owner@example.com'),
  'admin'
) ON CONFLICT DO NOTHING;
```
3. Refresh the HANGOUT website. The **🛡️ Admin** button will now appear on your top navigation bar!

---

## 🌐 Publishing to GitHub Pages

Because HANGOUT uses only standard HTML5, CSS3, and browser JavaScript, it requires **zero compilation**:

1. Create a new GitHub repository named `hangout` (or any name you prefer).
2. Upload all files from this directory to the repository:
   - `index.html`
   - `style.css`
   - `script.js`
   - `supabase-config.js`
   - `database-setup.sql`
   - `assets/`
3. In your GitHub repository, go to **Settings** → **Pages**.
4. Under **Source**, select `Deploy from a branch`.
5. Select branch `main` (or `master`), folder `/ (root)`, and click **Save**.
6. Wait 1-2 minutes. Your website will be live at:
   `https://<your-github-username>.github.io/<repository-name>/`

---

## 🏷️ Connecting a Custom Domain

1. In your domain registrar (e.g. Google Domains / Cloudflare / Namecheap), add a CNAME record:
   - **Type:** `CNAME`
   - **Host:** `hangout` (or `@` for root)
   - **Value:** `<your-github-username>.github.io`
2. In GitHub repository **Settings** → **Pages** → **Custom domain**, enter your domain name (e.g. `hangout.yourdomain.com`).
3. Check the box **Enforce HTTPS**.

---

## 🧪 Feature Verification & Testing Guide

### 1. Test Registration & Auto-Admin Notifications (HIGH PRIORITY)
- Open an incognito browser window.
- Click **Log In** → **Create Account**.
- Fill in Display Name, Username (`@cozytest`), Email, and Password.
- Switch back to the admin window. You will hear a cozy chime and observe the unread registration badge increment in real time with:
  - Display Name
  - Username
  - Email address
  - Registration timestamp
  - Verification & Account status

### 2. Test Real-time Group Chat
- Open two different browser tabs (e.g. Tab A and Tab B).
- Enter **My Groups** → **The Cozy Tea Lounge**.
- Send a message in Tab A: verify it appears in Tab B with zero refresh.
- Click emoji reactions (`❤️`, `🌸`, `✨`) to verify live reaction counters.

### 3. Test PANG FOREVER ♡ Task Engine
- Open **PANG FOREVER** in the sidebar.
- Click **🎲 Surprise Me!** to cycle random missions.
- Click **Skip Mission** to confirm zero penalty.
- Submit a cozy response and click **✓ Complete & Claim XP**.
- Verify the colorful confetti burst, congratulatory modal, and instant increment of user Level & XP.

### 4. Test Avatar Studio
- Open **Avatar Studio**.
- Click tabs (`Hair`, `Eyes`, `Clothes`, `Accessory`, `Skin`, `Background`).
- Click **🎲 Randomize** to test procedural outfit combinations.
- Click **Save & Update Avatar** and confirm the avatar immediately synchronizes across the sidebar, profile, and chat bubbles.

---

## 💡 Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"Status: Demo Mode (Offline Storage)"** | Supabase keys are default placeholders. | Enter your project URL & Anon key in `supabase-config.js` or via the in-app **Settings** modal. |
| **Admin badge not visible** | User does not have `admin` role in `user_roles`. | Run the SQL snippet from Step 7 in the Supabase SQL editor using your email. |
| **Images not loading on GitHub Pages** | Absolute paths used instead of relative paths. | Ensure all asset paths use relative notation (`./assets/...`). |
| **Realtime messages not updating** | Replication not enabled for `messages` table. | Go to Supabase Dashboard → Database → Replication and toggle `messages` to ON. |

---

*Made with love for the cozy web ♡ Find your people. Create your space.*
