from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid, datetime
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/invitations", tags=["Invitations"])


@router.post("/", response_model=schemas.InvitationResponse, status_code=201)
def send_invitation(
    inv_in: schemas.InvitationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Envoyer une invitation à rejoindre un projet."""
    # Vérifier que le projet existe et que l'invitant est admin
    member = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == inv_in.project_id,
        models.ProjectMember.user_id == current_user.id,
        models.ProjectMember.role == "admin",
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Accès refusé : admin requis")

    # Vérifier que l'invité existe
    invitee = db.query(models.User).filter(models.User.email == inv_in.email).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="Aucun utilisateur avec cet email")

    # Vérifier qu'il n'est pas déjà membre
    already = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == inv_in.project_id,
        models.ProjectMember.user_id == invitee.id,
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="Cet utilisateur est déjà membre")

    # Vérifier pas d'invitation en attente
    pending = db.query(models.Invitation).filter(
        models.Invitation.project_id == inv_in.project_id,
        models.Invitation.invitee_id == invitee.id,
        models.Invitation.status == "pending",
    ).first()
    if pending:
        raise HTTPException(status_code=400, detail="Invitation déjà envoyée")

    token = str(uuid.uuid4())
    invitation = models.Invitation(
        project_id=inv_in.project_id,
        inviter_id=current_user.id,
        invitee_id=invitee.id,
        token=token,
        status="pending",
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


@router.get("/my", response_model=List[schemas.InvitationResponse])
def my_invitations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lister les invitations reçues par l'utilisateur connecté."""
    return db.query(models.Invitation).filter(
        models.Invitation.invitee_id == current_user.id,
        models.Invitation.status == "pending",
    ).all()


@router.patch("/{invitation_id}/accept", response_model=schemas.InvitationResponse)
def accept_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Accepter une invitation."""
    inv = db.query(models.Invitation).filter(
        models.Invitation.id == invitation_id,
        models.Invitation.invitee_id == current_user.id,
        models.Invitation.status == "pending",
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation introuvable")
    if inv.expires_at < datetime.datetime.utcnow():
        inv.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Invitation expirée")

    inv.status = "accepted"
    member = models.ProjectMember(
        project_id=inv.project_id,
        user_id=current_user.id,
        role="member",
    )
    db.add(member)
    db.commit()
    db.refresh(inv)
    return inv


@router.patch("/{invitation_id}/decline", response_model=schemas.InvitationResponse)
def decline_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Refuser une invitation."""
    inv = db.query(models.Invitation).filter(
        models.Invitation.id == invitation_id,
        models.Invitation.invitee_id == current_user.id,
        models.Invitation.status == "pending",
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation introuvable")
    inv.status = "declined"
    db.commit()
    db.refresh(inv)
    return inv
