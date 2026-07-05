import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('authToken') || localStorage.getItem('adminToken') || '');
  const [user, setUser] = useState(() => readJson('authUser') || readJson('adminUser'));

  const saveSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem('authToken', nextToken);
    localStorage.setItem('authUser', JSON.stringify(nextUser));
    if (nextUser.role === 'Admin') {
      localStorage.setItem('adminToken', nextToken);
      localStorage.setItem('adminUser', JSON.stringify(nextUser));
    } else {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
    }
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || data.errors?.[0]?.msg || 'Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    saveSession(data.token, data.user);
    return data.user;
  }, [request, saveSession]);

  const signup = useCallback(async ({ name, email, password, phone }) => {
    const data = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone })
    });
    saveSession(data.token, data.user);
    return data.user;
  }, [request, saveSession]);

  const forgotPassword = useCallback(async (email) => {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }, [request]);

  const resetPassword = useCallback(async (resetToken, password) => {
    return request(`/auth/reset-password/${resetToken}`, {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }, [request]);

  const changePassword = useCallback(async (password) => {
    const data = await request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    saveSession(data.token, data.user);
    return data.user;
  }, [request, saveSession]);

  const requestAdminOtp = useCallback(async (email) => {
    return request('/auth/admin-recovery/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }, [request]);

  const verifyAdminRecovery = useCallback(async (email, code) => {
    const data = await request('/auth/admin-recovery/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
    saveSession(data.token, data.user);
    return data.user;
  }, [request, saveSession]);

  const submitSupportRequest = useCallback(async ({ name, email, message }) => {
    return request('/auth/support-request', {
      method: 'POST',
      body: JSON.stringify({ name, email, message })
    });
  }, [request]);

  const completeExternalLogin = useCallback(async (nextToken) => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${nextToken}` }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Could not complete Google sign-in');
    }
    saveSession(nextToken, data.user);
    return data.user;
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setToken('');
    setUser(null);
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
    localStorage.setItem('authUser', JSON.stringify(nextUser));
    if (nextUser?.role === 'Admin') {
      localStorage.setItem('adminUser', JSON.stringify(nextUser));
    }
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    isLoggedIn: Boolean(token && user),
    isAdmin: user?.role === 'Admin',
    login,
    signup,
    forgotPassword,
    resetPassword,
    changePassword,
    requestAdminOtp,
    verifyAdminRecovery,
    submitSupportRequest,
    completeExternalLogin,
    logout,
    updateUser,
    request
  }), [token, user, login, signup, forgotPassword, resetPassword, changePassword, requestAdminOtp, verifyAdminRecovery, submitSupportRequest, completeExternalLogin, logout, updateUser, request]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
