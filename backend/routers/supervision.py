from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/supervision", tags=["Supervision Pédagogique"])


@router.get("/projects", response_model=List[schemas.ProjectSupervisionResponse])
def list_all_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lister tous les projets (enseignant uniquement)."""
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Accès réservé aux enseignants")
    projects = db.query(models.Project).all()
    result = []
    for p in projects:
        tasks = db.query(models.Task).filter(models.Task.project_id == p.id).all()
        total = len(tasks)
        done = len([t for t in tasks if t.status == "done"])
        in_progress = len([t for t in tasks if t.status == "in_progress"])
        todo = len([t for t in tasks if t.status == "todo"])
        progress = round((done / total * 100) if total > 0 else 0, 1)
        result.append({
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "owner_id": p.owner_id,
            "start_date": p.start_date,
            "end_date": p.end_date,
            "created_at": p.created_at,
            "total_tasks": total,
            "done_tasks": done,
            "in_progress_tasks": in_progress,
            "todo_tasks": todo,
            "progress_percent": progress,
        })
    return result


@router.get("/projects/{project_id}", response_model=schemas.ProjectSupervisionResponse)
def get_project_detail(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Détail d'un projet avec statistiques (enseignant)."""
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Accès réservé aux enseignants")
    p = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    tasks = db.query(models.Task).filter(models.Task.project_id == p.id).all()
    total = len(tasks)
    done = len([t for t in tasks if t.status == "done"])
    in_progress = len([t for t in tasks if t.status == "in_progress"])
    todo = len([t for t in tasks if t.status == "todo"])
    return {
        "id": p.id, "title": p.title, "description": p.description,
        "owner_id": p.owner_id, "start_date": p.start_date, "end_date": p.end_date,
        "created_at": p.created_at, "total_tasks": total, "done_tasks": done,
        "in_progress_tasks": in_progress, "todo_tasks": todo,
        "progress_percent": round((done / total * 100) if total > 0 else 0, 1),
    }


@router.post("/projects/{project_id}/feedback", response_model=schemas.FeedbackResponse, status_code=201)
def add_feedback(
    project_id: int,
    feedback_in: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Ajouter un feedback enseignant sur un projet."""
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Accès réservé aux enseignants")
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    feedback = models.Feedback(
        project_id=project_id,
        teacher_id=current_user.id,
        content=feedback_in.content,
        grade=feedback_in.grade,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("/projects/{project_id}/feedback", response_model=List[schemas.FeedbackResponse])
def get_feedback(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Consulter les feedbacks d'un projet."""
    return db.query(models.Feedback).filter(
        models.Feedback.project_id == project_id
    ).order_by(models.Feedback.created_at.desc()).all()
