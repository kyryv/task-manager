# Tasks

A personal task manager that runs in the browser and can be installed on a phone or PC like an app.
Each person signs in with their own Google account and gets their own private list, synced between devices.

- **Web address:** https://kyryv.github.io/task-manager/
- **Data:** stored in Firebase Firestore, one document per task at `users/{uid}/tasks/{taskId}`,
  categories at `users/{uid}/meta/categories`. Works offline; changes sync when you are back online.
- **Who can use it:** only Google accounts on the owner's allowed list (kept in the database, never in this repository).

The app files are in [`docs/`](docs/) (served by GitHub Pages). The database rules are in [`firestore.rules`](firestore.rules).

---

## Setup (owner, once)

You need a free Firebase project (Spark plan, no card) and this repository on GitHub Pages.

### 1. Create the Firebase project
1. Open https://console.firebase.google.com and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name it, e.g. `my-tasks`. Click **Continue**.
4. Turn **Google Analytics** off. Click **Create project**, wait, then click **Continue**.
5. The project uses the free **Spark** plan by default. Do not upgrade.

### 2. Turn on Google sign-in
1. In the left menu: **Build → Authentication** → **Get started**.
2. Tab **Sign-in method** → **Google** → switch **Enable** on.
3. Choose your email as **Project support email** → **Save**.

### 3. Create the Firestore database
1. Left menu: **Build → Firestore Database** → **Create database**.
2. Pick a location near you (e.g. `eur3 (europe-west)`), **Next**.
3. Choose **Start in production mode** → **Create**.

### 4. Add the web app and copy its settings
1. Click the gear icon next to **Project Overview** → **Project settings**.
2. Under **Your apps**, click the web icon **`</>`**.
3. App nickname: `tasks`. Leave **Firebase Hosting** unticked. Click **Register app**.
4. You will see `const firebaseConfig = { ... }`. Copy the values into [`docs/firebase-config.js`](docs/firebase-config.js),
   replacing each `PASTE…` value. Click **Continue to console**.

The config values are not passwords: they only name your project. Access is protected by the rules and the authorized domains.

### 5. Publish the database rules
1. **Build → Firestore Database** → tab **Rules**.
2. Delete everything in the editor, paste the whole content of [`firestore.rules`](firestore.rules).
3. Click **Publish**.

### 6. Add allowed people
1. **Build → Firestore Database** → tab **Data** → **+ Start collection**.
2. Collection ID: `allowed` → **Next**.
3. Document ID: the Google email address **in lowercase**, e.g. `friend@gmail.com`.
4. Add one field so the document can be saved: field `added`, type `string`, value e.g. `yes`. **Save**.
5. For more people: open the `allowed` collection → **+ Add document**, same steps.
   To remove someone, delete their document.

### 7. Allow sign-in from GitHub Pages
1. **Build → Authentication** → tab **Settings** → **Authorized domains** → **Add domain**.
2. Enter `<your-github-name>.github.io` (no `https://`, no path) → **Add**.

### 8. Publish on GitHub Pages
Repository **Settings → Pages** → Source: **Deploy from a branch** → Branch **main**, folder **/docs** → **Save**.
After a minute the app is at `https://<your-github-name>.github.io/task-manager/`.

---

## What the rules do, in simple words
- Nobody can read or change anything unless they are signed in with a verified Google account.
- A signed-in person must also be on the **allowed** list (a document named after their email in the `allowed` collection).
  Only the owner can change that list, in the Firebase console.
- Each person can read and write **only their own** folder, `users/<their id>/…`. They can never see anyone else's tasks.
- A person can check only whether **their own** email is on the list (that is how the app shows “This account has no access”).
- Everything else in the database is closed.

The app owner can still see stored data in the Firebase console. The sign-in screen says so.

---

## Install the app

**iPhone / iPad (Safari)**
1. Open the web address in **Safari**.
2. Tap the **Share** button (square with an arrow).
3. Scroll down and tap **Add to Home Screen** → **Add**.
4. Open **Tasks** from the home screen and sign in.

**Android (Chrome)**
1. Open the web address in **Chrome**.
2. Tap the **⋮** menu → **Install app** (or **Add to Home screen**) → **Install**.
3. Open **Tasks** from the home screen or app drawer and sign in.

**PC (Chrome or Edge)**: click the install icon at the right end of the address bar, or **⋮ → Install Tasks**.

---

## Moving tasks in (and backups)
- **Settings (⚙) → Import backup…** or drop a `.json` file anywhere on the page.
  Accepts files made with **Export (.json)**, the PC version's export, and the old *Task Manager.html* “Download backup”
  (an object with a `tasks` list, or a plain list). Missing fields get the app's usual defaults.
- Tasks keep their id, so importing the same file twice never makes duplicates.
- After each import a report shows: tasks in the file, added, skipped (already there), rejected (with the reason),
  and how many tasks your account holds now.
- **Settings → Export (.json)** downloads every task of your account (all statuses) as `tasks-YYYY-MM-DD_HHMMSS.json`.

## Privacy
Tasks are stored in the owner's Firebase project. Each user's list is private to them,
but the owner can technically see stored data. No task data is stored in this repository.
