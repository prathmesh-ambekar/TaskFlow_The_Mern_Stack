# TaskFlow

A simple MERN task manager: React + Express + MongoDB (Mongoose), JWT auth, bcrypt.

## Run locally

Prerequisites: Node.js 18+, and MongoDB (local or a free MongoDB Atlas URI).

**0. Database (only if you don't have MongoDB)**
```bash
cd backend
npm install
npm run db                  # keep this terminal open
```
Starts a local MongoDB on port 27017 with no install needed (downloads ~600 MB once). Data is saved in `backend/.data`.

**1. Backend** (new terminal)
```bash
cd backend
cp .env.example .env        # Windows: copy .env.example .env
# edit .env: set MONGO_URI and a long random JWT_SECRET
npm install
npm run dev
```
Check: http://localhost:5000/api/health

**2. Frontend** (new terminal)
```bash
cd frontend
cp .env.example .env        # Windows: copy .env.example .env
npm install
npm run dev
```
Open http://localhost:5173

## API

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/register | no | Create account |
| POST | /api/auth/login | no | Login, returns JWT |
| GET | /api/auth/me | yes | Current user |
| POST | /api/tasks | yes | Create task |
| GET | /api/tasks?status=Pending | yes | List your tasks (optional filter) |
| GET | /api/tasks/:id | yes | Get one task |
| PUT | /api/tasks/:id | yes | Update task |
| DELETE | /api/tasks/:id | yes | Delete task |

Send the token as `Authorization: Bearer <token>`.
Status values: `Pending`, `In Progress`, `Completed`.

Import `TaskFlow.postman_collection.json` into Postman. Run Register or Login first; it saves the token automatically.

## Deploy (outline)
- Database: MongoDB Atlas (allow your server's IP, copy the connection string).
- Backend: Render/Railway. Root `backend`, start command `npm start`. Set env vars `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (your frontend URL).
- Frontend: Vercel/Netlify. Root `frontend`, build `npm run build`, output `dist`. Set `VITE_API_URL` to `https://<your-backend>/api`.

## GitHub
```bash
git init && git add . && git commit -m "TaskFlow initial commit"
git branch -M main
git remote add origin https://github.com/<you>/taskflow.git
git push -u origin main
```
`.env` is git-ignored. Never commit it.
