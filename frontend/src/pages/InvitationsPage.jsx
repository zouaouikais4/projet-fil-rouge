import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import './Invitations.css';

export default function InvitationsPage() {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendForm, setSendForm] = useState({ project_id: '', email: '' });
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/invitations/my'),
      api.get('/projects/'),
    ]).then(([inv, proj]) => {
      setInvitations(inv.data);
      setProjects(proj.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await api.post('/invitations/', {
        project_id: parseInt(sendForm.project_id),
        email: sendForm.email,
      });
      setMessage('Invitation envoyée avec succès !');
      setSendForm({ project_id: '', email: '' });
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'envoi");
    }
  };

  const handleAccept = async (id) => {
    await api.patch(`/invitations/${id}/accept`);
    setInvitations(invitations.filter(i => i.id !== id));
    setMessage('Invitation acceptée ! Vous rejoignez le projet.');
  };

  const handleDecline = async (id) => {
    await api.patch(`/invitations/${id}/decline`);
    setInvitations(invitations.filter(i => i.id !== id));
  };

  return (
    <>
      <Navbar />
      <div className="inv-container">
        <div className="inv-header">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>← Retour</button>
          <h2>Invitations</h2>
        </div>

        {/* Send invitation form */}
        <div className="inv-card">
          <h3>Inviter un membre</h3>
          {message && <div className="inv-success">{message}</div>}
          {error   && <div className="inv-error">{error}</div>}
          <form onSubmit={handleSend} className="inv-form">
            <div className="form-group">
              <label>Projet</label>
              <select
                value={sendForm.project_id}
                onChange={e => setSendForm({ ...sendForm, project_id: e.target.value })}
                required
              >
                <option value="">-- Choisir un projet --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Email de l'invité</label>
              <input
                type="email"
                placeholder="membre@email.com"
                value={sendForm.email}
                onChange={e => setSendForm({ ...sendForm, email: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-primary">Envoyer l'invitation</button>
          </form>
        </div>

        {/* Received invitations */}
        <div className="inv-card">
          <h3>Invitations reçues</h3>
          {loading && <p className="inv-empty">Chargement...</p>}
          {!loading && invitations.length === 0 && (
            <p className="inv-empty">Aucune invitation en attente.</p>
          )}
          <div className="inv-list">
            {invitations.map(inv => (
              <div key={inv.id} className="inv-item">
                <div className="inv-info">
                  <span className="inv-project">Projet #{inv.project_id}</span>
                  <span className="inv-expires">
                    Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="inv-actions">
                  <button className="btn-accept" onClick={() => handleAccept(inv.id)}>
                    Accepter
                  </button>
                  <button className="btn-decline" onClick={() => handleDecline(inv.id)}>
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
