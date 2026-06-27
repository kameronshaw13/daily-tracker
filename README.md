# Momentum Daily App

A mobile-first Next.js app built from the daily tracker base and converted into a daily routine app for schedule, food ideas, workouts, reading, app work, presence goals, and progress history.

## Run locally

```bash
cd ~/Downloads
rm -rf momentum-daily-app
unzip momentum-daily-app.zip -d momentum-daily-app
cd momentum-daily-app
npm install
npm run dev
```

## Push to GitHub / Vercel

If you want this to replace your existing daily-tracker repo:

```bash
cd ~/Downloads
rm -rf momentum-daily-app
unzip momentum-daily-app.zip -d momentum-daily-app

rm -rf daily-tracker
mv momentum-daily-app daily-tracker
cd daily-tracker

npm install
npm run build

git init
git add .
git commit -m "replace daily tracker with momentum app"
git branch -M main
git remote add origin https://github.com/kameronshaw13/daily-tracker.git
git push -u origin main --force

npx vercel --prod
```

If your local `daily-tracker` folder already has the GitHub remote set up, use this instead:

```bash
cd ~/Downloads
rm -rf momentum-daily-app
unzip momentum-daily-app.zip -d momentum-daily-app
rsync -av --delete momentum-daily-app/ daily-tracker/
cd daily-tracker
npm install
npm run build
git add .
git commit -m "replace daily tracker with momentum app"
git push origin main
npx vercel --prod
```
