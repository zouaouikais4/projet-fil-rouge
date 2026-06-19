import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE  = 'ws://localhost:8000';
const API_BASE = 'http://localhost:8000';
const RECONNECT_DELAY_MS = 2000;
const TYPING_TIMEOUT_MS = 2500;

export function useProjectChat(projectId, token) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const typingTimeoutsRef = useRef({});
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

      if (data.type === 'read_receipt') {
        setMessages((prev) => prev.map((m) =>
          m.id === data.message_id
            ? { ...m, read_by: [...new Set([...(m.read_by || []), data.user_id])] }
            : m
        ));
        return;
      }

      // Nouveau message (texte et/ou pièce jointe)
      setMessages((prev) => [...prev, data]);
    };

    socket.onclose = (e) => {
      setConnected(false);
      if (e.code === 4001) console.error('WS : token invalide');
      if (e.code === 4003) console.error('WS : accès refusé au projet');
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

  const send = useCallback((content, attachment = null) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ content, ...attachment }));
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

  const markAsRead = useCallback((messageId) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'read', message_id: messageId }));
    }
  }, []);

  // Upload de fichier — retourne les métadonnées à passer à send()
  const uploadFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Échec de l\'upload');
    }
    return res.json(); // { file_url, file_name, file_type, file_size }
  }, [token]);

  return {
    messages, send, connected, typingUsers,
    sendTyping, sendStopTyping, markAsRead, uploadFile,
  };
}
