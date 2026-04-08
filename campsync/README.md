# ⛺ BringIt

A real-time collaborative checklist for camping trips and group outings. Share a 6-character code with friends — no accounts needed.

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Angular 18 (standalone components, signals, `@if`/`@for`) |
| Database | Firebase Firestore (real-time, free Spark tier) |
| Styling | TailwindCSS 3 |
| Firebase Integration | AngularFire 18 |
| Hosting | Firebase Hosting (free tier) |

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   ├── item.model.ts         # CampItem type, categories, colors
│   │   │   └── session.model.ts      # Session type
│   │   └── services/
│   │       ├── firestore.service.ts  # Firestore CRUD & real-time listeners
│   │       ├── nickname.service.ts   # localStorage nickname (signal-based)
│   │       └── session.service.ts    # Session code management
│   ├── features/
│   │   ├── list/
│   │   │   ├── add-item.component.ts   # Form to add new items
│   │   │   ├── item-card.component.ts  # Individual item card
│   │   │   └── list.component.ts       # Main list view with filters
│   │   ├── nickname/
│   │   │   └── nickname.component.ts   # First-visit nickname modal
│   │   └── session/
│   │       └── session.component.ts    # Create / join session
│   ├── app.component.ts   # Signal-based routing orchestrator
│   └── app.config.ts      # Firebase providers
└── environments/
    ├── environment.ts
    └── environment.prod.ts
```

## Setup

### 1. Create a Firebase project

1. Go to https://console.firebase.google.com and create a new project.
2. Enable **Firestore Database** (Start in **test mode** for development).
3. In Project Settings → Your apps → add a **Web app**.
4. Copy the Firebase config object.

### 2. Configure environment

Paste your Firebase config into both environment files:

`src/environments/environment.ts` and `src/environments/environment.prod.ts`

```ts
export const environment = {
  production: false, // true for prod file
  firebase: {
    apiKey: "...",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "...",
    appId: "..."
  }
};
```

### 3. Configure Firestore security rules

In the Firebase console → Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionId} {
      allow read, write: if true;
      match /items/{itemId} {
        allow read, write: if true;
      }
    }
  }
}
```

### 4. Install & run

```bash
npm install
npm start
```

Visit http://localhost:4200

## Deploy to Firebase Hosting

```bash
# Install Firebase CLI (once)
npm install -g firebase-tools

# Login
firebase login

# Update .firebaserc with your project ID, then:
npm run build
firebase deploy
```

## Features

- **Session rooms** — 6-character code, shareable link/paste
- **Real-time sync** — Firestore listeners, all users see updates instantly
- **Categories** — Food, Drinks, Gear, Games/Activities with colored badges
- **Filter by category** with item count
- **Progress banner** — "X of Y items bought"
- **Nickname** — stored in localStorage, no login required
- **Mark as bought** — shows buyer's name, green confirmation, undoable
- **Delete items** — any session member can remove items
- **Mobile-first** — earthy green/brown palette, responsive card layout
