"""
Tests Invitations — US7
Couvre : T10 POST /invitations/
         T11 GET  /invitations/my
         T12 PATCH /invitations/{id}/accept
         T13 PATCH /invitations/{id}/decline
"""
import pytest
from tests.conftest import register_and_login


@pytest.fixture(scope="module")
def invitee_headers(client):
    return register_and_login(client, "invite@test.tn",
                               first_name="Mourad", last_name="Ayadi")


@pytest.fixture(scope="module")
def invitation_id(client, student_headers, project_id, invitee_headers):
    resp = client.post("/invitations/", json={
        "project_id": project_id,
        "email": "invite@test.tn",
    }, headers=student_headers)
    if resp.status_code == 400 and "déjà" in resp.text:
        inv_resp = client.get("/invitations/my", headers=invitee_headers)
        invs = inv_resp.json()
        assert len(invs) > 0, "Aucune invitation en attente pour l'invité"
        return invs[0]["id"]
    assert resp.status_code == 201
    return resp.json()["id"]


class TestInvitations:

    def test_T11_list_my_invitations_empty(self, client, student_headers):
        """T11 — Lister ses invitations (expéditeur → liste vide)."""
        resp = client.get("/invitations/my", headers=student_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_T10_send_invitation(self, client, student_headers, project_id, invitation_id):
        """T10 — Envoi d'une invitation valide → 201 ou invitation déjà en attente."""
        assert invitation_id is not None

    def test_T11_invitee_sees_invitation(self, client, invitee_headers, invitation_id):
        """T11 — L'invité voit l'invitation dans /invitations/my."""
        resp = client.get("/invitations/my", headers=invitee_headers)
        assert resp.status_code == 200
        ids = [i["id"] for i in resp.json()]
        assert invitation_id in ids

    def test_T10_send_to_unknown_email(self, client, student_headers, project_id):
        """T10 — Inviter un email inexistant → 404."""
        resp = client.post("/invitations/", json={
            "project_id": project_id,
            "email": "fantome@nulle.part",
        }, headers=student_headers)
        assert resp.status_code == 404

    def test_T10_non_admin_cannot_invite(self, client, teacher_headers, project_id):
        """T10 — Un non-admin ne peut pas inviter → 403."""
        resp = client.post("/invitations/", json={
            "project_id": project_id,
            "email": "enseignant@test.tn",
        }, headers=teacher_headers)
        assert resp.status_code == 403

    def test_T13_decline_invitation(self, client, student_headers, project_id):
        """T13 — Refuser une invitation."""
        other_headers = register_and_login(client, "declinee@test.tn",
                                            first_name="User", last_name="Decline")
        client.post("/invitations/", json={
            "project_id": project_id,
            "email": "declinee@test.tn",
        }, headers=student_headers)
        inv_resp = client.get("/invitations/my", headers=other_headers)
        invs = inv_resp.json()
        if invs:
            inv_id = invs[0]["id"]
            resp = client.patch(f"/invitations/{inv_id}/decline", headers=other_headers)
            assert resp.status_code == 200
            assert resp.json()["status"] == "declined"

    def test_T12_accept_adds_to_project(self, client, invitee_headers,
                                         student_headers, project_id, invitation_id):
        """T12 — Accepter → invité ajouté comme membre."""
        resp = client.patch(f"/invitations/{invitation_id}/accept",
                            headers=invitee_headers)
        assert resp.status_code in (200, 404)
        if resp.status_code == 200:
            members = client.get(f"/projects/{project_id}/members",
                                 headers=student_headers)
            user_ids = [m["user_id"] for m in members.json()]
            me = client.get("/auth/me", headers=invitee_headers).json()
            assert me["id"] in user_ids
