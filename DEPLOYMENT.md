
# Deployment Guide

Your VOD Sites Manager can be deployed to both **Vercel** and **Azure**!

---

## ⚙️ **Before Deploying — Set These Environment Variables FIRST**

The app will not run correctly without these. You need 4 values from your Supabase project (get them at **Supabase → Project Settings → API**):

| Name | Source | Example |
|------|--------|---------|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL | `https://gbiuxqwayruyrenoynrf.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` **public** key | long JWT string starting `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` **secret** key (keep this safe; never ship it to browsers) | same format, labeled "secret" |
| `JWT_SECRET` | Generate yourself: `openssl rand -hex 32` (or any long, high-entropy random string ≥ 32 chars) | e.g. `d7f3a91c… (64 hex chars)` |

### Also run the SQL schema

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for **Step 2** (run BOTH `sql/001-init.sql` AND `sql/002-users-auth.sql`) and **Step 3** (create your first admin user — required because the app's "Add User" button needs you to already be logged in).

---

## 🚀 **Deploy to Vercel**

Vercel is the easiest way to deploy this app - it's free for small projects and auto-detects Vite projects automatically. It also natively runs the `/api/*` Vercel Functions (login, sites CRUD, users CRUD) — do NOT deploy to Azure Static Web Apps if you want login to work without a separate API host.

### Step 1: Configure Environment Variables on Vercel

**Do this before your first deploy** (or redeploy after setting them):

1. Go to https://vercel.com and select your project (or create it in Step 2 below first)
2. Go to **Settings → Environment Variables**
3. Add each variable from the table above. For each one:
   - **Type**: Plaintext
   - **Environments**: select ✅ Production, ✅ Preview, ✅ Development (all three)
4. **Save**
5. **Redeploy**: Go to **Deployments**, click the … menu on your newest successful production deployment, click **Redeploy**. Without this step, the new env vars are NOT used by the currently running production deployment.

### Step 2: Push to GitHub

First, push your code to GitHub (or any Git provider):

```bash
# Create a repository on GitHub first, then:
git remote add origin https://github.com/your-username/vod-sites-manager.git
git branch -M main
git push -u origin main
```

### Step 3: Import Project into Vercel

1. Go to https://vercel.com
2. Sign up/login with your GitHub account
3. Click **Add New… → Project**
4. Import your `vod-sites-manager` repository
5. Vercel will automatically detect it's a Vite project
6. Click **Deploy**
7. Wait for the deployment to complete (typically 1–2 minutes)

### Step 4: Verify Deployment

1. Open the production URL Vercel shows you
2. Confirm the login page loads
3. Attempt to sign in with the admin user you created in Supabase (see SUPABASE_SETUP.md Step 3)
4. If login fails, open Browser DevTools → **Network** tab, click the `/api/auth/login` request, and check:
   - **Status**: should be 200 on success, 401 on bad credentials
   - **Response body** (on 401/500): look for the `diagnostic_code` field and use the lookup table at the bottom of [SUPABASE_SETUP.md](./SUPABASE_SETUP.md#appendix-diagnostic-codes-from-failed-login-responses) to diagnose

---

## 🌐 **Deploy to Azure**

⚠️ **Note**: Azure Static Web Apps does **not** natively execute Vercel Functions (`/api/auth/login`, `/api/sites`, `/api/users`). To deploy to Azure you must host the `/api` endpoints separately (e.g., on Azure Functions or Vercel). Use Vercel deployment above unless you have a specific Azure requirement.

### Option 1: Azure Static Web Apps (Hosts frontend only. API runs elsewhere.)

#### Step 1: Create an Azure Account

If you don't have one, create a free account at https://azure.com/free

#### Step 2: Create a Static Web App

1. Go to the Azure Portal: https://portal.azure.com
2. Search for **Static Web Apps** and click **Create**
3. Fill in the details:
   - **Subscription**: Your subscription
   - **Resource Group**: Create new or use existing
   - **Name**: vod-sites-manager (or your preferred name)
   - **Plan type**: Free (for development/testing)
   - **Region**: Choose the one closest to you
4. For **Deployment details**:
   - **Source**: GitHub
   - Sign in to GitHub and select your repository
   - Select the main branch
5. For **Build Details**:
   - **Build presets**: Vite
   - **App location**: `/`
   - **Output location**: `dist`
6. Click **Review + create** → **Create**

#### Step 3: Wait for Deployment

Azure will automatically build and deploy your app!

#### Step 4: Point API endpoints at a real API host

Since Azure Static Web Apps does not run Vercel Functions, the `/api/*` endpoints used by login will 404 unless you separately deploy the contents of the `/api` folder to:
- Azure Functions, or
- Vercel (the recommended full-stack host for this project)

In either case, update the `API_BASE` constant in `src/App.tsx` to point at the API host, or configure custom routing in Azure to forward `/api/*` requests to it.

### Option 2: Azure App Service

1. Build your app: `npm run build`
2. Zip the `dist` folder
3. In Azure Portal, create an App Service
4. Upload the zip file

Same caveat as above: the `/api/*` Vercel Functions do not run on App Service out of the box.

---

## 🔄 **Automatic Deployments**

Both platforms support automatic deployments:
- **Vercel**: Automatically deploys when you push to main
- **Azure Static Web Apps**: Automatically deploys when you push to main

---

## 📱 **Both Deployed!**

Now you have your VOD Sites Manager available on both platforms! 🎉

