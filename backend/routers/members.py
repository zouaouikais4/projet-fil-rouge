from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/projects/{project_id}/members", tags=["Membres"])


@router.post("/", response_model=schemas.MemberResponse, status_code=201)
def add_member(
    project_id: int,
    member_in: schemas.MemberAdd,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Ajouter un membre à un projet (réservé à l'admin du projet)."""
    # Vérifier que le projet existe
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    # Vérifier que le requérant est admin
    requester = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.user_id == current_user.id,
        models.ProjectMember.role == "admin",
    ).first()
    if not requester:
        raise HTTPException(status_code=403, detail="Accès refusé : admin requis")

    # Vérifier que l'utilisateur cible existe
    target_user = db.query(models.User).filter(models.User.id == member_in.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # Vérifier qu'il n'est pas déjà membre
    existing = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.user_id == member_in.user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet utilisateur est déjà membre")

    member = models.ProjectMember(
        project_id=project_id,
        user_id=member_in.user_id,
        role=member_in.role,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("/", response_model=List[schemas.MemberResponse])
def list_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lister tous les membres d'un projet."""
    return db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id
    ).all()


@router.delete("/{user_id}", status_code=204)
def remove_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retirer un membre du projet (réservé à l'admin)."""
    member = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Membre introuvable")
    db.delete(member)
    db.commit()
