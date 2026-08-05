# Google Analytics setup (2–5 minutes)

The site is already wired for GA4 via `js/analytics.js`. You only need your Measurement ID.

## 1. Create the property

1. Go to [https://analytics.google.com](https://analytics.google.com) and sign in with your Google account.
2. **Admin** (gear) → **Create property** (or use an existing one).
3. Property name: e.g. `Straight Stud Construction LLC`
4. Time zone: **United States – Michigan** (or your preference)
5. Create a **Web** data stream:
   - Website URL: `https://www.straightstudllc.com`
   - Stream name: `Website`

## 2. Copy the Measurement ID

On the data stream page, copy **Measurement ID** — it looks like:

```text
G-XXXXXXXXXX
```

## 3. Paste it into the site

Open `js/analytics.js` and set:

```js
var GA_MEASUREMENT_ID = "G-XXXXXXXXXX";
```

Save, commit, and deploy (push to GitHub Pages / your host).

## 4. Verify

1. Open your live site in a normal browser window.
2. In GA4: **Reports → Realtime** — you should see yourself within a minute or two.
3. Optional: Chrome extension “Google Analytics Debugger” for deeper checks.

## Notes

- Tracking is **off** until a valid `G-` ID is pasted (safe default).
- **Do Not Track** browsers are not tracked.
- IP anonymization is enabled in the config.
- Privacy Policy already covers Google Analytics and links to Google’s policies.
