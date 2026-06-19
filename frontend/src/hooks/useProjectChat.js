import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE  = 'ws://localhost:8000';
const API_BASE = 'http://localhost:8000';
const RECONNECT_DELAY_MS = 2000;
const TYPING_TIMEOUT_MS = 2500;

/**
 * Hook — messagerie temps réel pour un projet, avec reconnexion automatique
 * et indicateur de frappe.
 *
 * @param {number|null} projectId
 * @param {string|null} token
 */
export function useProjectChat(projectId, token) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]); // [{sender_id, sender_name}]

  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const typingTimeoutsRef = useRef({}); // { sender_id: timeoutId }
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    if (!projectId || !token) return;

    const socket = new WebSocket(
      `${WS_BASE}/ws/projects/${projectId}?token=${token}`
    );
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'typing') {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.sender_id === data.sender_id)) return prev;
          return [...prev, { sender_id: data.sender_id, sender_name: data.sender_name }];
        });
        // auto-clear si pas de "stop_typing" reçu après un délai
        clearTimeout(typingTimeoutsRef.current[data.sender_id]);
        typingTimeoutsRef.current[data.sender_id] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.sender_id !== data.sender_id));
        }, TYPING_TIMEOUT_MS);
        return;
      }

      if (data.type === 'stop_typing') {
        clearTimeout(typingTimeoutsRef.current[data.sender_id]);
        setTypingUsers((prev) => prev.filter((u) => u.sender_id !== data.sender_id));
        return;
      }

      // Message de chat normal
      setMessages((prev) => [...prev, data]);
    };

    socket.onclose = (e) => {
      setConnected(false);
      if (e.code === 4001) console.error('WS : token invalide');
      if (e.code === 4003) console.error('WS : accès refusé au projet');

      // Reconnexion automatique sauf fermeture volontaire (démontage / changement de projet)
      if (shouldReconnect.current) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    socket.onerror = () => socket.close();
  }, [projectId, token]);

  useEffect(() => {
    if (!projectId || !token) return;

    shouldReconnect.current = true;
    connect();

    // Charger l'historique
    fetch(`${API_BASE}/projects/${projectId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { if (Array.isArray(data)) setMessages(data); })
      .catch(console.error);

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      ws.current?.close();
      setMessages([]);
      setTypingUsers([]);
    };
  }, [projectId, token, connect]);

  const send = useCallback((content) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ content }));
    }
  }, []);

  const sendTyping = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'typing' }));
    }
  }, []);

  const sendStopTyping = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'stop_typing' }));
    }
  }, []);

  return { messages, send, connected, typingUsers, sendTyping, sendStopTyping };
}
