import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';

const AuthSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { completeExternalLogin } = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const fragmentParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = fragmentParams.get('token') || params.get('token');
    if (!token) {
      setFailed(true);
      return;
    }

    window.history.replaceState(null, '', window.location.pathname);
    completeExternalLogin(token)
      .then((user) => navigate(user.role === 'Admin' ? '/admin' : '/profile', { replace: true }))
      .catch(() => setFailed(true));
  }, [completeExternalLogin, navigate, params]);

  if (failed) return <Navigate to="/auth" replace />;
  return <Loading label="Completing sign in..." />;
};

export default AuthSuccess;
