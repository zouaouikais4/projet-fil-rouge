import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './CommentsPanel.css';

export default function CommentsPanel({ projectId, taskId, taskTitle, onClose }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/projects/${projectId}/tasks/${taskId}/comments`)
      .then(r => setComments(r.data))
      .finally(() => setLoading(false));
  }, [projectId, taskId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const { data } = await api.post(
      `/projects/${projectId}/tasks/${taskId}/comments`,
      { content: text }
    );
    setComments([...comments, data]);
    setText('');
  };

  const handleDelete = async (commentId) => {
    await api.delete(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`);
    setComments(comments.filter(c => c.id !== commentId));
  };

  return (
    <div className="comments-overlay" onClick={onClose}>
      <div className="comments-panel" onClick={e => e.stopPropagation()}>
        <div className="comments-header">
          <div>
            <h3>Commentaires</h3>
            <p className="comments-task-title">{taskTitle}</p>
          </div>
          <button className="comments-close" onClick={onClose}>✕</button>
        </div>

        <div className="comments-list">
          {loading && <p className="comments-empty">Chargement...</p>}
          {!loading && comments.length === 0 && (
            <p className="comments-empty">Aucun commentaire. Soyez le premier !</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="comment-item">
              <div className="comment-meta">
                <span className="comment-author">
                  {c.author ? `${c.author.first_name} ${c.author.last_name}` : `Utilisateur #${c.author_id}`}
                </span>
                <span className="comment-date">
                  {new Date(c.created_at).toLocaleString('fr-FR')}
                </span>
                {c.author_id === user?.id && (
                  <button
                    className="comment-delete"
                    onClick={() => handleDelete(c.id)}
                  >✕</button>
                )}
              </div>
              <p className="comment-content">{c.content}</p>
            </div>
          ))}
        </div>

        <form className="comments-form" onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Écrire un commentaire..."
            rows={3}
            required
          />
          <button type="submit" className="btn-comment">
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
