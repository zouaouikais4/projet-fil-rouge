"""
Tests Supervision Pédagogique — US9 / Sprint 3
Couvre : T17 GET  /supervision/projects
         T18 POST .../feedback
         T20 GET  /supervision (403 étudiant)
"""
import pytest


class TestSupervision:

    def test_T20_student_forbidden(self, client, student_headers):
        """T20 — Étudiant accède à supervision → 403."""
        resp = client.get("/supervision/projects", headers=student_headers)
        assert resp.status_code == 403
        assert "enseignants" in resp.json()["detail"].lower()

    def test_T17_teacher_list_projects(self, client, teacher_headers, project_id):
        """T17 — Enseignant liste tous les projets avec statistiques."""
        resp = client.get("/supervision/projects", headers=teacher_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        project = next((p for p in data if p["id"] == project_id), None)
        assert project is not None
        assert "total_tasks" in project
        assert "done_tasks" in project
        assert "progress_percent" in project
        assert 0.0 <= project["progress_percent"] <= 100.0

    def test_T17_project_stats_are_correct(self, client, teacher_headers,
                                            student_headers, project_id):
        """T17 — Les statistiques d'avancement sont calculées correctement."""
        tasks_resp = client.get(f"/projects/{project_id}/tasks",
                                headers=student_headers)
        tasks = tasks_resp.json()
        total = len(tasks)
        done = len([t for t in tasks if t["status"] == "done"])
        expected_pct = round((done / total * 100) if total > 0 else 0, 1)

        sup_resp = client.get(f"/supervision/projects/{project_id}",
                              headers=teacher_headers)
        assert sup_resp.status_code == 200
        sup_data = sup_resp.json()
        assert sup_data["total_tasks"] == total
        assert sup_data["done_tasks"] == done
        assert sup_data["progress_percent"] == expected_pct

    def test_T18_add_feedback(self, client, teacher_headers, project_id):
        """T18 — Enseignant ajoute un feedback avec note."""
        resp = client.post(
            f"/supervision/projects/{project_id}/feedback",
            json={
                "content": "Excellent travail d'équipe, architecture propre.",
                "grade": 17.5,
            },
            headers=teacher_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["content"] == "Excellent travail d'équipe, architecture propre."
        assert data["grade"] == 17.5
        assert data["project_id"] == project_id

    def test_T18_add_feedback_sans_note(self, client, teacher_headers, project_id):
        """T18 — Feedback sans note (grade optionnel)."""
        resp = client.post(
            f"/supervision/projects/{project_id}/feedback",
            json={"content": "Bon début, à améliorer sur les tests."},
            headers=teacher_headers,
        )
        assert resp.status_code == 201
        assert resp.json()["grade"] is None

    def test_T18_student_cannot_add_feedback(self, client, student_headers, project_id):
        """T18 — Étudiant essaie d'ajouter feedback → 403."""
        resp = client.post(
            f"/supervision/projects/{project_id}/feedback",
            json={"content": "Tentative illégale", "grade": 20},
            headers=student_headers,
        )
        assert resp.status_code == 403

    def test_T18_get_feedbacks(self, client, teacher_headers, project_id):
        """T18 — Lister les feedbacks d'un projet."""
        resp = client.get(f"/supervision/projects/{project_id}/feedback",
                          headers=teacher_headers)
        assert resp.status_code == 200
        feedbacks = resp.json()
        assert isinstance(feedbacks, list)
        assert len(feedbacks) >= 1

    def test_T17_project_not_found(self, client, teacher_headers):
        """T17 — Détail d'un projet inexistant → 404."""
        resp = client.get("/supervision/projects/99999", headers=teacher_headers)
        assert resp.status_code == 404

    def test_T20_no_token_forbidden(self, client):
        """T20 — Accès sans token → 401."""
        resp = client.get("/supervision/projects")
        assert resp.status_code == 401
