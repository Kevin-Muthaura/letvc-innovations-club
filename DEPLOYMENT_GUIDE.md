# LETVC INNOVATIONS CLUB SYSTEM
## Complete Deployment Guide — Step by Step

---

## WHAT YOU HAVE

| Layer      | Technology        | Cost  |
|------------|-------------------|-------|
| Frontend   | React (Vercel)    | FREE  |
| Backend    | Supabase (BaaS)   | FREE  |
| Database   | PostgreSQL (Supabase) | FREE |
| Auth       | Supabase Auth     | FREE  |
| Hosting    | Vercel            | FREE  |

---

## PHASE 1 — SET UP THE DATABASE (Supabase)

### Step 1 — Create Supabase Account
1. Open your browser and go to: **https://supabase.com**
2. Click **"Start your project"**
3. Sign up with your Google or GitHub account (both are free)
4. Click **"New Project"**
5. Fill in:
   - **Project name:** `letvc-innovations-club`
   - **Database password:** Create a strong password and **save it somewhere safe**
   - **Region:** Choose **East Africa (eu-west-2)** or any region close to Kenya
6. Click **"Create new project"**
7. Wait 2–3 minutes for the project to be ready

### Step 2 — Run the Database Schema
1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase_schema.sql` from your downloaded project files
4. Copy the entire contents of that file
5. Paste it into the SQL Editor
6. Click the green **"Run"** button (or press Ctrl+Enter)
7. You should see **"Success. No rows returned"** — this means it worked
8. All 18 members, 10 mentors, sample projects, events and announcements are now in your database

### Step 3 — Get Your API Keys
1. In Supabase, click **"Settings"** (gear icon) in the left sidebar
2. Click **"API"**
3. You will see two important values — copy them:
   - **Project URL** — looks like: `https://abcdefgh.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`
4. Keep these — you need them in Phase 2

### Step 4 — Create Your Admin User
1. In Supabase, click **"Authentication"** in the left sidebar
2. Click **"Users"**
3. Click **"Invite user"** (or "Add user")
4. Enter your email address and a strong password
5. Click **"Create user"**
6. Now go to **"Table Editor"** → select the **"profiles"** table
7. Find your user row (it was auto-created when you signed up)
8. Click the row to edit it
9. Change the **role** field from `member` to `admin`
10. Click **Save** — you are now the admin!

---

## PHASE 2 — SET UP THE FRONTEND

### Step 5 — Install Required Software on Your Computer
You need these (all free):
1. **Node.js** — Download from: https://nodejs.org → choose "LTS" version → install it
2. **Git** — Download from: https://git-scm.com → install it
3. Restart your computer after installing both

### Step 6 — Prepare the Project Files
1. Download the project folder (`letvc-club`) from this system
2. Extract/unzip it to your Desktop or Documents folder
3. Open the folder — you should see: `src/`, `public/`, `package.json`, `supabase_schema.sql`, etc.

### Step 7 — Configure Your Environment
1. Inside the `letvc-club` folder, find the file named `.env.example`
2. Make a copy of it and rename the copy to: `.env.local`
   - On Windows: right-click → Copy → Paste → rename to `.env.local`
   - On Mac: duplicate the file and rename it
3. Open `.env.local` with Notepad (Windows) or TextEdit (Mac)
4. Replace the placeholder values with your Supabase keys from Step 3:
   ```
   REACT_APP_SUPABASE_URL=https://YOUR_ACTUAL_PROJECT_ID.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=YOUR_ACTUAL_ANON_KEY
   ```
5. Save the file

### Step 8 — Run the System Locally (for testing)
1. Open **Command Prompt** (Windows) or **Terminal** (Mac)
2. Navigate to the project folder. Example:
   ```
   cd Desktop/letvc-club
   ```
3. Install all dependencies:
   ```
   npm install
   ```
   (This downloads all required packages — takes 2–5 minutes, requires internet)
4. Start the development server:
   ```
   npm start
   ```
5. Your browser will automatically open at: **http://localhost:3000**
6. The system is running! Log in with the admin email and password you created in Step 4

---

## PHASE 3 — DEPLOY ONLINE (Vercel — Free Hosting)

### Step 9 — Create a GitHub Account & Repository
1. Go to: **https://github.com** and sign up for a free account
2. Click **"New repository"** (the + icon top-right)
3. Repository name: `letvc-innovations-club`
4. Leave it **Public**
5. Click **"Create repository"**
6. GitHub will show you commands — copy the ones under "push an existing repository"

