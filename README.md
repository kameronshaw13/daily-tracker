# Daily Progress App

A mobile-first Next.js app for tracking daily habits, schedule items, weight, screen time, mood/energy, and notes.

## Run locally

```bash
cd ~/Downloads/daily-progress-app
npm install
npm run dev
```

Open http://localhost:3000

## Upload to GitHub + Vercel

```bash
cd ~/Downloads/daily-progress-app
npm install
npm run build

git init
git add .
git commit -m "initial daily progress app"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

Then import the GitHub repo in Vercel.

## Phone install

After it is deployed, open the Vercel URL on your phone.

- iPhone Safari: Share → Add to Home Screen
- Android Chrome: menu → Add to Home screen

## Notes

This version stores data in the browser with localStorage. It is perfect for a first personal version, but data does not sync across devices yet. A future version can add Supabase or Firebase for login, cloud sync, and backups.
