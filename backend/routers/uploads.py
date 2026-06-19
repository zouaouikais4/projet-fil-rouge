"""
Routeur upload de fichiers — pièces jointes du chat.
"""
import os
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from auth import get_current_user
import models

router = APIRouter(tags=["Uploads"])

UPLOAD_DIR = "uploads/chat"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 Mo
ALLOWED_EXTENSIONS = {
    ".jpg": "image", ".jpeg": "image", ".png": "image", ".gif": "image", ".webp": "image",
    ".pdf": "pdf",
}

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload/chat")
async def upload_chat_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Type de fichier non autorisé. Formats acceptés : images (jpg, png, gif, webp) et PDF.",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 Mo)")

    # Nom de fichier unique pour éviter les collisions
    unique_name = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, unique_name)

    with open(filepath, "wb") as f:
        f.write(contents)

    return {
        "file_url": f"/uploads/chat/{unique_name}",
        "file_name": file.filename,
        "file_type": ALLOWED_EXTENSIONS[ext],
        "file_size": len(contents),
    }
