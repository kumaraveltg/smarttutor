# AI Maths Tutor — Frontend

React + Vite + Tailwind + React Router. Covers two areas:

- **/admin/*** — CRUD console for Users, Roles, List of Values, Questions, Answers
  (driven by a single config file, `src/config/entities.js`)
- **/practice** — student chat panel: shows a question, student types an answer,
  posts to the practice service, renders correct/wrong + AI feedback/hint

## Setup

```bash
npm install
cp .env.example .env   # then set VITE_API_BASE_URL to your FastAPI backend
npm run dev
```

## API assumptions — confirm these with the backend

This scaffold assumes REST conventions your son's services may not match exactly.
The three places to check/adjust:

1. **`src/api/adminApi.js`** — assumes `/admin/{resource}` for list/create and
   `/admin/{resource}/{id}` for get/update/delete, where `resource` is `users`,
   `roles`, `lov`, `questions`, `answers`.
2. **`src/auth/AuthContext.jsx`** — assumes `POST /auth/login` returns
   `{ token, user: { username, role, ... } }`, and `GET /auth/me` returns the
   current user for session restore.
3. **`src/api/practiceApi.js`** — assumes `GET /practice/questions/:id` and
   `POST /practice/questions/:id/submit` with body `{ answer }`. The response
   to submit is expected to look like `{ correct: boolean, feedback, hint }` —
   `ChatPage.jsx` reads those three fields directly, so this is the one
   contract worth locking down first.

## Adding a new admin screen

Add an entry to `src/config/entities.js` (columns for the list view, fields
for the add/edit form) — no new page or route needed. `AdminListPage` and
`AdminFormPage` are generic and read the URL's `:entityKey` to pick the right
config.

## Not yet wired up

- Chapter/question picker for practice (currently loads question id `1`)
- Math input beyond plain text (swap the `<input>` in `ChatPage.jsx` for a
  math editor like MathLive/KaTeX later without touching the submit logic)
- Role dropdown in the Users form currently hardcodes `admin/teacher/student`
  — switch to loading from the Roles entity once that's live
