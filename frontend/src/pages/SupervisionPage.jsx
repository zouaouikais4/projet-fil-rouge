import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './Supervision.css';

export default function SupervisionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [form, setForm] = useState({ content: '', grade: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'teacher') {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    api.get('/supervision/projects')
      .then(r => setProjects(r.data))
      .catch(err => {
        if (err.response?.status === 403) setAccessDenied(true);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const openProject = async (p) => {
    setSelected(p);
    setMessage('');
    setForm({ content: '', grade: '' });
    const { data } = await api.get(`/supervision/projects/${p.id}/feedback`);
    setFeedbacks(data);
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    const payload = {
      content: form.content,
      grade: form.grade ? parseFloat(form.grade) : null,
    };
    const { data } = await api.post(`/supervision/projects/${selected.id}/feedback`, payload);
    setFeedbacks([data, ...feedbacks]);
    setMessage('Feedback envoyé avec succès !');
    setForm({ content: '', grade: '' });
  };

  const progressColor = (pct) => {
    if (pct >= 75) return '#2E7D32';
    if (pct >= 40) return '#F57F17';
    return '#C62828';
  };

  if (loading) return (
    <>
      <Navbar />
      <div className="sup-container">
        <p className="sup-empty">Chargement...</p>
      </div>
    </>
  );

  if (accessDenied) return (
    <>
      <Navbar />
      <div className="sup-container">
        <div className="sup-access-denied">
          <span className="sup-denied-icon">🔒</span>
          <h3>Accès réservé aux enseignants</h3>
          <p>Cette section est uniquement accessible aux comptes avec le rôle <strong>Enseignant</strong>.</p>
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            ← Retour au Dashboard
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="sup-container">
        <div className="sup-header">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>← Retour</button>
          <h2>👨‍🏫 Supervision Pédagogique</h2>
        </div>

        {!selected ? (
          <>
            {projects.length === 0 ? (
              <div className="sup-no-projects">
                <span style={{ fontSize: 48 }}>📭</span>
                <p>Aucun projet étudiant à superviser pour l'instant.</p>
              </div>
            ) : (
              <div className="sup-grid">
                {projects.map(p => (
                  <div key={p.id} className="sup-card" onClick={() => openProject(p)}>
                    <h3>{p.title}</h3>
                    <p className="sup-desc">{p.description || 'Aucune description'}</p>

                    <div className="sup-progress-label">
                      <span>Avancement</span>
                      <strong style={{ color: progressColor(p.progress_percent) }}>
                        {p.progress_percent}%
                      </strong>
                    </div>
                    <div className="sup-progress-bar">
                      <div
                        className="sup-progress-fill"
                        style={{
                          width: `${p.progress_percent}%`,
                          background: progressColor(p.progress_percent)
                        }}
                      />
                    </div>

                    <div className="sup-stats">
                      <div className="sup-stat todo">
                        <span>{p.todo_tasks}</span>
                        <label>À faire</label>
                      </div>
                      <div className="sup-stat progress">
                        <span>{p.in_progress_tasks}</span>
                        <label>En cours</label>
                      </div>
                      <div className="sup-stat done">
                        <span>{p.done_tasks}</span>
                        <label>Terminé</label>
                      </div>
                    </div>

                    <button className="btn-detail">Voir détail & Feedback →</button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="sup-detail">
            <button className="btn-back" onClick={() => setSelected(null)}>← Tous les projets</button>
            <h3>{selected.title}</h3>

            <div className="sup-detail-stats">
              <div className="stat-box blue">
                <span>{selected.total_tasks}</span><label>Total tâches</label>
              </div>
              <div className="stat-box green">
                <span>{selected.done_tasks}</span><label>Terminées</label>
              </div>
              <div className="stat-box orange">
                <span>{selected.in_progress_tasks}</span><label>En cours</label>
              </div>
              <div className="stat-box red">
                <span>{selected.todo_tasks}</span><label>À faire</label>
              </div>
              <div className="stat-box purple">
                <span>{selected.progress_percent}%</span><label>Avancement</label>
              </div>
            </div>

            <div className="sup-feedback-form">
              <h4>✍️ Ajouter un feedback</h4>
              {message && <div className="inv-success">{message}</div>}
              <form onSubmit={handleFeedback}>
                <div className="form-group">
                  <label>Commentaire</label>
                  <textarea
                    rows={4}
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder="Votre retour sur ce projet..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Note /20 (optionnel)</label>
                  <input
                    type="number"
                    min="0" max="20" step="0.5"
                    value={form.grade}
                    onChange={e => setForm({ ...form, grade: e.target.value })}
                    placeholder="ex: 15.5"
                  />
                </div>
                <button type="submit" className="btn-primary">Envoyer le feedback</button>
              </form>
            </div>

            <div className="sup-feedbacks">
              <h4>Feedbacks précédents ({feedbacks.length})</h4>
              {feedbacks.length === 0 && (
                <p className="sup-empty">Aucun feedback pour ce projet.</p>
              )}
              {feedbacks.map(f => (
                <div key={f.id} className="feedback-item">
                  <div className="feedback-meta">
                    <span>Enseignant #{f.teacher_id}</span>
                    <span>{new Date(f.created_at).toLocaleDateString('fr-FR')}</span>
                    {f.grade !== null && (
                      <span className="feedback-grade">{f.grade}/20</span>
                    )}
                  </div>
                  <p>{f.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
