import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useProjectChat } from '../hooks/useProjectChat';
import api from '../api/axios';

const TYPING_STOP_DELAY_MS = 1500;
const API_BASE = 'http://localhost:8000';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/* ── Pièce jointe affichée dans une bulle ──────────────────────────────────── */
function Attachment({ message }) {
  if (!message.file_url) return null;
  const fullUrl = `${API_BASE}${message.file_url}`;

  if (message.file_type === 'image') {
    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer">
        <img src={fullUrl} alt={message.file_name} style={att.image} />
      </a>
    );
  }

  return (
    <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={att.fileCard}>
      <span style={att.fileIcon}>📄</span>
      <div style={{ minWidth: 0 }}>
        <div style={att.fileName}>{message.file_name}</div>
        <div style={att.fileSize}>{formatFileSize(message.file_size)}</div>
      </div>
    </a>
  );
}

const att = {
  image: { maxWidth: '220px', maxHeight: '220px', borderRadius: '10px', display: 'block', cursor: 'pointer' },
  fileCard: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
    background: 'rgba(0,0,0,0.04)', borderRadius: '8px', textDecoration: 'none', maxWidth: '220px',
  },
  fileIcon: { fontSize: '20px', flexShrink: 0 },
  fileName: { fontSize: '12px', fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileSize: { fontSize: '11px', color: '#9ca3af' },
};

