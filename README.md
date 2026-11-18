# 7eta b3eeda — Café & Market

Responsive Arabic-first café and market storefront with product catalog, cart, WhatsApp checkout, Firebase Firestore orders, and Firebase Authentication admin area.

## 1) WhatsApp number (already configured)
The café WhatsApp number is already set to `201096173410` (Egypt international format). You do not need to edit it.

## 2) Create and connect Firebase
1. Open https://console.firebase.google.com/ and create a project named `7eta-b3eeda` (the unique Project ID may need a suffix if already taken).
2. In Project Overview, add a **Web App** and copy the Firebase web config values into `firebase-config.js`. Replace every `YOUR_...` placeholder. The web config is intended for browser apps; Firestore Security Rules protect the data.
3. In **Build → Authentication → Get started → Sign-in method**, enable **Email/Password**.
4. In **Build → Firestore Database**, create a database (choose a region close to your customers, then start in production mode).
5. In **Hosting**, click Get started if prompted.
6. Create your admin login under **Authentication → Users → Add user**. Use an email and password you control; do not put passwords in this project.

## 3) Grant the admin role securely
The Admin page requires the Firebase custom claim `admin: true`; creating an email/password user alone does not grant admin access. Set the claim only from a trusted local environment with Firebase Admin SDK. Never put a service-account key in the website or upload it to GitHub.

After creating the admin user, copy that user's UID from Authentication → Users. Download a service-account JSON only to your own computer from Project settings → Service accounts, save it beside this project as `serviceAccountKey.json`, then run:

```bash
npm install
node scripts/set-admin-claim.js YOUR_ADMIN_UID
```

The script assigns `admin: true`. Delete the local service-account JSON from any shared folder after use and keep it private. Sign out and sign back in to refresh the ID token.

## 4) Deploy Firestore rules and Firebase Hosting
From the project folder, install and sign in to Firebase CLI, then link your project:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

Choose the project you created and set it as `default`. Then deploy both Hosting and the Firestore rules:

```bash
firebase deploy --only hosting,firestore:rules
```

Firebase will print your live `https://PROJECT_ID.web.app` address. Hosting serves static files over HTTPS. See the official [Firebase Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart).

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc
# edit .firebaserc and replace YOUR_PROJECT_ID
firebase deploy --only firestore:rules,hosting
```

## 5) Products and images
The starter catalog is demo content. Replace prices and names with the real menu from the Admin page after Firebase is configured. Add an image URL for a product in Admin to use a real product photo; otherwise the card uses its emoji illustration.

## 6) Local preview
Because the app uses ES modules, serve the folder over HTTP rather than opening `index.html` directly:

```bash
python3 -m http.server 8080
```
Then open http://localhost:8080.

## Notes
- Without Firebase credentials, the site runs in local demo mode. Orders and cart are stored in that browser only; admin edits are not shared across devices.
- The WhatsApp number is configured. Firebase web credentials and Project ID are still required, so the project is not yet connected to a live Firebase project or deployed to a public domain.
