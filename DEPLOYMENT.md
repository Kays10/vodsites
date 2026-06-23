# Deployment Guide

Your VOD Sites Manager can be deployed to both **Vercel** and **Azure**!

## 🚀 **Deploy to Vercel**

Vercel is the easiest way to deploy this app - it's free for small projects and auto-detects Vite projects automatically.

### Step 1: Push to GitHub
First, push your code to GitHub (or any Git provider):

```bash
# Create a repository on GitHub first, then:
git remote add origin https://github.com/your-username/vod-sites-manager.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to https://vercel.com
2. Sign up/login with your GitHub account
3. Click "Add New… → Project
4. Import your `vod-sites-manager` repository
5. Vercel will automatically detect it's a Vite project
6. Click "Deploy" – that's it!

## 🌐 **Deploy to Azure**

### Option 1: Azure Static Web Apps (Recommended)

#### Step 1: Create an Azure Account
If you don't have one, create a free account at https://azure.com/free

#### Step 2: Create a Static Web App
1. Go to the Azure Portal: https://portal.azure.com
2. Search for "Static Web Apps" and click "Create"
3. Fill in the details:
   - **Subscription**: Your subscription
   - **Resource Group**: Create new or use existing
   - **Name**: vod-sites-manager (or your preferred name)
   - **Plan type**: Free (for development/testing)
   - **Region**: Choose the one closest to you
4. For "Deployment details":
   - **Source**: GitHub
   - Sign in to GitHub and select your repository
   - Select the main branch
5. For "Build Details":
   - **Build presets**: Vite
   - **App location**: /
   - **Output location**: dist
6. Click "Review + create" → "Create"

#### Step 3: Wait for Deployment
Azure will automatically build and deploy your app!

### Option 2: Azure App Service

1. Build your app: `npm run build`
2. Zip the `dist` folder
3. In Azure Portal, create an App Service
4. Upload the zip file

## 🔄 **Automatic Deployments

Both platforms support automatic deployments:
- **Vercel**: Automatically deploys when you push to main
- **Azure Static Web Apps**: Automatically deploys when you push to main

## 📱 **Both Deployed!**

Now you have your VOD Sites Manager available on both platforms! 🎉
