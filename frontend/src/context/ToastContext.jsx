import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback(({ title, body, onClick }) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, title, body, onClick }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={s.container}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={s.toast}
            onClick={() => { t.onClick?.(); dismiss(t.id); }}
          >
            <div style={s.icon}>💬</div>
            <div style={s.content}>
              <div style={s.title}>{t.title}</div>
              <div style={s.body}>{t.body}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
              style={s.closeBtn}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const s = {
  container: {
    position: 'fixed',
    bottom: '100px',
    right: '24px',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '320px',
  },
  toast: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px 14px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    animation: 'toastSlideIn 0.25s ease-out',
  },
  icon: { fontSize: '20px', flexShrink: 0 },
  content: { flex: 1, minWidth: 0 },
  title: { fontWeight: 600, fontSize: '13px', color: '#111', marginBottom: '2px' },
  body: { fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  closeBtn: { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '12px', padding: '2px', flexShrink: 0 },
};

if (typeof document !== 'undefined' && !document.getElementById('toast-keyframes')) {
  const style = document.createElement('style');
  style.id = 'toast-keyframes';
  style.textContent = `
    @keyframes toastSlideIn {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}
