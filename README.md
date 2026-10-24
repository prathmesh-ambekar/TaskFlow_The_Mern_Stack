# TaskFlow

A full-stack **MERN** daily task manager. Plan your tasks each morning, tick them off during the day, and track how well you're doing with daily and monthly analysis. Repeating **daily habits** are added to every day automatically. Each user only ever sees their own data.

| Layer | Tech |
|---|---|
| Frontend | React 18, React Router, Vite |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JWT (JSON Web Token) + bcrypt password hashing |

---

## Features

- Register, log in, log out (stays logged in after a page refresh)
- **Daily planner:** every task belongs to a day. Move between days with ◀ ▶ or a date picker, and plan ahead for future days
- Progress bar and counters for the selected day; tick a checkbox to mark a task done
- **Daily habits:** tasks such as "Exercise" that are added to every day automatically. Pause, resume, rename or delete them any time
- **Missed tasks:** anything not completed by the end of its day is shown as *Missed* and lowers that day's score
- **Monthly analytics:** completion rate, missed count, perfect days, current and best streak, best day, a completion calendar (heatmap), a tasks‑per‑day chart with a table view, per‑habit success rate and your most‑missed tasks
- Create, edit and delete tasks (title, description, status, date); filter by status
- **Polished UI:** light and dark mode (remembered), progress ring, toasts, loading skeletons and smooth animations (turned off automatically if your system asks for reduced motion). Works on phones too
- Passwords stored hashed, never returned by the API
- Login/register rate limit (20 attempts per 15 minutes per IP)
- Input validation and clear error messages on both frontend and backend

---

## How it works

```
 Browser (React, :5173)
     │  fetch + "Authorization: Bearer <token>"
     ▼
 Express API (:5000/api)
     │  route → protect (checks JWT) → controller
     ▼
 Mongoose models (User, Task)
     ▼
 MongoDB (:27017, database "taskflow")
```

1. On **register/login**, the backend checks the details and returns a **JWT token**.
2. The frontend saves the token in `localStorage` and sends it with every request.
3. The backend's `protect` middleware verifies the token and attaches the logged-in user to the request.
4. Task queries always filter by **task id + owner id**, so a user can never read or change someone else's task.
5. Any error goes to one central error handler, which always replies as `{ success: false, message }`.

### Days, habits and "missed"

- Every task has a `date` stored as plain text `YYYY-MM-DD`. "Today" is worked out on the server in the `TIMEZONE` from `.env` (e.g. `Asia/Kolkata`), so the day changes at your local midnight.
- A **habit** is a task template. Whenever a day is opened (or a month is analysed), the server makes sure each active habit has one task on that day, starting from the day the habit was created. A unique index stops duplicates.
- Deleting a habit's task for one day only *hides* it (`skipped: true`), so the habit doesn't add it again.
- Pausing or deleting a habit removes its not‑yet‑started tasks from today onward. Past days are kept, so your analysis stays accurate.
- A task on a **past** day that isn't `Completed` counts as **missed**. Nothing is ever missed on today or a future day.
- On startup, older tasks that have no date get the day they were created on (`src/migrate.js`).

---

## Project structure

