# Zamex website

A complete static website — no Framer, no build step. Upload this folder as-is.

| File | Page |
|---|---|
| `index.html` | Home |
| `contact.html` | Contact form |
| `quote.html` | Request a quote form |
| `404.html` | "Page not found" (Vercel and GitHub Pages show it automatically) |
| `assets/` | Photos, videos, coin logos, favicon |
| `vendor/` | Preact + htm (tiny open-source libraries the pages run on, MIT licensed) |
| `site-config.js` | Where the forms send, and where the site asks for the visitor's country |
| `cloudflare-worker.js` | Copy of the Cloudflare Worker code (forms → Telegram, and country lookup) |

## Publish on Vercel (recommended, free)

1. Create a free GitHub account and a new repository called `zamex-site`.
2. On the repository page click **Add file → Upload files**, drag in **everything inside this folder**
   (not the folder itself), and click **Commit changes**.
3. vercel.com → sign in with GitHub → **Add New → Project** → import `zamex-site` →
   Framework preset: **Other** → **Deploy**.
4. Your site is live at `https://zamex-site.vercel.app` (or similar). Uploading changed files to GitHub republishes automatically.
5. Custom domain (e.g. zamex.tj): Vercel → Project → **Settings → Domains → Add**, then add the DNS records Vercel shows.

## Or GitHub Pages (also free)

Do steps 1–2, then repository → **Settings → Pages** → Branch: `main`, folder `/ (root)` → **Save**.
The site appears at `https://YOUR-USERNAME.github.io/zamex-site/`.

## Cloudflare Worker (forms + automatic language)

1. Cloudflare → **zamex-forms → Edit code** → replace everything with `cloudflare-worker.js` → **Deploy**.
2. **Settings → Variables and Secrets** → add Text variable **`ALLOWED_ORIGINS`** = your site address(es),
   comma-separated, `https://`, no `/` at the end — e.g. `https://zamex-site.vercel.app,https://zamex.tj`.
3. Submit each form once on the live site — the message appears in "Zamex IT Support".

## Language

- A visitor's own choice (EN / RU / TJ menu) is remembered and always wins.
- Otherwise the site opens by country: Tajikistan → Tajik; Russia, Kazakhstan, Uzbekistan, Kyrgyzstan,
  Belarus, Turkmenistan, Azerbaijan, Armenia, Georgia, Moldova → Russian; every other country → English.
- If the country can't be determined → Russian.
- To change the country lists, edit `RU_COUNTRIES` / `langForCountry` near the top of the script in each `.html` file.

## Editing text later

All visible text (EN / RU / TJ) is in the `const T = { en: {...}, ru: {...}, tg: {...} }` block near the
bottom of each `.html` file. Change the words between the quotes and upload the file again.
