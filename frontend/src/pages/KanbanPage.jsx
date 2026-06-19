import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import CommentsPanel from '../components/CommentsPanel';
import './Kanban.css';

const COLUMNS = [
  { key: 'todo',        label: 'A faire',  color: '#E3F2FD', header: '#1565C0' },
  { key: 'in_progress', label: 'En cours', color: '#FFF9C4', header: '#F57F17' },
  { key: 'done',        label: 'Termine',  color: '#E8F5E9', header: '#2E7D32' },
];

const EMPTY = { title: '', description: '', priority: 'medium', due_date: '', assignee_id: '' };

export default function KanbanPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks]       = useState([]);
  const [members, setMembers]   = useState([]);
  const [project, setProject]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [commentsTask, setCommentsTask] = useState(null);

  useEffect(() => {
    api.get(`/projects/${projectId}`).then(r => setProject(r.data));
    api.get(`/projects/${projectId}/tasks`).then(r => setTasks(r.data));
    api.get(`/projects/${projectId}/members`).then(r => setMembers(r.data));
  }, [projectId]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async e => {
    e.preventDefault();
    const payload = { ...form, due_date: form.due_date || null, assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null };
    const { data } = await api.post(`/projects/${projectId}/tasks`, payload);
    setTasks([...tasks, data]);
    setShowForm(false); setForm(EMPTY);
  };

  const handleUpdate = async e => {
    e.preventDefault();
    const payload = { ...form, due_date: form.due_date || null, assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null };
    const { data } = await api.put(`/projects/${projectId}/tasks/${editingTask.id}`, payload);
    setTasks(tasks.map(t => t.id === data.id ? data : t));
    setEditingTask(null); setForm(EMPTY);
  };

  const moveTask = async (taskId, newStatus) => {
    await api.patch(`/projects/${projectId}/tasks/${taskId}/status`, null, { params: { status: newStatus } });
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const deleteTask = async taskId => {
    await api.delete(`/projects/${projectId}/tasks/${taskId}`);
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const openEdit = task => {
    setEditingTask(task);
    setForm({ title: task.title, description: task.description || '', priority: task.priority, due_date: task.due_date ? task.due_date.substring(0,10) : '', assignee_id: task.assignee_id || '' });
  };

  const isEditing = !!editingTask;
  const isFormOpen = showForm || isEditing;

  return (
    <>
      <Navbar />
      <div className="kanban-container">
        <div className="kanban-topbar">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>← Retour</button>
          <h2>{project ? project.title : 'Chargement...'}</h2>
          <button className="btn-primary" onClick={() => { setShowForm(true); setEditingTask(null); setForm(EMPTY); }}>
            + Nouvelle tâche
          </button>
        </div>

        {isFormOpen && (
          <form className="task-form" onSubmit={isEditing ? handleUpdate : handleCreate}>
            <h3>{isEditing ? 'Modifier la tâche' : 'Nouvelle tâche'}</h3>
            <div className="form-group">
              <label>Titre *</label>
              <input name="title" value={form.title} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Priorité</label>
                <select name="priority" value={form.priority} onChange={handleChange}>
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>
              <div className="form-group">
                <label>Échéance</label>
                <input type="date" name="due_date" value={form.due_date} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Assigner à</label>
              <select name="assignee_id" value={form.assignee_id} onChange={handleChange}>
                <option value="">-- Non assignée --</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user ? `${m.user.first_name} ${m.user.last_name}` : `Membre #${m.user_id}`} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">{isEditing ? 'Enregistrer' : 'Créer'}</button>
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingTask(null); setForm(EMPTY); }}>Annuler</button>
            </div>
          </form>
        )}

        <div className="kanban-board">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="kanban-column">
                <div className="column-header" style={{ backgroundColor: col.header }}>
                  <span>{col.label}</span>
                  <span className="col-count">{colTasks.length}</span>
                </div>
                <div className="column-body" style={{ backgroundColor: col.color }}>
                  {colTasks.length === 0 && <p className="col-empty">Aucune tâche</p>}
                  {colTasks.map(task => (
                    <TaskCard key={task.id} task={task}
                      members={members}
                      onMove={moveTask} onDelete={deleteTask}
                      onEdit={openEdit} onComment={() => setCommentsTask(task)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {commentsTask && (
        <CommentsPanel
          projectId={projectId}
          taskId={commentsTask.id}
          taskTitle={commentsTask.title}
          onClose={() => setCommentsTask(null)}
        />
      )}
    </>
  );
}
