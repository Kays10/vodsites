
# Supabase Setup Guide

This guide will help you set up a PostgreSQL database on Supabase for the VOD Sites Manager, so data is shared across all users.

## Step 1: Create a Supabase Project

1. Go to https://supabase.com/ and sign up/log in with your GitHub account
2. Click "New Project"
3. Fill in your project details:
   - Name: `vod-sites`
   - Database Password: Choose a strong password (save this somewhere safe!)
   - Region: choose the one closest to you
4. Click "Create New Project" and wait for it to finish (it takes a couple minutes)

## Step 2: Get Your Supabase Credentials

1. Once your project is ready, click on it in the dashboard
2. Go to "Project Settings" → "API"
3. Copy these two values:
   - **Project URL** (starts with `https://`)
   - **service_role** secret (under "Project API keys")

## Step 3: Add Credentials to Vercel

1. Go to your Vercel dashboard and select your project
2. Click "Settings" → "Environment Variables"
3. Add these two new environment variables:
   - Name: `SUPABASE_URL`
     Value: paste your Project URL
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
     Value: paste your service_role secret
4. Click "Save"

## Step 4: Run the SQL Schema

Now let's create the `sites` table:

1. In your Supabase project, go to "SQL Editor" → "New Query"
2. Copy the SQL from `sql/001-init.sql`
3. Paste it into the editor and click "Run"

## Step 5: (Optional) Seed Initial Data

If you want to add the sites from `data.ts` to your database, you can use the Supabase "Table Editor" or run INSERT queries in the SQL Editor!

## Step 6: Deploy Your App

We already pushed the code changes, so Vercel will automatically deploy the new version!

That's it! Now your app uses Supabase as a shared database! 🎉