```
taskflow/
├── backend/                       Express REST API
│   ├── .env.example               Template for environment variables
│   ├── package.json
│   ├── scripts/
│   │   └── dev-db.js              Optional local MongoDB (npm run db), no install needed
│   └── src/
│       ├── server.js              Entry point: middleware, routes, DB connect, migrate, start server
│       ├── config/db.js           MongoDB connection (Mongoose)
│       ├── routes/
│       │   ├── authRoutes.js      /api/auth/*   (with rate limiter)
│       │   ├── taskRoutes.js      /api/tasks/*  (all require login)
│       │   ├── habitRoutes.js     /api/habits/* (all require login)
│       │   └── statsRoutes.js     /api/stats/*  (all require login)
│       ├── controllers/
│       │   ├── authController.js  register, login, getMe
│       │   ├── taskController.js  create, list (by day), get, update, delete tasks
│       │   ├── habitController.js create, list, update/pause, delete habits
│       │   └── statsController.js monthly analysis
│       ├── middleware/
│       │   ├── auth.js            protect: verifies JWT, sets req.user
│       │   └── errorHandler.js    404 handler + central error handler
│       ├── models/
│       │   ├── User.js            name, email, password (hashed)
│       │   ├── Task.js            title, description, status, date, completedAt, habit, user
│       │   └── Habit.js           title, description, startDate, active, user
│       ├── habitTasks.js          Adds each active habit's task to the requested days
│       ├── migrate.js             Gives older tasks a date on startup
│       └── utils.js               AppError, asyncHandler, signToken, date helpers
│
├── frontend/                      React app (Vite)
│   ├── .env.example               VITE_API_URL
│   ├── index.html
│   ├── vite.config.js             Dev server on port 5173
│   └── src/
│       ├── main.jsx               Mounts the app (Router + AuthProvider)
│       ├── App.jsx                Routes: /, /habits, /analytics, /login, /register (+ route guards)
│       ├── api.js                 fetch helper: adds token, parses JSON, throws errors
│       ├── dates.js               Date helpers (YYYY-MM-DD strings, formatting)
│       ├── hooks.js               useCountUp (animated numbers), useTheme (light/dark)
│       ├── context/
│       │   ├── AuthContext.jsx    Logged-in user, login/register/logout
│       │   └── ToastContext.jsx   Pop-up notifications
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx      Day planner: day navigation, progress, task list
│       │   ├── Habits.jsx         Manage daily habits
│       │   └── Analytics.jsx      Monthly analysis: summary, calendar, chart, habits, most missed
│       ├── components/
│       │   ├── Navbar.jsx         Today / Habits / Analytics links, theme toggle, logout
│       │   ├── TaskForm.jsx       Dialog for creating / editing a task
│       │   ├── Modal.jsx          Animated dialog used by the forms
│       │   ├── ProgressRing.jsx   Circular progress
│       │   ├── CountUp.jsx        Animated number
│       │   ├── AuthLayout.jsx     Frame for login / register
│       │   └── Icon.jsx           Inline SVG icons
│       └── index.css              Styles, light/dark theme tokens and animations
│
├── TaskFlow.postman_collection.json   Ready-made API requests for Postman
└── README.md
```

---

## Run it locally

### Prerequisites
- **Node.js 20+** (`node -v` to check)
- **MongoDB**, one of:
  - **A.** MongoDB Community Server installed on your PC (recommended), or
  - **B.** the built-in dev database (`npm run db`, see below), or
  - **C.** a free MongoDB Atlas cloud cluster

### 1. Clone and install

```bash
git clone git@github.com:prathmesh-ambekar/TaskFlow_The_Mern_Stack.git
cd TaskFlow_The_Mern_Stack

cd backend && npm install
cd ../frontend && npm install
```

### 2. Create the `.env` files

```bash
# from the project root
cp backend/.env.example backend/.env      # Windows: copy backend\.env.example backend\.env
cp frontend/.env.example frontend/.env    # Windows: copy frontend\.env.example frontend\.env
```

Open `backend/.env` and set a long random `JWT_SECRET`. The defaults work for everything else.

### 3. Start MongoDB

- **Installed MongoDB (A):** make sure the *MongoDB Server* Windows service is running. Nothing else to do.
- **Built-in dev DB (B):** in a separate terminal run `cd backend && npm run db` and keep it open. It downloads MongoDB once (~600 MB) and stores data in `backend/.data`.
  Do not use A and B together: both use port 27017.
- **Atlas (C):** put your Atlas connection string in `MONGO_URI` in `backend/.env`.

### 4. Start the backend

```bash
cd backend
npm run dev
```
You should see:
```
MongoDB connected: 127.0.0.1
Server running on http://localhost:5000
```
Check it: http://localhost:5000/api/health

### 5. Start the frontend (new terminal)

```bash
cd frontend
npm run dev
```
Open **http://localhost:5173** and register an account.

### 6. Daily use

1. **Once:** open **Habits** and add the things you do every day (e.g. "Exercise", "Read 20 pages").
2. **Every morning:** open **Today**. Your habits are already there; add any extra tasks for the day with **+ New Task**.
3. **During the day:** tick the checkbox when a task is done (or set it to *In Progress*).
4. **Any time:** open **Analytics** to see the month. Click a day in the calendar to open it.

### 7. (Optional) View the data in MongoDB Compass

