"""
Tests Commentaires — US8
Couvre : T14 POST .../comments
         T15 GET  .../comments
         T16 DEL  .../comments/{id}
"""
import pytest


@pytest.fixture(scope="module")
def comment_task_id(client, student_headers, project_id):
    resp = client.post(f"/projects/{project_id}/tasks", json={
        "title": "Tâche pour commentaires",
    }, headers=student_headers)
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture(scope="module")
def comment_id(client, student_headers, project_id, comment_task_id):
    resp = client.post(
        f"/projects/{project_id}/tasks/{comment_task_id}/comments",
        json={"content": "Premier commentaire de test"},
        headers=student_headers,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


class TestCommentaires:

    def test_T14_add_comment(self, client, student_headers, project_id, comment_task_id):
        """T14 — Ajouter un commentaire → 201."""
        resp = client.post(
            f"/projects/{project_id}/tasks/{comment_task_id}/comments",
            json={"content": "Bon travail sur cette tâche !"},
            headers=student_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["content"] == "Bon travail sur cette tâche !"
        assert "author_id" in data
        assert "created_at" in data

    def test_T14_add_comment_task_inexistante(self, client, student_headers, project_id):
        """T14 — Commenter une tâche inexistante → 404."""
        resp = client.post(
            f"/projects/{project_id}/tasks/99999/comments",
            json={"content": "Orphelin"},
            headers=student_headers,
        )
        assert resp.status_code == 404

    def test_T15_list_comments(self, client, student_headers, project_id,
                                comment_task_id, comment_id):
        """T15 — Lister les commentaires → liste ordonnée."""
        resp = client.get(
            f"/projects/{project_id}/tasks/{comment_task_id}/comments",
            headers=student_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        ids = [c["id"] for c in data]
        assert comment_id in ids

    def test_T15_list_comments_sans_auth(self, client, project_id, comment_task_id):
        """T15 — Lister sans token → 401."""
        resp = client.get(
            f"/projects/{project_id}/tasks/{comment_task_id}/comments"
        )
        assert resp.status_code == 401

    def test_T16_delete_own_comment(self, client, student_headers, project_id,
                                     comment_task_id):
        """T16 — Supprimer son propre commentaire → 204."""
        create = client.post(
            f"/projects/{project_id}/tasks/{comment_task_id}/comments",
            json={"content": "Commentaire à supprimer"},
            headers=student_headers,
        )
        cid = create.json()["id"]
        resp = client.delete(
            f"/projects/{project_id}/tasks/{comment_task_id}/comments/{cid}",
            headers=student_headers,
        )
        assert resp.status_code == 204

    def test_T16_cannot_delete_other_comment(self, client, student_headers,
                                               teacher_headers, project_id,
                                               comment_task_id, comment_id):
        """T16 — Supprimer le commentaire d'un autre → 404."""
        resp = client.delete(
            f"/projects/{project_id}/tasks/{comment_task_id}/comments/{comment_id}",
            headers=teacher_headers,
        )
        assert resp.status_code == 404
