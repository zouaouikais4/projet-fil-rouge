import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE  = 'ws://localhost:8000';
const API_BASE = 'http://localhost:8000';

/**
 * Hook — messagerie temps réel pour un projet.
 *
 * @param {number|null} projectId
 * @param {string|null} token  — JWT issu du contexte Auth (jamais localStorage)
 */
export function useProjectChat(projectId, token) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    if (!projectId || !token) return;

    // 1. Charger l'historique via REST
    fetch(`${API_BASE}/projects/${projectId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { if (Array.isArray(data)) setMessages(data); })
      .catch(console.error);

    // 2. Ouvrir le WebSocket
    const socket = new WebSocket(
      `${WS_BASE}/ws/projects/${projectId}?token=${token}`
    );
    ws.current = socket;

    socket.onopen  = () => setConnected(true);

    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      setMessages((prev) => [...prev, msg]);
    };

    socket.onclose = (e) => {
      setConnected(false);
      if (e.code === 4001) console.error('WS : token invalide');
      if (e.code === 4003) console.error('WS : accès refusé au projet');
    };

    socket.onerror = (e) => console.error('WS erreur :', e);

    return () => {
      socket.close();
      setConnected(false);
      setMessages([]);
    };
  }, [projectId, token]);

  const send = useCallback((content) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ content }));
    }
  }, []);

  return { messages, send, connected };
}
