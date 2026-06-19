import React, { useState } from 'react';
import './TaskCard.css';

const PRIORITY_COLORS = { low: '#4CAF50', medium: '#FF9800', high: '#F44336' };
const PRIORITY_LABELS = { low: 'Basse', medium: 'Moyenne', high: 'Haute' };
const COLUMNS = [
  { key: 'todo', label: 'À faire' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'done', label: 'Terminé' },
];

export default function TaskCard({ task, members = [], onMove, onDelete, onEdit, onComment }) {
  const [expanded, setExpanded] = useState(false);

  const assigneeName = () => {
    if (!task.assignee_id) return null;
    const m = members.find(m => m.user_id === task.assignee_id);
    if (m?.user) return `${m.user.first_name} ${m.user.last_name}`;
    return `#${task.assignee_id}`;
  };

  return (
    <div className="task-card" onClick={() => setExpanded(!expanded)}>
      <div className="task-card-header">
        <span className="task-title">{task.title}</span>
        <span className="priority-badge" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>

      {task.assignee_id && (
        <p className="task-assignee">👤 {assigneeName()}</p>
      )}

      {expanded && (
        <div className="task-card-body" onClick={e => e.stopPropagation()}>
          {task.description && <p className="task-desc">{task.description}</p>}
          {task.due_date && (
            <p className="task-due">📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}</p>
          )}
          <div className="task-actions">
            <select value={task.status} onChange={e => onMove(task.id, e.target.value)} className="status-select">
              {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <button className="btn-comment-icon" onClick={() => onComment(task)} title="Commentaires">💬</button>
            <button className="btn-edit" onClick={() => onEdit(task)}>Modifier</button>
            <button className="btn-delete" onClick={() => { if (window.confirm('Supprimer ?')) onDelete(task.id); }}>Supprimer</button>
          </div>
        </div>
      )}
    </div>
  );
}