Connect to `mongodb://127.0.0.1:27017`. After you register, a **`taskflow`** database appears with the collections `users`, `tasks` and (once you add one) `habits`.

---

## Environment variables

**`backend/.env`**

| Variable | Example | What it does |
|---|---|---|
| `PORT` | `5000` | Port the API listens on |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/taskflow` | MongoDB connection string |
| `JWT_SECRET` | *(long random string)* | Secret used to sign login tokens. **Required.** |
| `JWT_EXPIRES_IN` | `7d` | How long a login lasts |
| `CLIENT_URL` | `http://localhost:5173` | Frontend URL allowed by CORS |
| `TIMEZONE` | `Asia/Kolkata` | Your timezone; decides when "today" changes. Defaults to `UTC` |

**`frontend/.env`**

| Variable | Example | What it does |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Where the frontend sends API requests |

`.env` files are git-ignored. Never commit them.

---

## Scripts

| Folder | Command | What it does |
|---|---|---|
| backend | `npm run dev` | Start API with auto-restart on file changes |
| backend | `npm start` | Start API (production) |
| backend | `npm run db` | Start the built-in local MongoDB |
| frontend | `npm run dev` | Start React dev server on :5173 |
| frontend | `npm run build` | Build production files into `frontend/dist` |
| frontend | `npm run preview` | Preview the production build |

---

## Database models

**User**

| Field | Type | Rules |
|---|---|---|
| `name` | String | required, 2–50 chars |
| `email` | String | required, unique, valid email, stored lowercase |
| `password` | String | required, min 6 chars, hashed with bcrypt, never returned |
| `createdAt`, `updatedAt` | Date | added automatically |

**Task**

| Field | Type | Rules |
|---|---|---|
| `title` | String | required, max 100 chars |
| `description` | String | optional, max 500 chars |
| `status` | String | `Pending` (default), `In Progress` or `Completed` |
| `date` | String | the day it's planned for, `YYYY-MM-DD` (default: today) |
| `completedAt` | Date | set when marked `Completed`, cleared otherwise |
| `habit` | ObjectId → Habit | set if the task was created from a daily habit |
| `skipped` | Boolean | habit task hidden for that day |
| `user` | ObjectId → User | owner of the task |
| `createdAt`, `updatedAt` | Date | added automatically |

**Habit**

| Field | Type | Rules |
|---|---|---|
| `title` | String | required, max 100 chars |
| `description` | String | optional, max 500 chars |
| `startDate` | String | first day it creates tasks (`YYYY-MM-DD`); reset to today on resume |
| `active` | Boolean | `false` = paused |
| `user` | ObjectId → User | owner |
| `createdAt`, `updatedAt` | Date | added automatically |

---

## API reference

Base URL: `http://localhost:5000/api`

For routes marked 🔒, send the token from login/register as a header:
```
Authorization: Bearer <token>
```

