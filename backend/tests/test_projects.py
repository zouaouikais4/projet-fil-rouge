"""
Tests Projets — US2 / US3
Couvre : T04 POST /projects/
         T05 GET  /projects/
         T06 DEL  /projects/{id}
"""
import pytest


class TestProjets:

    def test_T04_create_project(self, client, student_headers):
        """T04 — Création d'un projet valide → 201."""
        resp = client.post("/projects/", json={
            "title": "Projet IA 2026",
            "description": "Détection phishing par ML",
            "start_date": "2026-02-01T00:00:00",
            "end_date": "2026-03-30T00:00:00",
        }, headers=student_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Projet IA 2026"
        assert "owner_id" in data

    def test_T04_create_project_sans_auth(self, client):
        """T04 — Création sans token → 401."""
        resp = client.post("/projects/", json={"title": "Projet fantôme"})
        assert resp.status_code == 401

    def test_T05_list_projects(self, client, student_headers, project_id):
        """T05 — Listing des projets → au moins 1 projet."""
        resp = client.get("/projects/", headers=student_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        ids = [p["id"] for p in data]
        assert project_id in ids

    def test_T05_get_project_by_id(self, client, student_headers, project_id):
        """T05 — GET /projects/{id} → projet correct."""
        resp = client.get(f"/projects/{project_id}", headers=student_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == project_id

    def test_T04_owner_auto_added_as_admin(self, client, student_headers, project_id):
        """US2 critère — Le créateur est auto-ajouté comme membre admin."""
        resp = client.get(f"/projects/{project_id}/members", headers=student_headers)
        assert resp.status_code == 200
        members = resp.json()
        admins = [m for m in members if m["role"] == "admin"]
        assert len(admins) >= 1

    def test_T06_delete_project(self, client, student_headers):
        """T06 — Suppression d'un projet par son owner → 204."""
        create = client.post("/projects/", json={"title": "Projet à supprimer"},
                             headers=student_headers)
        pid = create.json()["id"]
        resp = client.delete(f"/projects/{pid}", headers=student_headers)
        assert resp.status_code == 204
        get = client.get(f"/projects/{pid}", headers=student_headers)
        assert get.status_code == 404

    def test_T06_delete_other_project(self, client, student_headers, teacher_headers):
        """T06 — Suppression d'un projet par un non-owner → 404/403."""
        create = client.post("/projects/", json={"title": "Projet protégé"},
                             headers=teacher_headers)
        pid = create.json()["id"]
        resp = client.delete(f"/projects/{pid}", headers=student_headers)
        assert resp.status_code in (403, 404)
