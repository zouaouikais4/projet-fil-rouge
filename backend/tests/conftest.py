"""
Fixtures pytest partagées — base de données en mémoire, client HTTP de test.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app

TEST_DATABASE_URL = "sqlite:///./test_projectmanager.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_projectmanager.db"):
        os.remove("./test_projectmanager.db")


@pytest.fixture(scope="session")
def client(setup_database):
    app.dependency_overrides[get_db] = override_get_db
    c = TestClient(app)
    yield c
    app.dependency_overrides.clear()


# ── Helpers ───────────────────────────────────────────────────────────────────

def register_and_login(client, email: str, password: str = "Password123",
                        first_name: str = "Test", last_name: str = "User",
                        role: str = "student") -> dict:
    """Inscrit un utilisateur et retourne son token JWT."""
    client.post("/auth/register", json={
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "password": password,
        "role": role,
    })
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login échoué pour {email}: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def student_headers(client):
    return register_and_login(client, "etudiant@test.tn", first_name="Kais",
                               last_name="Zouaoui", role="student")


@pytest.fixture(scope="session")
def teacher_headers(client):
    return register_and_login(client, "enseignant@test.tn", first_name="Prof",
                               last_name="Grichi", role="teacher")


@pytest.fixture(scope="session")
def project_id(client, student_headers):
    resp = client.post("/projects/", json={
        "title": "Projet Test Sprint",
        "description": "Projet de test automatisé",
        "start_date": "2026-02-01T00:00:00",
        "end_date": "2026-03-15T00:00:00",
    }, headers=student_headers)
    assert resp.status_code == 201
    return resp.json()["id"]