### Step 10 — Upload Your Project to GitHub
1. In your Terminal/Command Prompt (inside the `letvc-club` folder):
   ```
   git init
   git add .
   git commit -m "Initial commit — LETVC Innovations Club System"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/letvc-innovations-club.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your actual GitHub username
2. Refresh your GitHub page — your files should now be there

### Step 11 — Deploy on Vercel
1. Go to: **https://vercel.com** and sign up with your GitHub account
2. Click **"Add New Project"**
3. Click **"Import"** next to your `letvc-innovations-club` repository
4. Under **"Environment Variables"**, add both your Supabase keys:
   - Click **"Add"**
   - Name: `REACT_APP_SUPABASE_URL` | Value: your Supabase URL
   - Click **"Add"** again
   - Name: `REACT_APP_SUPABASE_ANON_KEY` | Value: your anon key
5. Click **"Deploy"**
6. Wait 2–3 minutes
7. Vercel will give you a free URL like: `https://letvc-innovations-club.vercel.app`

**Your system is now LIVE on the internet!**

---

## PHASE 4 — FIRST USE AS ADMIN

### Step 12 — Log In and Configure
1. Open your Vercel URL in any browser
2. Log in with your admin email and password
3. You will land on the **Dashboard**

### Step 13 — Explore Your Admin Powers
As admin, you can:

**Members Tab:**
- View all 18 pre-loaded members from the registry
- Add new members (click "Register Member")
- Edit any member's details (click "Edit")
- Remove members (click "Del" → confirm)
- Export the full member list as CSV

**Ideas Tab:**
- Submit innovation ideas
- Approve/reject/fund ideas from the status dropdown
- Delete any idea

**Projects Tab:**
- Create new projects (click "New Project")
- Assign team members and mentors to projects
- Update project progress with the slider
- Post project updates

**Events Tab:**
- Schedule hackathons, workshops, pitch nights, meetings
- Edit or delete events

**Mentors Tab:**
- All 10 technical mentors are pre-loaded
- Add, edit, or remove mentors

**Announcements Tab:**
- Post club notices with High/Medium/Low priority
- Edit or delete announcements

**Leaderboard Tab:**
- View members ranked by points and badges

**Admin Panel Tab:**
- Change any user's role (member → admin, editor, mentor)
- Award or deduct points from users
- Edit patron information (MUTHURA KEVIN KARITHI is pre-loaded)
- View complete audit log of all system actions
- Change your own password

### Step 14 — Make Someone Else an Admin
1. Go to **Admin Panel**
2. Find the user in the Users & Roles table
3. Click their role dropdown and select **"admin"**
4. Done — they now have full admin access

---

## PHASE 5 — SHARING THE SYSTEM WITH MEMBERS

### Step 15 — How Members Sign Up
1. Share the Vercel URL (e.g. `https://letvc-innovations-club.vercel.app`) with members
2. Members click **"Register"** tab on the login screen
3. They fill in their name, department, admission number, phone, email, and password
4. They verify their email (Supabase sends a confirmation email)
5. They log in — they are automatically assigned the `member` role

**Note:** Members will see a separate registry of pre-loaded members in the Members tab. When members register an account, they appear in the Users & Roles section in Admin Panel. You can match them up.

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| `npm install` fails | Check internet connection; make sure Node.js is installed correctly |
| Blank screen after login | Check your `.env.local` keys are correct and saved |
| "Invalid API key" error | Re-copy your Supabase anon key — make sure there are no spaces |
| Members not showing | Make sure you ran `supabase_schema.sql` fully in Step 2 |
| Can't log in | Check you set the profile role to `admin` in Supabase Table Editor |
| Vercel deploy fails | Make sure both environment variables are added in Vercel |
| Email confirmation not arriving | Check spam folder; in Supabase → Auth → Settings → disable "Confirm email" for easier testing |

---

## SYSTEM SUMMARY

### Pages / Modules
1. **Dashboard** — Overview, stats, announcements, upcoming events, active projects, patron details
2. **Members** — Full registry with search, filter, add, edit, delete, export CSV
3. **Ideas** — Reddit-style feed with upvoting, comments, categories, status tracking
4. **Projects** — Project tracker with team assignment, mentor assignment, progress slider, update log
5. **Events** — Hackathons, workshops, pitch nights with upcoming/past tabs
6. **Mentors** — All 10 technical mentors with profiles and expertise areas
7. **Announcements** — Club notices with priority levels
8. **Leaderboard** — Gamification — members ranked by points and badges
9. **Admin Panel** — User/role management, patron editing, audit log, password management
10. **Profile** — Each user's personal profile, skills, badges, points

### Security
- All data protected by Supabase Row Level Security (RLS)
- Only admins can write to members, projects, events, mentors, announcements
- Members can submit ideas, vote, and comment
- Full audit trail of all admin actions

---

## UPDATING YOUR SYSTEM IN THE FUTURE

If you need to update code:
1. Make changes to your files
2. In Terminal, run:
   ```
   git add .
   git commit -m "Update: describe what you changed"
   git push
   ```
3. Vercel automatically detects the push and re-deploys in 2–3 minutes

---

*LETVC Innovations Club System — Built with React + Supabase + Vercel*
*All free. All yours.*
