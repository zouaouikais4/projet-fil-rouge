"""
Tests Tâches & Kanban — US4 / US5
Couvre : T07 POST /projects/{id}/tasks
         T08 PATCH /tasks/{id}/status
         T09 DEL  /tasks/{id}
"""
import pytest


@pytest.fixture(scope="module")
def task_id(client, student_headers, project_id):
    resp = client.post(f"/projects/{project_id}/tasks", json={
        "title": "Tâche de test initiale",
        "description": "Créée pour les tests",
        "priority": "high",
    }, headers=student_headers)
    assert resp.status_code == 201
    return resp.json()["id"]


class TestTaches:

    def test_T07_create_task(self, client, student_headers, project_id):
        """T07 — Création d'une tâche → 201, statut par défaut todo."""
        resp = client.post(f"/projects/{project_id}/tasks", json={
            "title": "Implémenter Kanban",
            "priority": "high",
            "due_date": "2026-03-01T00:00:00",
        }, headers=student_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Implémenter Kanban"
        assert data["status"] == "todo"
        assert data["priority"] == "high"

    def test_T07_create_task_project_inexistant(self, client, student_headers):
        """T07 — Tâche sur projet inexistant → 404."""
        resp = client.post("/projects/99999/tasks", json={"title": "Ghost task"},
                           headers=student_headers)
        assert resp.status_code == 404

    def test_list_tasks(self, client, student_headers, project_id, task_id):
        """US4 — Listing des tâches d'un projet."""
        resp = client.get(f"/projects/{project_id}/tasks", headers=student_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        ids = [t["id"] for t in data]
        assert task_id in ids

    def test_T08_update_status_in_progress(self, client, student_headers, project_id, task_id):
        """T08 — PATCH statut → in_progress."""
        resp = client.patch(
            f"/projects/{project_id}/tasks/{task_id}/status",
            params={"status": "in_progress"},
            headers=student_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

    def test_T08_update_status_done(self, client, student_headers, project_id, task_id):
        """T08 — PATCH statut → done."""
        resp = client.patch(
            f"/projects/{project_id}/tasks/{task_id}/status",
            params={"status": "done"},
            headers=student_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "done"

    def test_T08_update_status_invalid(self, client, student_headers, project_id, task_id):
        """T08 — PATCH avec statut invalide → 422."""
        resp = client.patch(
            f"/projects/{project_id}/tasks/{task_id}/status",
            params={"status": "statut_bidon"},
            headers=student_headers,
        )
        assert resp.status_code == 422

    def test_update_task_put(self, client, student_headers, project_id, task_id):
        """US4 — PUT modification complète d'une tâche."""
        resp = client.put(f"/projects/{project_id}/tasks/{task_id}", json={
            "title": "Tâche modifiée",
            "priority": "low",
        }, headers=student_headers)
        assert resp.status_code == 200
        assert resp.json()["title"] == "Tâche modifiée"
        assert resp.json()["priority"] == "low"

    def test_T09_delete_task(self, client, student_headers, project_id):
        """T09 — Suppression d'une tâche → 204."""
        create = client.post(f"/projects/{project_id}/tasks",
                             json={"title": "Tâche à supprimer"},
                             headers=student_headers)
        tid = create.json()["id"]
        resp = client.delete(f"/projects/{project_id}/tasks/{tid}",
                             headers=student_headers)
        assert resp.status_code == 204
        get = client.get(f"/projects/{project_id}/tasks/{tid}",
                         headers=student_headers)
        assert get.status_code == 404
