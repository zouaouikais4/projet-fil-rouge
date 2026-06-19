import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjectChat } from '../hooks/useProjectChat';
import api from '../api/axios';

/* ── Sous-composant : fenêtre de chat ──────────────────────────────────────── */
function ChatWindow({ projectId, projectTitle, token, currentUserId, onClose }) {
  const { messages, send, connected } = useProjectChat(projectId, token);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !connected) return;
    send(trimmed);
    setInput('');
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit' }) +
          ' ' + d.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={w.window}>
      {/* Header */}
      <div style={w.header}>
        <span style={w.headerTitle}>💬 {projectTitle}</span>
        <div style={w.headerRight}>
          <span title={connected ? 'Connecté' : 'Déconnecté'}
                style={{ ...w.dot, background: connected ? '#22c55e' : '#ef4444' }} />
          <button onClick={onClose} style={w.closeBtn} aria-label="Fermer">✕</button>
        </div>
      </div>

      {/* Messages */}
      <div style={w.messageList}>
        {messages.length === 0 && (
          <p style={w.empty}>Aucun message. Commencez la conversation !</p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          return (
            <div key={m.id} style={{ ...w.bubbleWrap, alignItems: isMine ? 'flex-end' : 'flex-start' }}>
              {!isMine && <span style={w.senderName}>{m.sender_name}</span>}
              <div style={{
                ...w.bubble,
                background: isMine ? '#6366f1' : '#e5e7eb',
                color: isMine ? '#fff' : '#111',
              }}>
                {m.content}
              </div>
              <span style={w.time}>{formatTime(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={w.inputRow}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder={connected ? 'Écrire un message…' : 'Connexion en cours…'}
          disabled={!connected}
          style={w.input}
        />
        <button
          onClick={handleSend}
          disabled={!connected || !input.trim()}
          style={{
            ...w.sendBtn,
            opacity: (!connected || !input.trim()) ? 0.5 : 1,
            cursor: (!connected || !input.trim()) ? 'not-allowed' : 'pointer',
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

/* ── Composant principal : bulle flottante ─────────────────────────────────── */
export default function ChatBubble() {
  const { user, token } = useAuth();          // token vient du contexte, plus de localStorage
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [unread, setUnread] = useState(0);
  const prevCountRef = useRef(0);

  // Charger les projets de l'utilisateur connecté
  useEffect(() => {
    if (!user || !token) return;
    api.get('/projects/')
      .then((r) => {
        setProjects(r.data);
        if (r.data.length > 0) {
          setSelectedProject((prev) => prev ?? r.data[0]);
        }
      })
      .catch(console.error);
  }, [user, token]);

  // Compteur de non-lus sur le projet sélectionné quand la bulle est fermée
  const { messages } = useProjectChat(selectedProject?.id ?? null, token);
  useEffect(() => {
    if (!open && messages.length > prevCountRef.current) {
      setUnread((u) => u + (messages.length - prevCountRef.current));
    }
    prevCountRef.current = messages.length;
  }, [messages, open]);

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
  };

  // Ne rien afficher si pas de session
  if (!user || !token) return null;

  return (
    <div style={b.root}>
      {/* Fenêtre de chat */}
      {open && selectedProject && (
        <div style={b.windowWrap}>
          {/* Sélecteur de projet si plusieurs */}
          {projects.length > 1 && (
            <select
              value={selectedProject.id}
              onChange={(e) => {
                const p = projects.find((p) => p.id === Number(e.target.value));
                setSelectedProject(p);
              }}
              style={b.projectSelect}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
          <ChatWindow
            key={selectedProject.id}
            projectId={selectedProject.id}
            projectTitle={selectedProject.title}
            token={token}
            currentUserId={user.id}
            onClose={() => setOpen(false)}
          />
        </div>
      )}

      {/* Bouton FAB */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        style={b.fab}
        aria-label="Chat"
      >
        {open ? '✕' : '💬'}
        {!open && unread > 0 && (
          <span style={b.badge}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────────── */
const b = {
  root: {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px',
  },
  windowWrap: { display: 'flex', flexDirection: 'column', gap: '6px', width: '360px' },
  projectSelect: {
    width: '100%', padding: '8px 12px', borderRadius: '10px',
    border: '1px solid #d1d5db', background: '#fff', fontSize: '13px',
    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  fab: {
    width: '56px', height: '56px', borderRadius: '50%', background: '#6366f1',
    color: '#fff', border: 'none', fontSize: '22px', cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(99,102,241,0.45)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
    transition: 'transform 0.15s',
  },
  badge: {
    position: 'absolute', top: '2px', right: '2px', background: '#ef4444',
    color: '#fff', fontSize: '10px', fontWeight: 700, borderRadius: '999px',
    minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '0 4px', border: '2px solid #fff',
  },
};

const w = {
  window: {
    width: '360px', height: '460px', display: 'flex', flexDirection: 'column',
    borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    background: '#fff', border: '1px solid #e5e7eb', fontSize: '14px', fontFamily: 'sans-serif',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: '#6366f1', color: '#fff',
  },
  headerTitle: { fontWeight: 600, fontSize: '14px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  closeBtn: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px', padding: '0', lineHeight: 1 },
  messageList: { flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f9fafb' },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: '60px', fontSize: '13px' },
  bubbleWrap: { display: 'flex', flexDirection: 'column', maxWidth: '80%' },
  senderName: { fontSize: '11px', color: '#6b7280', marginBottom: '2px', paddingLeft: '4px' },
  bubble: { padding: '7px 11px', borderRadius: '10px', lineHeight: 1.5, wordBreak: 'break-word', fontSize: '13px' },
  time: { fontSize: '10px', color: '#9ca3af', marginTop: '2px', paddingLeft: '4px' },
  inputRow: { display: 'flex', gap: '8px', padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#fff' },
  input: { flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '20px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' },
  sendBtn: { width: '36px', height: '36px', borderRadius: '50%', background: '#6366f1', color: '#fff', border: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};