| Method | Endpoint | Auth | Body | Purpose |
|---|---|---|---|---|
| GET | `/health` | – | – | Check the API is running |
| POST | `/auth/register` | – | `name`, `email`, `password` | Create account, returns user + token |
| POST | `/auth/login` | – | `email`, `password` | Log in, returns user + token |
| GET | `/auth/me` | 🔒 | – | Get the logged-in user |
| POST | `/tasks` | 🔒 | `title`, `description?`, `status?`, `date?` | Create a task (date defaults to today) |
| GET | `/tasks?date=2026-10-24` | 🔒 | – | One day's tasks (adds that day's habit tasks first) |
| GET | `/tasks` | 🔒 | – | All your tasks (newest day first) |
| GET | `/tasks?status=Pending` | 🔒 | – | Filter by status (combine with `date` if you like) |
| GET | `/tasks/:id` | 🔒 | – | Get one task |
| PUT | `/tasks/:id` | 🔒 | any of `title`, `description`, `status`, `date` | Update a task (habit tasks can't change day) |
| DELETE | `/tasks/:id` | 🔒 | – | Delete a task (a habit task is hidden for that day only) |
| POST | `/habits` | 🔒 | `title`, `description?` | Create a daily habit (starts today) |
| GET | `/habits` | 🔒 | – | List your habits |
| PUT | `/habits/:id` | 🔒 | any of `title`, `description`, `active` | Rename, or pause (`false`) / resume (`true`) |
| DELETE | `/habits/:id` | 🔒 | – | Delete a habit (past days are kept) |
| GET | `/stats/monthly?month=2026-10` | 🔒 | – | Monthly analysis (defaults to this month) |

`GET /tasks?date=...` also returns `today` (the server's current day), which the frontend uses to decide what counts as missed.

### Example: register

```http
POST /api/auth/register
Content-Type: application/json

{ "name": "Asha", "email": "asha@example.com", "password": "secret123" }
```
```json
{
  "success": true,
  "message": "Registered successfully",
  "data": {
    "user": { "_id": "…", "name": "Asha", "email": "asha@example.com", "createdAt": "…", "updatedAt": "…" },
    "token": "eyJhbGciOi…"
  }
}
```

### Example: create a task

```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{ "title": "Finish README", "description": "Explain setup", "status": "In Progress" }
```
```json
{ "success": true, "message": "Task created", "data": { "task": { "_id": "…", "title": "Finish README", "status": "In Progress", "user": "…" } } }
```

### Example: monthly analysis

```http
GET /api/stats/monthly?month=2026-10
Authorization: Bearer <token>
```
```json
{
  "success": true,
  "data": {
    "month": "2026-10",
    "today": "2026-10-24",
    "summary": {
      "totalTasks": 42, "completed": 35, "missed": 5, "completionRate": 83,
      "activeDays": 10, "perfectDays": 6, "currentStreak": 3, "longestStreak": 4,
      "bestDay": { "date": "2026-10-18", "percent": 100, "completed": 6, "total": 6 }
    },
    "days": [
      { "date": "2026-10-23", "total": 5, "completed": 4, "inProgress": 0, "pending": 0, "missed": 1, "percent": 80, "future": false }
    ],
    "habits": [{ "habitId": "…", "title": "Exercise", "total": 10, "completed": 9, "percent": 90 }],
    "topMissed": [{ "title": "Read 20 pages", "count": 3 }]
  }
}
```
- `days` has one entry for every day of the month (only one is shown above).
- Totals only count days up to today. A **perfect day** has at least one task, all completed. The **streak** counts perfect days in a row up to today (or up to yesterday while today is still in progress).

### Error format

Every error looks like this:
```json
{ "success": false, "message": "Task not found" }
```

| Status | When |
|---|---|
| 400 | Missing or invalid input, invalid ID, bad date (`YYYY-MM-DD`) or month (`YYYY-MM`) |
| 401 | No token, invalid or expired token, wrong email/password |
| 404 | Task, habit or route not found |
| 409 | Email already registered |
| 429 | Too many login/register attempts |
| 500 | Unexpected server error |

### Postman

Import `TaskFlow.postman_collection.json` into Postman. Run **Register** or **Login** first; the token is saved automatically and used by the task requests.

---

## Deploy (outline)

1. **Database:** create a free MongoDB Atlas cluster, add a database user, allow your backend's IP, copy the connection string.
2. **Backend:** Render or Railway. Root directory `backend`, start command `npm start`. Set `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL` (your frontend URL) and `TIMEZONE`.
3. **Frontend:** Vercel or Netlify. Root directory `frontend`, build command `npm run build`, output `dist`. Set `VITE_API_URL` to `https://<your-backend>/api`.
   Add a rewrite of all paths to `/index.html` so routes like `/login` work on refresh.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Missing JWT_SECRET or MONGO_URI in .env` | Create `backend/.env` from `.env.example` |
| `MongoDB connection failed` / `ECONNREFUSED` | MongoDB isn't running. Start the MongoDB service or `npm run db` |
| `npm run db` fails, port in use | Installed MongoDB is already using 27017. Use that instead |
| Frontend shows "Failed to fetch" | Backend isn't running, or `VITE_API_URL` is wrong |
| CORS error in browser | `CLIENT_URL` in `backend/.env` must match the frontend URL |
| Logged out unexpectedly | Token expired (`JWT_EXPIRES_IN`). Log in again |
| "Today" changes at the wrong time | Set `TIMEZONE` in `backend/.env` (e.g. `Asia/Kolkata`) and restart the backend |
| A habit task doesn't appear on a day | The habit is paused, or that day is before the habit was created or last resumed |

---

## License

MIT
