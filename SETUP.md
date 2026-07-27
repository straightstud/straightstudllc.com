# Straight Stud Construction LLC — Website Setup

Professional multi-page site: portfolio, contact/customer service, security headers, and legal pages.

## Quick start (preview on your PC)

1. Open the project folder: `straightstudllc.com`
2. Double-click `index.html`, **or** right-click → Open with your browser
3. For best results, use a simple local server (optional):
   - VS Code: “Live Server” extension
   - Or PowerShell: `npx --yes serve .`

## What you have

| Page | Purpose |
|------|---------|
| `index.html` | Home — hero, services, featured work, CTA |
| `portfolio.html` | Filtered photo gallery by category |
| `about.html` | Company story & process |
| `contact.html` | Quote form + customer service info |
| `privacy.html` | Privacy Policy |
| `terms.html` | Terms of Use |
| `liability.html` | Liability / construction disclaimer |
| `css/styles.css` | Full professional styling |
| `js/main.js` | Mobile nav, filters, lightbox, form checks |
| `_headers` / `.htaccess` | Security headers for hosting |

## 1. Add your logo and photos

```
assets/logo/logo.png          ← company logo
assets/hero/hero.jpg          ← homepage banner (wide photo)
assets/portfolio/decks/
assets/portfolio/additions/
assets/portfolio/siding/
assets/portfolio/custom-homes/
```

See `assets/portfolio/README.txt` for exact HTML to paste when adding each photo.

## 2. Quote form → request@straightstudllc.com

The contact form posts to **FormSubmit** and emails **request@straightstudllc.com**.

1. Deploy the site (or use the live domain).
2. Submit a **test quote** once from the Contact page.
3. Open **request@straightstudllc.com** and click FormSubmit’s **activation / confirm** link (one-time).
4. After that, every “Request Free Quote” submission lands in that inbox.
5. Reply from your email — Reply-To is the customer’s address.

Spam protection: honeypot fields + double-submit lock. Success redirect: `contact.html?sent=1`.

## 3. Security checklist (do these when you go live)

- [ ] **HTTPS only** — free SSL via your host (Let’s Encrypt / Cloudflare)
- [ ] Upload `_headers` (Netlify/Cloudflare Pages) **or** `.htaccess` (Apache/cPanel)
- [ ] Uncomment HTTPS redirect in `.htaccess` after SSL works
- [ ] Use Formspree (or similar) — never put your email password in the website code
- [ ] Keep software/hosting updated; don’t upload random PHP “contact scripts” from the internet
- [ ] Strong password on domain registrar, hosting, and email
- [ ] Prefer 2FA on email and hosting accounts
- [ ] Don’t publish client addresses, open house codes, or invoice numbers on the public site

### What the site already does for security

- No database or login surface to attack
- Static HTML (smaller attack surface)
- Honeypot anti-bot on the contact form
- Client-side validation + submit lock
- Security-minded meta tags + CSP / frame-deny headers (via host config)
- Blocks common backup-file exposure patterns in `.htaccess`

## 4. Legal pages (what you should know)

| Document | Why it matters |
|----------|----------------|
| **Privacy Policy** | Explains data from the contact form & emails; expected for any site collecting info |
| **Terms of Use** | Rules for using the website; IP ownership of your photos/logo |
| **Liability Disclaimer** | Clarifies website ≠ contract; estimates aren’t bids; job-site safety; insurance notes |

**Important:** These are solid starting templates for a small construction company site. They are **not legal advice**. Consider a quick review by a Michigan business attorney, especially before heavy advertising or large contracts. Your **signed project contracts** and insurance still do the real legal work for jobs.

Other good practices (optional later):

- Written contracts for every job
- Certificate of insurance ready to send
- Photo release if clients are identifiable
- Accessibility improvements over time (alt text, contrast — already started)

## 5. Publish the site

Any static host works:

- **Cloudflare Pages** or **Netlify** — free HTTPS + `_headers` support  
- **cPanel / GoDaddy / Bluehost** — upload all files via File Manager or FTP; use `.htaccess`  
- Point your domain `straightstudllc.com` DNS to the host  

Upload the **contents** of this folder (not a nested extra folder) so `index.html` is at the web root.

## 6. Optional polish

- Add a phone number on `contact.html` when you want calls publicly listed  
- Google Business Profile linked to this site  
- Compress photos (e.g. [squoosh.app](https://squoosh.app)) before upload  
- Replace “Licensed & Insured” with your actual license details if you want them public  

## Support email on site

Currently: **request@straightstudllc.com**

Update that string across pages if it changes (search the project for it).