/* ── Fenêtre de chat ────────────────────────────────────────────────────────── */
function ChatWindow({ projectId, projectTitle, token, currentUserId, otherMemberCount, onClose }) {
  const {
    messages, send, connected, typingUsers,
    sendTyping, sendStopTyping, markAsRead, uploadFile,
  } = useProjectChat(projectId, token);

  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingStopTimer = useRef(null);
  const readMessagesRef = useRef(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  useEffect(() => {
    messages.forEach((m) => {
      if (
        m.sender_id !== currentUserId &&
        m.id &&
        !readMessagesRef.current.has(m.id) &&
        !(m.read_by || []).includes(currentUserId)
      ) {
        readMessagesRef.current.add(m.id);
        markAsRead(m.id);
      }
    });
  }, [messages, currentUserId, markAsRead]);

  const handleChange = (e) => {
    setInput(e.target.value);
    sendTyping();
    clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(sendStopTyping, TYPING_STOP_DELAY_MS);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !connected) return;
    send(trimmed);
    setInput('');
    clearTimeout(typingStopTimer.current);
    sendStopTyping();
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    try {
      const meta = await uploadFile(file);
      send('', meta);
    } catch (err) {
      setUploadError(err.message);
      setTimeout(() => setUploadError(null), 4000);
    } finally {
      setUploading(false);
    }
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

  const typingLabel = (() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].sender_name} écrit…`;
    return `${typingUsers.length} personnes écrivent…`;
  })();

  const lastMineIndex = [...messages].reverse().findIndex((m) => m.sender_id === currentUserId);
  const lastMineMsg = lastMineIndex !== -1 ? messages[messages.length - 1 - lastMineIndex] : null;
  const lastMineSeen = lastMineMsg && (lastMineMsg.read_by || []).filter((id) => id !== currentUserId).length >= otherMemberCount && otherMemberCount > 0;

  return (
    <div style={w.window}>
      <div style={w.header}>
        <span style={w.headerTitle}>💬 {projectTitle}</span>
        <div style={w.headerRight}>
          <span title={connected ? 'Connecté' : 'Reconnexion…'}
                style={{ ...w.dot, background: connected ? '#22c55e' : '#ef4444' }} />
          <button onClick={onClose} style={w.closeBtn} aria-label="Fermer">✕</button>
        </div>
      </div>

      <div style={w.messageList}>
        {messages.length === 0 && (
          <p style={w.empty}>Aucun message. Commencez la conversation !</p>
        )}
        {messages.map((m, i) => {
          const isMine = m.sender_id === currentUserId;
          const isLastMine = isMine && m.id === lastMineMsg?.id;
          return (
            <div key={m.id ?? i} style={{ ...w.bubbleWrap, alignItems: isMine ? 'flex-end' : 'flex-start' }}>
              {!isMine && <span style={w.senderName}>{m.sender_name}</span>}
              {m.file_url && (
                <div style={{ marginBottom: m.content ? '4px' : 0 }}>
                  <Attachment message={m} />
                </div>
              )}
              {m.content && (
                <div style={{
                  ...w.bubble,
                  background: isMine ? '#6366f1' : '#e5e7eb',
                  color: isMine ? '#fff' : '#111',
                }}>
                  {m.content}
                </div>
              )}
              <span style={w.time}>
                {formatTime(m.created_at)}
                {isLastMine && lastMineSeen && <span style={w.seenLabel}> · Vu</span>}
              </span>
            </div>
          );
        })}

        {typingLabel && (
          <div style={w.typingRow}>
            <span style={w.typingDots}>
              <span style={w.typingDot} />
              <span style={{ ...w.typingDot, animationDelay: '0.15s' }} />
              <span style={{ ...w.typingDot, animationDelay: '0.3s' }} />
            </span>
            <span style={w.typingLabel}>{typingLabel}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {uploadError && <div style={w.uploadError}>{uploadError}</div>}
      {uploading && <div style={w.uploadingBar}>Envoi du fichier…</div>}

      <div style={w.inputRow}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={handleFilePick}
          disabled={!connected || uploading}
          style={w.attachBtn}
          aria-label="Joindre un fichier"
          title="Joindre une image ou un PDF"
        >
          📎
        </button>
        <input
          value={input}
          onChange={handleChange}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder={connected ? 'Écrire un message…' : 'Reconnexion en cours…'}
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

/* ── Bulle flottante ────────────────────────────────────────────────────────── */
export default function ChatBubble() {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [unread, setUnread] = useState(0);
  const prevCountRef = useRef(0);
  const openRef = useRef(open);
  openRef.current = open;

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

  const { messages } = useProjectChat(selectedProject?.id ?? null, token);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const newOnes = messages.slice(prevCountRef.current);
      const fromOthers = newOnes.filter((m) => m.sender_id !== user?.id);

      if (fromOthers.length > 0) {
        if (!openRef.current) {
          setUnread((u) => u + fromOthers.length);
        }
        const latest = fromOthers[fromOthers.length - 1];
        showToast({
          title: latest.sender_name,
          body: latest.content || (latest.file_name ? `📎 ${latest.file_name}` : 'Pièce jointe'),
          onClick: () => setOpen(true),
        });
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, user, showToast]);

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
  };

  if (!user || !token) return null;

  const otherMemberCount = selectedProject
    ? Math.max((selectedProject.members_count ?? 1) - 1, 1)
    : 0;

  return (
    <div style={b.root}>
      {open && selectedProject && (
        <div style={b.windowWrap}>
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
            otherMemberCount={otherMemberCount}
            onClose={() => setOpen(false)}
          />
        </div>
      )}

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
    width: '360px', height: '500px', display: 'flex', flexDirection: 'column',
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
  seenLabel: { color: '#6366f1', fontWeight: 500 },
  typingRow: { display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px' },
  typingDots: { display: 'flex', gap: '3px' },
  typingDot: {
    width: '5px', height: '5px', borderRadius: '50%', background: '#9ca3af',
    animation: 'chatTypingBounce 1s infinite ease-in-out',
  },
  typingLabel: { fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' },
  uploadError: { fontSize: '11px', color: '#ef4444', padding: '4px 12px', background: '#fef2f2' },
  uploadingBar: { fontSize: '11px', color: '#6366f1', padding: '4px 12px', background: '#eef2ff' },
  inputRow: { display: 'flex', gap: '6px', padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#fff', alignItems: 'center' },
  attachBtn: {
    width: '32px', height: '32px', borderRadius: '50%', background: 'transparent',
    border: 'none', fontSize: '16px', cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  input: { flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '20px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' },
  sendBtn: { width: '36px', height: '36px', borderRadius: '50%', background: '#6366f1', color: '#fff', border: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};

if (typeof document !== 'undefined' && !document.getElementById('chat-typing-keyframes')) {
  const style = document.createElement('style');
  style.id = 'chat-typing-keyframes';
  style.textContent = `
    @keyframes chatTypingBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}
