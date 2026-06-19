import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);   // token en mémoire — jamais dans localStorage
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(null);                   // ref pour l'accès synchrone (WebSocket, interceptors)

  // ── Persistance légère via sessionStorage ──────────────────────────────────
  // sessionStorage survit aux rechargements de page mais est effacé à la
  // fermeture de l'onglet — bien plus sûr que localStorage pour un JWT.
  useEffect(() => {
    const saved = sessionStorage.getItem('token');
    if (saved) {
      tokenRef.current = saved;
      setToken(saved);
      api.get('/auth/me')
        .then((r) => setUser(r.data))
        .catch(() => {
          sessionStorage.removeItem('token');
          setToken(null);
          tokenRef.current = null;
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ── Synchroniser la ref et l'interceptor axios à chaque changement ─────────
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const jwt = data.access_token;
    sessionStorage.setItem('token', jwt);
    tokenRef.current = jwt;
    setToken(jwt);
    const me = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    setUser(me.data);
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    tokenRef.current = null;
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, tokenRef, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
