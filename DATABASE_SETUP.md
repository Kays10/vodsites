
# Database Setup Guide

This guide will help you set up a PostgreSQL database on Neon for the VOD Sites Manager, so data is shared across all users.

## Step 1: Set up a Neon Database

1. Go to https://neon.tech/ and sign up/log in with your GitHub account
2. Click "Create Project"
3. Fill in your project details:
   - Project name: `vod-sites`
   - PostgreSQL version: use the latest stable version
   - Region: choose the one closest to you
4. Click "Create Project"

## Step 2: Get your Database Connection URL

1. After creating your project, you'll see your connection string (it will look like `postgresql://user:password@hostname:5432/dbname`)
2. Copy this URL!

## Step 3: Add the Connection URL to Vercel

1. Go to your Vercel dashboard and select your project
2. Click "Settings" → "Environment Variables"
3. Add a new environment variable:
   - Name: `DATABASE_URL`
   - Value: paste your full Neon connection string
   - Click "Save"

## Step 4: Run the SQL Schema

Now we need to create the `sites` table in our database:

1. In your Neon project, go to "SQL Editor"
2. Copy the SQL from `sql/001-init.sql`
3. Paste it into the SQL Editor and click "Run"

## Step 5: Deploy the App

Now push your code to GitHub (which we just did) and Vercel will automatically deploy the new version!

## Step 6: (Optional) Seed the Database with Initial Data

If you want to add the initial sites from `data.ts` to the database, you can run this query (replace with your data):

```sql
-- Example INSERT (repeat for each site)
INSERT INTO sites (
  id, name, "group", services, vpn, pms, hsia, ip,
  iptv_system, iptv_url, casting_url, headend, headend_url,
  switches, wlan_controller, wlan_controller_url, notes, other
) VALUES (
  '1',
  '2TEN Hotel & Convention Centre',
  'IND',
  '["IPTV","Casting","Chromecasts","HSIA","WLAN Controller","Switches"]',
  'Hoist/Planet -VPN',
  'Fidelio Opera PMS',
  'Fusion Hummingbird',
  '10.167.143.1/ods/admin/',
  'Fusion IPTV',
  'https://10.167.143.1/ods',
  '192.168.100.2:80',
  'WISI GN50',
  'http://10.167.143.150/',
  'HP Procurve 1808\nCISCOSW -',
  'Ruckus_SZ100-1G',
  'https://10.167.143.3:8443/wsg/',
  'HOIST VPN/TEC',
  'CAST2TV_Fusion'
);
```

That's it! Now your app will use the shared database instead of localStorage! 🎉
