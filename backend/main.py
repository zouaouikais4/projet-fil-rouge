from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, projects, tasks, members, comments, invitations, supervision, messages

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Plateforme Gestion Projets Etudiants",
    description="API REST — Sprint 1, 2, 3 & 4 — Fil Rouge GLSI2 2026",
    version="4.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(members.router)
app.include_router(comments.router)
app.include_router(invitations.router)
app.include_router(supervision.router)
app.include_router(messages.router)

@app.get("/", tags=["Santé"])
def root():
    return {"message": "API v4.0 — Sprint 1+2+3+4 opérationnels"}
