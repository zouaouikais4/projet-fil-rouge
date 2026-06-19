import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import './Dashboard.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    api.get('/projects/').then((r) => setProjects(r.data));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/projects/', form);
    setProjects([...projects, data]);
    setShowForm(false);
    setForm({ title: '', description: '', start_date: '', end_date: '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce projet ?')) return;
    await api.delete(`/projects/${id}`);
    setProjects(projects.filter((p) => p.id !== id));
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>Mes Projets</h2>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            + Nouveau projet
          </button>
        </div>

        {showForm && (
          <form className="project-form" onSubmit={handleCreate}>
            <h3>Créer un projet</h3>
            <div className="form-group">
              <label>Titre *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date de début</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Date de fin</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Créer</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Annuler
              </button>
            </div>
          </form>
        )}

        {projects.length === 0 ? (
          <p className="empty-state">Aucun projet. Créez votre premier projet !</p>
        ) : (
          <div className="projects-grid">
            {projects.map((p) => (
              <div key={p.id} className="project-card">
                <h3>{p.title}</h3>
                <p>{p.description || 'Aucune description'}</p>
                {p.end_date && (
                  <p className="project-date">
                    Fin : {new Date(p.end_date).toLocaleDateString('fr-FR')}
                  </p>
                )}
                <div className="project-actions">
                  <button
                    className="btn-primary"
                    onClick={() => navigate(`/projects/${p.id}/kanban`)}
                  >
                    Kanban
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(p.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
