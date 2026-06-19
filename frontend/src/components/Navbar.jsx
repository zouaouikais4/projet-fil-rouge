import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">ProjetManager</Link>
      </div>
      <div className="navbar-links">
        <Link to="/dashboard">Projets</Link>
        <Link to="/invitations">Invitations</Link>
        {user?.role === 'teacher' && (
          <Link to="/supervision">Supervision</Link>
        )}
      </div>
      <div className="navbar-menu">
        {user && (
          <>
            <span className="navbar-user">{user.first_name} {user.last_name}</span>
            <span className="navbar-role">{user.role === 'teacher' ? 'Enseignant' : 'Etudiant'}</span>
            <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
          </>
        )}
      </div>
    </nav>
  );
}
