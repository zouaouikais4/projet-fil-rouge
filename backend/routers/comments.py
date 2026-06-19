from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/projects/{project_id}/tasks/{task_id}/comments", tags=["Commentaires"])


@router.post("/", response_model=schemas.CommentResponse, status_code=201)
def add_comment(
    project_id: int,
    task_id: int,
    comment_in: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Ajouter un commentaire sur une tâche."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id == project_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")

    comment = models.Comment(
        content=comment_in.content,
        task_id=task_id,
        author_id=current_user.id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/", response_model=List[schemas.CommentResponse])
def list_comments(
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lister les commentaires d'une tâche."""
    return db.query(models.Comment).filter(
        models.Comment.task_id == task_id
    ).order_by(models.Comment.created_at).all()


@router.delete("/{comment_id}", status_code=204)
def delete_comment(
    project_id: int,
    task_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Supprimer un commentaire (auteur uniquement)."""
    comment = db.query(models.Comment).filter(
        models.Comment.id == comment_id,
        models.Comment.author_id == current_user.id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Commentaire introuvable ou accès refusé")
    db.delete(comment)
    db.commit()
