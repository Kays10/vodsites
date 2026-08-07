
# Debug Session: login-not-working

**Status:** [OPEN]
**Session ID:** login-not-working
**Started:** 2026-08-08
**Symptom:** User reports "login now working" -> then "not working. sorry" after attempted fix. Awaiting precise symptom details.

---

## Hypotheses (falsifiable)

| # | Hypothesis | Observable Test Point |
|---|-----------|----------------------|
| H1 | Vercel CLI / `vercel dev` is not installed or linked, so `npm run dev` fails immediately | Running `npm run dev` exits with error about missing vercel or unlinked project |
| H2 | Environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET) are not set in `.env.local` or Vercel project vars | Login API returns 500 "Supabase URL not configured" or similar |
| H3 | No user accounts exist yet in the database (neither public.users table nor auth.users) | Login returns 401 "Invalid email or password" even for "correct" credentials |
| H4 | RLS policy on public.users is blocking the `select` / password lookup via service role | Supabase query in login.ts returns an RLS error |
| H5 | The public.users table / `password_hash` column does not exist or has wrong schema | Login API crashes with 500 / Postgres column-not-found error |

---

## Evidence Log (collected)

| Step | Source | Finding |
|------|--------|---------|
| E0 | User report (initial) | "login now working" then "not working. sorry" after previous 3-file dev/rewrite patch |
| E1 | User answers | Environment: **Vercel production** |
| E2 | User answers | Browser DevTools Network: **`/api/auth/login` → HTTP 401 Unauthorized** |
| E3 | User answers | Not sure if any user accounts exist in the DB |
| E4 | Static analysis | SUPABASE_SETUP.md only references `sql/001-init.sql` — **never mentions running `sql/002-users-auth.sql`** (the users table) |
| E5 | Static analysis | DEPLOYMENT.md completely omits all env var setup steps (SUPABASE_URL / SERVICE_ROLE_KEY / JWT_SECRET) — though 401 (not 500) proves those are set |
| E6 | Static analysis | No documented "create first user" step anywhere. "Add New User" in the App requires being already logged in (chicken-and-egg). Only ways: (a) Supabase Auth dashboard → Add User, (b) hash-password.cjs → SQL INSERT. |
| E7 | Logic deduction from 401 | 500 would mean env vars / DB broken. 401 means: (A) `public.users` row exists → wrong password, AND Supabase Auth also rejects; OR (B) no `public.users` row AND Supabase Auth also has no such user. |

---

## Fixes Applied During Session

| # | File | Change |
|---|------|--------|
| F0 (prev session) | package.json | `dev` changed to `vercel dev`; added `dev:vite`, `dev:api` |
| F0 (prev session) | vite.config.ts | Added `/api` proxy to `localhost:3001` |
| F0 (prev session) | vercel.json | Added explicit API route rewrites with `:path*` |
| F1 (this session) | login.ts | Added diagnostic-code instrumentation on 401 paths (Vercel logs + response body `diagnostic_code` field; no security leakage) |
| F2 (planned) | SUPABASE_SETUP.md | Add 002-users-auth.sql step + first-user creation step + env var step |
| F3 (planned) | DEPLOYMENT.md | Add env var section for Vercel |

---

## Pre-Fix ↔ Post-Fix Evidence Comparison

| Metric | Pre-Fix | Post-Fix |
|--------|---------|----------|
| (pending) | | |

---

## Root Cause (to be filled after evidence)

