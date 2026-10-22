# TaskFlow

A full-stack **MERN** task manager. Users sign up, log in, and manage their own tasks (create, edit, delete, filter by status). Each user only ever sees their own tasks.

| Layer | Tech |
|---|---|
| Frontend | React 18, React Router, Vite |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JWT (JSON Web Token) + bcrypt password hashing |

---

## Features

- Register, log in, log out (stays logged in after a page refresh)
- Dashboard with task counters: Total, Pending, In Progress, Completed
- Create, edit and delete tasks (title, description, status)
- Filter tasks by status
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
│       ├── server.js              Entry point: middleware, routes, DB connect, start server
│       ├── config/db.js           MongoDB connection (Mongoose)
│       ├── routes/
│       │   ├── authRoutes.js      /api/auth/*  (with rate limiter)
│       │   └── taskRoutes.js      /api/tasks/* (all require login)
│       ├── controllers/
│       │   ├── authController.js  register, login, getMe
│       │   └── taskController.js  create, list, get, update, delete tasks
│       ├── middleware/
│       │   ├── auth.js            protect: verifies JWT, sets req.user
│       │   └── errorHandler.js    404 handler + central error handler
│       ├── models/
│       │   ├── User.js            name, email, password (hashed)
│       │   └── Task.js            title, description, status, user
│       └── utils.js               AppError, asyncHandler, signToken
│
├── frontend/                      React app (Vite)
│   ├── .env.example               VITE_API_URL
│   ├── index.html
│   ├── vite.config.js             Dev server on port 5173
│   └── src/
│       ├── main.jsx               Mounts the app (Router + AuthProvider)
│       ├── App.jsx                Routes: /, /login, /register (+ route guards)
│       ├── api.js                 fetch helper: adds token, parses JSON, throws errors
│       ├── context/
│       │   └── AuthContext.jsx    Logged-in user, login/register/logout
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   └── Dashboard.jsx      Counters, filters, task list
│       ├── components/
│       │   └── TaskForm.jsx       Modal for creating / editing a task
│       └── index.css              Styles
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
Open **http://localhost:5173**, register an account and add some tasks.

### 6. (Optional) View the data in MongoDB Compass

Connect to `mongodb://127.0.0.1:27017`. After you register, a **`taskflow`** database appears with two collections: `users` and `tasks`.

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
| `user` | ObjectId → User | owner of the task |
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
| POST | `/tasks` | 🔒 | `title`, `description?`, `status?` | Create a task |
| GET | `/tasks` | 🔒 | – | List your tasks (newest first) |
| GET | `/tasks?status=Pending` | 🔒 | – | List your tasks with one status |
| GET | `/tasks/:id` | 🔒 | – | Get one task |
| PUT | `/tasks/:id` | 🔒 | any of `title`, `description`, `status` | Update a task |
| DELETE | `/tasks/:id` | 🔒 | – | Delete a task |

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

### Error format

Every error looks like this:
```json
{ "success": false, "message": "Task not found" }
```

| Status | When |
|---|---|
| 400 | Missing or invalid input, invalid task ID |
| 401 | No token, invalid or expired token, wrong email/password |
| 404 | Task or route not found |
| 409 | Email already registered |
| 429 | Too many login/register attempts |
| 500 | Unexpected server error |

### Postman

Import `TaskFlow.postman_collection.json` into Postman. Run **Register** or **Login** first; the token is saved automatically and used by the task requests.

---

## Deploy (outline)

1. **Database:** create a free MongoDB Atlas cluster, add a database user, allow your backend's IP, copy the connection string.
2. **Backend:** Render or Railway. Root directory `backend`, start command `npm start`. Set `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN` and `CLIENT_URL` (your frontend URL).
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

---

## License

MIT
