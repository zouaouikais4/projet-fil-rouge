# 🎓 ProjetManager — Plateforme de Gestion de Projets Étudiants

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-0.137-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-FF6B35?style=for-the-badge)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

**Fil Rouge GLSI2 — FSB Tunis — 2026**

[Features](#-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [API Docs](#-api-documentation) • [Screenshots](#-screenshots)

</div>

---

## 📌 Overview

ProjetManager is a full-stack collaborative project management platform built as the **Fil Rouge** capstone project for the GLSI2 program at FSB Tunis. It enables students to create and manage projects, assign tasks on a Kanban board, invite teammates, and communicate in real time via a built-in chat system with file sharing and read receipts. Teachers can supervise all projects and leave graded feedback.

---

## ✨ Features

### 🔐 Authentication & Security
- JWT-based authentication with session-scoped token storage (sessionStorage — never localStorage)
- Password hashing with bcrypt
- Role-based access control: `student` and `teacher`
- Protected routes on both frontend and backend
- Secrets managed via `.env` — never hardcoded

### 📁 Project Management
- Create, list, and delete projects
- Automatic role assignment (project creator becomes admin member)
- Project statistics (task counts by status)

### ✅ Task Management (Kanban)
- Create tasks with priority (`low` / `medium` / `high`) and due dates
- Drag-and-drop Kanban board with three columns: **To Do**, **In Progress**, **Done**
- Task assignment to project members
- Comments on tasks

### 📨 Invitations System
- Invite users to a project by email
- Token-based invitation links with expiry
- Accept or decline invitations
- Only project admins can send invitations

### 💬 Real-time Messaging (Sprint 4 + 5)
- WebSocket-powered group chat per project
- Floating chat bubble accessible from every page
- Message history loaded on connect
- **Auto-reconnect** — recovers automatically from dropped connections (server restarts, network blips)
- **Typing indicators** — see "Kais écrit…" live as teammates type
- **Read receipts** — "Vu" label once every project member has seen your message
- **File attachments** — share images and PDFs directly in chat (max 10MB), inline image previews
- **Toast notifications** — popup alert for new messages even when the chat is closed, click to jump in
- Unread message badge counter on the bubble icon
- Project switcher dropdown when member of multiple projects
- Smart timestamps (time for today, date+time for older messages)

### 👨‍🏫 Teacher Supervision
- Teachers can view all projects across the platform
- Add graded feedback (0–20) with comments
- Project progress statistics

---

## 🏗 Architecture

```
projet_sprint1/
├── backend/                    # FastAPI — Python 3.11
│   ├── routers/
│   │   ├── auth.py             # Register, login, /me
│   │   ├── projects.py         # CRUD projects
│   │   ├── tasks.py            # CRUD tasks + status updates
│   │   ├── members.py          # Project membership
│   │   ├── comments.py         # Task comments
│   │   ├── invitations.py      # Invite system
│   │   ├── supervision.py      # Teacher endpoints
│   │   ├── messages.py         # WebSocket chat, history, read receipts
│   │   └── uploads.py          # Chat file attachment uploads
│   ├── auth.py                 # JWT + bcrypt helpers
│   ├── models.py                # SQLAlchemy ORM models (incl. Message, MessageRead)
│   ├── database.py             # SQLite engine + session
│   ├── main.py                 # App entry point, CORS, static file mount
│   ├── .env                    # Secrets (not committed)
│   ├── uploads/chat/           # Stored chat attachments (not committed)
│   └── tests/                  # 44 pytest tests
│
└── frontend/                   # React 18 — Create React App
    └── src/
        ├── api/axios.js        # Axios instance + interceptors
        ├── context/
        │   ├── AuthContext.jsx # Auth state + token management
        │   └── ToastContext.jsx # New-message toast notifications
        ├── components/
        │   ├── ChatBubble.jsx  # Floating chat: messages, attachments, read receipts
        │   └── ProtectedRoute.jsx
        ├── hooks/
        │   └── useProjectChat.js # WebSocket hook with reconnect + typing + uploads
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── DashboardPage.jsx
            ├── KanbanPage.jsx
            ├── InvitationsPage.jsx
            └── SupervisionPage.jsx
```

### Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI 0.137 + Uvicorn |
| Database | SQLite + SQLAlchemy 2.0 |
| Auth | JWT (python-jose) + bcrypt |
| Real-time | WebSockets (native FastAPI) |
| File storage | FastAPI StaticFiles (local disk) |
| Frontend | React 18 + React Router v6 |
| HTTP Client | Axios |
| Testing | pytest + FastAPI TestClient (44 tests) |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11
- Node.js 18+
- npm

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1      # Windows
source venv/bin/activate          # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and set your own SECRET_KEY

# Start the server (single worker required for WebSocket)
uvicorn main:app --reload --workers 1
```

The API will be available at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app will open at **http://localhost:3000**

> ⚠️ After pulling Sprint 5 changes, delete `backend/projectmanager.db` once to let the new `messages` and `message_reads` tables be created fresh.

---

## 🧪 Running Tests

```bash
cd backend
.\venv\Scripts\Activate.ps1
.\venv\Scripts\python.exe -m pytest tests/ -v
```

```
44 passed in ~3s
```

Test coverage includes authentication, projects, tasks, comments, invitations, and teacher supervision endpoints.

---

## 📡 API Documentation

Full interactive docs available at `/docs` when the server is running.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login and receive JWT |
| `GET` | `/auth/me` | Get current user profile |
| `GET` | `/projects/` | List user's projects |
| `POST` | `/projects/` | Create a project |
| `DELETE` | `/projects/{id}` | Delete a project (owner only) |
| `GET` | `/projects/{id}/tasks` | List project tasks |
| `POST` | `/projects/{id}/tasks` | Create a task |
| `PATCH` | `/tasks/{id}/status` | Update task status |
| `POST` | `/projects/{id}/invite` | Send an invitation |
| `POST` | `/invitations/{token}/accept` | Accept an invitation |
| `GET` | `/supervision/projects` | Teacher: list all projects |
| `POST` | `/supervision/projects/{id}/feedback` | Teacher: add feedback |
| `GET` | `/projects/{id}/messages` | Load chat history (with read receipts) |
| `POST` | `/upload/chat` | Upload a chat attachment (image/PDF, max 10MB) |
| `POST` | `/messages/{id}/read` | Mark a message as read (REST fallback) |
| `WS` | `/ws/projects/{id}?token=` | Real-time chat: messages, typing, read receipts |

---

## 🔒 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
SECRET_KEY=your_random_64_character_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

> ⚠️ Never commit your `.env` file. It is listed in `.gitignore`.

---

## 📊 Data Models

```
User ──< ProjectMember >── Project ──< Task ──< Comment
                              │
                              ├──< Invitation
                              ├──< Feedback
                              └──< Message ──< MessageRead
```

---

## 👤 Author

**Kais Zouaoui** — GLSI2, FSB Tunis  
[![GitHub](https://img.shields.io/badge/GitHub-zouaouikais4-181717?style=flat&logo=github)](https://github.com/zouaouikais4)

---

## 📄 License

This project was developed as an academic capstone project at FSB Tunis.
