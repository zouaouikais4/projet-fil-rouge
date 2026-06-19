"""
Routeur messagerie temps réel — WebSocket par projet + historique REST.
"""
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user, get_current_user_ws
import models

router = APIRouter(tags=["Messages"])


# ── Connection Manager ────────────────────────────────────────────────────────

class ConnectionManager:
    """Garde la liste des WebSockets actifs par projet."""

    def __init__(self):
        self.active: dict[int, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, project_id: int):
        await ws.accept()
        self.active.setdefault(project_id, []).append(ws)

    def disconnect(self, ws: WebSocket, project_id: int):
        connections = self.active.get(project_id, [])
        if ws in connections:
            connections.remove(ws)

    async def broadcast(self, project_id: int, payload: dict):
        for ws in self.active.get(project_id, []):
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                pass  # client déconnecté entre-temps


manager = ConnectionManager()


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/projects/{project_id}")
async def websocket_chat(
    websocket: WebSocket,
    project_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Connexion : ws://localhost:8000/ws/projects/{id}?token=<JWT>
    Le token JWT est passé en query param car les navigateurs ne permettent
    pas d'envoyer des headers personnalisés sur une connexion WebSocket.
    """
    # 1. Authentification
    user = get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=4001)
        return

    # 2. Vérifier que l'utilisateur est membre du projet
    member = db.query(models.ProjectMember).filter_by(
        project_id=project_id, user_id=user.id
    ).first()
    # Autoriser aussi le propriétaire du projet
    project = db.query(models.Project).filter_by(id=project_id).first()
    if not member and (not project or project.owner_id != user.id):
        await websocket.close(code=4003)
        return

    await manager.connect(websocket, project_id)
    try:
        while True:
            data = await websocket.receive_text()
            body = json.loads(data)
            content = body.get("content", "").strip()
            if not content:
                continue

            # 3. Persister en base
            msg = models.Message(
                project_id=project_id,
                user_id=user.id,
                content=content,
            )
            db.add(msg)
            db.commit()
            db.refresh(msg)

            # 4. Broadcaster à tous les membres connectés
            await manager.broadcast(project_id, {
                "id": msg.id,
                "content": msg.content,
                "sender_id": user.id,
                "sender_name": f"{user.first_name} {user.last_name}",
                "created_at": msg.created_at.isoformat(),
            })

    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)


# ── REST — historique des messages ───────────────────────────────────────────

@router.get("/projects/{project_id}/messages", tags=["Messages"])
def get_messages(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retourne l'historique des messages d'un projet (du plus ancien au plus récent)."""
    # Vérifier accès
    member = db.query(models.ProjectMember).filter_by(
        project_id=project_id, user_id=current_user.id
    ).first()
    project = db.query(models.Project).filter_by(id=project_id).first()
    if not project:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Projet introuvable")
    if not member and project.owner_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Accès refusé")

    msgs = (
        db.query(models.Message)
        .filter_by(project_id=project_id)
        .order_by(models.Message.created_at)
        .all()
    )
    return [
        {
            "id": m.id,
            "content": m.content,
            "sender_id": m.user_id,
            "sender_name": f"{m.sender.first_name} {m.sender.last_name}",
            "created_at": m.created_at.isoformat(),
        }
        for m in msgs
    ]
