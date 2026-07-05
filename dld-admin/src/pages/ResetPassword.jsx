import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRAND_NAME } from '../lib/catalog';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { validateResetToken, resetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError('Invalid reset link.');
        return;
      }
      try {
        await validateResetToken(token);
        setReady(true);
      } catch (err) {
        setError(err.message || 'Invalid or expired reset link.');
      }
    };

    verify();
  }, [token, validateResetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await resetPassword(token, password);
      setMessage(data.message || 'Password reset successful.');
      setTimeout(() => navigate('/auth'), 1000);
    } catch (err) {
      setError(err.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-100 bg-white p-6 shadow-card-hover">
        <div className="text-center mb-6">
          <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {BRAND_NAME}
          </Link>
          <p className="mt-2 text-sm text-slate-500">Set a new password for your account</p>
        </div>

        {error && <p className="mb-4 text-center text-sm text-red-500">{error}</p>}
        {message && <p className="mb-4 text-center text-sm text-emerald-600">{message}</p>}

        {ready ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
              {loading ? 'Please wait...' : 'Update password'}
            </button>
          </form>
        ) : (
          <p className="text-center text-sm text-slate-500">Checking reset link…</p>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
