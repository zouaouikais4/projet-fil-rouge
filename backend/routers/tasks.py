from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["Taches"])


def _get_project_or_404(project_id: int, db: Session) -> models.Project:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project


@router.post("/", response_model=schemas.TaskResponse, status_code=201)
def create_task(
    project_id: int,
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Créer une nouvelle tâche dans un projet."""
    _get_project_or_404(project_id, db)
    task = models.Task(**task_in.model_dump(), project_id=project_id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/", response_model=List[schemas.TaskResponse])
def list_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lister toutes les tâches d'un projet."""
    _get_project_or_404(project_id, db)
    return db.query(models.Task).filter(models.Task.project_id == project_id).all()


@router.get("/{task_id}", response_model=schemas.TaskResponse)
def get_task(
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Récupérer une tâche spécifique."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id == project_id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    return task


@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    project_id: int,
    task_id: int,
    task_in: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Modifier une tâche existante."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id == project_id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")

    for key, value in task_in.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/status")
def update_task_status(
    project_id: int,
    task_id: int,
    status: models.TaskStatus,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mettre à jour uniquement le statut (Kanban)."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id == project_id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    task.status = status
    db.commit()
    db.refresh(task)
    return {"message": "Statut mis à jour", "status": task.status}


@router.delete("/{task_id}", status_code=204)
def delete_task(
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Supprimer une tâche."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id == project_id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    db.delete(task)
    db.commit()
