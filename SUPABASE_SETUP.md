
# Supabase Setup Guide

This guide will help you set up a PostgreSQL database on Supabase for the VOD Sites Manager, so data is shared across all users.

## Prerequisites Checklist

Before deploying, ensure you have these from your Supabase project (**Project Settings → API**):

| Value | Example | Where to get it |
|-------|---------|-----------------|
| Project URL | `https://xxxx.supabase.co` | Project Settings → API → Project URL |
| `anon` public key | starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…` | Project Settings → API → `anon` `public` |
| `service_role` secret | same format, labeled **secret** | Project Settings → API → `service_role` **secret** (do NOT expose this in frontend code) |

Set these **before** deploying the app. On Vercel: **Project → Settings → Environment Variables** add:

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_URL` | your Project URL | Production + Preview + Development |
| `SUPABASE_ANON_KEY` | your `anon` public key | Production + Preview + Development |
| `SUPABASE_SERVICE_ROLE_KEY` | your `service_role` **secret** | Production + Preview + Development |
| `JWT_SECRET` | a long random string (min 32 chars, e.g. `openssl rand -hex 32`) | Production + Preview + Development |

After adding Vercel env vars, **redeploy** (new commit or Vercel dashboard → Deployments → … → Redeploy). They do not apply to existing production deployments automatically.

---

## Step 1: Create a Supabase Project

1. Go to https://supabase.com/ and sign up/log in with your GitHub account
2. Click **New Project**
3. Fill in your project details:
   - Name: `vod-sites`
   - Database Password: Choose a strong password (save this somewhere safe!)
   - Region: choose the one closest to you
4. Click **Create New Project** and wait for it to finish (it takes a couple minutes)

---

## Step 2: Run the SQL Schema (BOTH files, in order)

### Step 2A — Create the `sites` table

1. In your Supabase project, go to **SQL Editor** → **New Query**
2. Copy the SQL from `sql/001-init.sql`
3. Paste it into the editor and click **Run**

You should see "Success. No rows returned."

### Step 2B — Create the `users` table (required for login!)

1. Still in **SQL Editor** → **New Query**
2. Copy the SQL from `sql/002-users-auth.sql`
3. Paste it into the editor and click **Run**

You should see "Success. No rows returned."

### Verify tables exist

Go to **Table Editor**. You should see BOTH of these tables listed:

- `sites`
- `users`

If either is missing, re-run the corresponding SQL file above.

---

## Step 3: Create Your First Admin User (chicken-and-egg fix)

The app's **Add New User** button requires you to be logged in. You must create the first user manually using **one** of the two methods below. Method A is recommended.

### Method A — Supabase Auth Dashboard (fastest, recommended)

1. In Supabase go to **Authentication → Users** (left sidebar)
2. Click **Add user** → **Create new user**
3. Enter:
   - **Email Address**: your admin email (e.g. `admin@yourcompany.com`)
   - **Password**: a strong password you will use to log in to the app
   - ✅ **Auto confirm user** (check this — otherwise login fails until email is confirmed)
4. Click **Create user**
5. Done. That user can immediately log in to the app. When they first log in, the login API automatically mirrors a matching row into the `public.users` table (user management page uses this table for status/created-at display).

### Method B — Custom scrypt hash via SQL INSERT (public.users only, no Supabase Auth)

Use this if you do NOT want to create users in Supabase Auth at all and instead want credentials stored only in `public.users`.

From your project directory run:

```bash
node scripts/hash-password.cjs admin@yourcompany.com "YourStrongPassword123" "Admin User"
```

It prints a SQL INSERT statement. Copy the output and run it in **Supabase → SQL Editor → New Query → Run**.

Example output:
```sql
INSERT INTO users (id, email, password_hash, full_name, is_active)
VALUES (gen_random_uuid(), 'admin@yourcompany.com', 'a1b2c3…hash…here', 'Admin User', true);
```

Note: Users created only in `public.users` (Method B) do NOT appear in Supabase Auth. The app works the same either way — login.ts checks both locations.

---

## Step 4: (Optional) Seed Initial Sites Data

If you want to add the sites from `data.ts` to your database, you can use the Supabase **Table Editor** or run INSERT queries in the SQL Editor.

---

## Step 5: Deploy Your App

Push the code to your connected GitHub repo. Vercel will automatically deploy the new version. **Ensure** the 4 environment variables in the Prerequisites section above are set first.

---

## Appendix: Diagnostic Codes (from failed login responses)

When a login fails with HTTP 401, the JSON response body includes a `diagnostic_code`. Use this to pinpoint the issue:

| diagnostic_code | Meaning | Fix |
|-----------------|---------|-----|
| `L401-AUTHFAIL` | Supabase Auth rejected the email/password combination. Either the user doesn't exist in Supabase Auth, or the password is wrong. | Go to **Authentication → Users** in Supabase and confirm the email exists there. If not, use Step 3 (Method A) above to create the user. If it exists, reset the user's password via the Auth dashboard. |
| `L401-NOUSER` | Edge case: a local `public.users` row was found but its custom-hash password didn't match AND Supabase Auth has no matching user. | If you created the user via Method B (SQL INSERT only), re-check that you ran the INSERT statement against the **correct** Supabase project and that the email matches exactly (case-insensitive). |
| `L500-CATCH` | Server crashed. Check Vercel Function Logs (Vercel → Project → Functions → search `login`) for the full exception. | Most common cause: missing env vars. Confirm all 4 env vars from Prerequisites are set and the deployment has been redeployed. |

