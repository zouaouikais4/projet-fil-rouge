"""
Routeur messagerie temps réel — WebSocket par projet, historique, pièces jointes,
accusés de lecture.
"""
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user, get_current_user_ws
import models

router = APIRouter(tags=["Messages"])


# ── Connection Manager ────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: dict[int, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, project_id: int):
        await ws.accept()
        self.active.setdefault(project_id, []).append(ws)

    def disconnect(self, ws: WebSocket, project_id: int):
        connections = self.active.get(project_id, [])
        if ws in connections:
            connections.remove(ws)

    async def broadcast(self, project_id: int, payload: dict, exclude: WebSocket = None):
        for ws in self.active.get(project_id, []):
            if ws is exclude:
                continue
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                pass


manager = ConnectionManager()


def _serialize_message(m: models.Message) -> dict:
    return {
        "type": "message",
        "id": m.id,
        "content": m.content,
        "sender_id": m.user_id,
        "sender_name": f"{m.sender.first_name} {m.sender.last_name}",
        "created_at": m.created_at.isoformat(),
        "file_url": m.file_url,
        "file_name": m.file_name,
        "file_type": m.file_type,
        "file_size": m.file_size,
        "read_by": [r.user_id for r in m.reads],
    }


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

    Messages entrants attendus (JSON) :
      - {"content": "...", "file_url": "...", ...}  → nouveau message (texte et/ou pièce jointe)
      - {"type": "typing"}                            → en train d'écrire
      - {"type": "stop_typing"}                        → arrêt de frappe
      - {"type": "read", "message_id": 42}             → marquer un message comme lu
    """
    user = get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=4001)
        return

    member = db.query(models.ProjectMember).filter_by(
        project_id=project_id, user_id=user.id
    ).first()
    project = db.query(models.Project).filter_by(id=project_id).first()
    if not member and (not project or project.owner_id != user.id):
        await websocket.close(code=4003)
        return

    await manager.connect(websocket, project_id)
    try:
        while True:
            data = await websocket.receive_text()
            body = json.loads(data)
            event_type = body.get("type")

            # ── Indicateur de frappe ────────────────────────────────────────
            if event_type in ("typing", "stop_typing"):
                await manager.broadcast(project_id, {
                    "type": event_type,
                    "sender_id": user.id,
                    "sender_name": f"{user.first_name} {user.last_name}",
                }, exclude=websocket)
                continue

            # ── Accusé de lecture ───────────────────────────────────────────
            if event_type == "read":
                message_id = body.get("message_id")
                msg = db.query(models.Message).filter_by(id=message_id).first()
                if not msg or msg.project_id != project_id:
                    continue
                existing = db.query(models.MessageRead).filter_by(
                    message_id=message_id, user_id=user.id
                ).first()
                if not existing:
                    read = models.MessageRead(message_id=message_id, user_id=user.id)
                    db.add(read)
                    db.commit()
                    await manager.broadcast(project_id, {
                        "type": "read_receipt",
                        "message_id": message_id,
                        "user_id": user.id,
                    })
                continue

            # ── Nouveau message (texte et/ou pièce jointe) ──────────────────
            content = (body.get("content") or "").strip()
            file_url = body.get("file_url")
            if not content and not file_url:
                continue

            msg = models.Message(
                project_id=project_id,
                user_id=user.id,
                content=content or None,
                file_url=file_url,
                file_name=body.get("file_name"),
                file_type=body.get("file_type"),
                file_size=body.get("file_size"),
            )
            db.add(msg)
            db.commit()
            db.refresh(msg)

            await manager.broadcast(project_id, _serialize_message(msg))

    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)


# ── REST — historique ─────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/messages", tags=["Messages"])
def get_messages(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    member = db.query(models.ProjectMember).filter_by(
        project_id=project_id, user_id=current_user.id
    ).first()
    project = db.query(models.Project).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    if not member and project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    msgs = (
        db.query(models.Message)
        .filter_by(project_id=project_id)
        .order_by(models.Message.created_at)
        .all()
    )
    return [_serialize_message(m) for m in msgs]


# ── REST — marquer comme lu (fallback non-WebSocket) ───────────────────────────

@router.post("/messages/{message_id}/read", tags=["Messages"])
def mark_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    msg = db.query(models.Message).filter_by(id=message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message introuvable")

    existing = db.query(models.MessageRead).filter_by(
        message_id=message_id, user_id=current_user.id
    ).first()
    if existing:
        return {"status": "already_read"}

    read = models.MessageRead(message_id=message_id, user_id=current_user.id)
    db.add(read)
    db.commit()
    return {"status": "marked_read"}
