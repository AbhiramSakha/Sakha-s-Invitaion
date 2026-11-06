# Wedding Invitation Website (React + Vite)

## Run locally
1. Install Node.js 18+ from https://nodejs.org
2. In this folder:
   ```
   npm install
   npm run dev
   ```
3. Open http://localhost:5173 (on your phone, use the "Network" URL shown, same Wi-Fi).

## Add photos
Copy two photos into `public/images/` named `bride.jpg` and `groom.jpg`.
(Until then, tap the photo frame to preview a photo on your own device.)

## Edit details
Names, venue and date are in `src/config.js`. Muhurtham time can be added in `src/App.jsx`.

## Build for production
```
npm run build
```
Upload the generated `dist/` folder to any static host.

## Deploy (free options)
- **Netlify**: drag and drop the `dist/` folder at https://app.netlify.com/drop
- **Vercel**: push to GitHub, import the repo, framework "Vite" (build `npm run build`, output `dist`)
- **Cloudflare Pages / GitHub Pages**: same build command and `dist` output
