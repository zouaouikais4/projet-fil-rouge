import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import './Auth.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-logo">ProjetManager</h1>
        <h2>Créer un compte</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Prénom</label>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              placeholder="Mohamed"
              required
            />
          </div>
          <div className="form-group">
            <label>Nom</label>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Dupont"
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="form-group">
            <label>Rôle</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${form.role === 'student' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'student' })}
              >
                🎓 Étudiant
              </button>
              <button
                type="button"
                className={`role-btn ${form.role === 'teacher' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'teacher' })}
              >
                👨‍🏫 Enseignant
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Inscription...' : "S'inscrire"}
          </button>
        </form>
        <p className="auth-link">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
