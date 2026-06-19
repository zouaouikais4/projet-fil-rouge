from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/projects", tags=["Projets"])


@router.post("/", response_model=schemas.ProjectResponse, status_code=201)
def create_project(
    project_in: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Créer un nouveau projet. Le créateur est automatiquement ajouté comme admin."""
    project = models.Project(**project_in.model_dump(), owner_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    # Ajouter le créateur comme membre admin
    member = models.ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role="admin",
    )
    db.add(member)
    db.commit()
    return project


@router.get("/", response_model=List[schemas.ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lister tous les projets dont l'utilisateur est membre."""
    memberships = db.query(models.ProjectMember).filter(
        models.ProjectMember.user_id == current_user.id
    ).all()
    project_ids = [m.project_id for m in memberships]
    return db.query(models.Project).filter(models.Project.id.in_(project_ids)).all()


@router.get("/{project_id}", response_model=schemas.ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Récupérer un projet par son ID."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project


@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(
    project_id: int,
    project_in: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Modifier un projet (réservé au propriétaire)."""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable ou accès refusé")

    for key, value in project_in.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Supprimer un projet (réservé au propriétaire)."""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable ou accès refusé")
    db.delete(project)
    db.commit()
