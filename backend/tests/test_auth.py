"""
Tests Authentification — US1
Couvre : T01 POST /auth/register
         T02 POST /auth/login
         T03 GET  /auth/me
         T19 POST /auth/login (mauvais mot de passe)
"""
import pytest


class TestAuthentification:

    def test_T01_register_success(self, client):
        """T01 — Inscription avec données valides → 201."""
        resp = client.post("/auth/register", json={
            "first_name": "Aziz",
            "last_name": "Moumni",
            "email": "aziz.moumni@test.tn",
            "password": "SecurePass99",
            "role": "student",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "aziz.moumni@test.tn"
        assert data["role"] == "student"
        assert "id" in data
        assert "password" not in data

    def test_T01_register_duplicate_email(self, client):
        """T01 — Double inscription avec le même email → 400."""
        payload = {
            "first_name": "Yassine",
            "last_name": "Dorai",
            "email": "yassine.dorai@test.tn",
            "password": "Pass1234",
        }
        client.post("/auth/register", json=payload)
        resp = client.post("/auth/register", json=payload)
        assert resp.status_code == 400
        assert "déjà utilisé" in resp.json()["detail"].lower()

    def test_T02_login_success(self, client, student_headers):
        """T02 — Connexion valide → 200 + access_token."""
        resp = client.post("/auth/login", json={
            "email": "etudiant@test.tn",
            "password": "Password123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_T03_get_me(self, client, student_headers):
        """T03 — GET /auth/me → profil de l'utilisateur connecté."""
        resp = client.get("/auth/me", headers=student_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "etudiant@test.tn"
        assert data["first_name"] == "Kais"
        assert data["role"] == "student"

    def test_T03_get_me_without_token(self, client):
        """T03 — GET /auth/me sans token → 401."""
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_T19_login_bad_password(self, client):
        """T19 — Connexion avec mauvais mot de passe → 401."""
        resp = client.post("/auth/login", json={
            "email": "etudiant@test.tn",
            "password": "MAUVAIS_MOT_DE_PASSE",
        })
        assert resp.status_code == 401
        assert "incorrect" in resp.json()["detail"].lower()

    def test_T19_login_unknown_email(self, client):
        """T19 — Connexion email inexistant → 401."""
        resp = client.post("/auth/login", json={
            "email": "inconnu@test.tn",
            "password": "Password123",
        })
        assert resp.status_code == 401
