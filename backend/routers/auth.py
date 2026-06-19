from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", response_model=schemas.UserResponse, status_code=201)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Créer un nouveau compte utilisateur."""
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    user = models.User(
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        email=user_in.email,
        password=hash_password(user_in.password),
        role=user_in.role or "student",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Se connecter et obtenir un token JWT."""
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Récupérer le profil de l'utilisateur connecté."""
    return current_user
