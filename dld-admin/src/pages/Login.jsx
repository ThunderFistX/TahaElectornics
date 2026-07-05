import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';
import { BRAND_NAME } from '../lib/catalog';

const Login = () => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [info, setInfo] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [supportForm, setSupportForm] = useState({ name: '', email: '', message: '' });
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [passwordResetForm, setPasswordResetForm] = useState({ password: '', confirmPassword: '' });
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, signup, forgotPassword, requestAdminRecoveryOtp, verifyAdminRecovery, changePassword, submitSupportRequest } = useAuth();
  const googleReason = searchParams.get('reason');
  const googleError = googleReason === 'google_oauth_not_configured'
    ? 'Google sign-in is not configured yet. Add the Google keys in backend/.env.'
    : googleReason
      ? 'Google sign-in could not be completed. Please try again.'
      : '';

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const user = mode === 'login'
        ? await login(form.email, form.password)
        : await signup(form);

      if (user?.forcePasswordReset) {
        setRequiresPasswordReset(true);
        setInfo('Please reset your password before continuing.');
        return;
      }

      navigate(user.role === 'Admin' ? '/admin' : '/profile');
    } catch (err) {
      if (err.payload?.locked && err.payload?.recoveryAvailable) {
        setRecoveryEmail(form.email);
        setRecoveryMode(true);
        setInfo('This account is temporarily locked. Verify your identity another way.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    if (!form.email) {
      setError('Enter your email address first.');
      return;
    }
    try {
      const data = await forgotPassword(form.email);
      setInfo(data.message || 'Password reset request created.');
    } catch (err) {
      setError(err.message || 'Could not request password reset');
    }
  };

  const handleAdminRecoveryRequest = async () => {
    setError('');
    setInfo('');
    const emailToUse = recoveryEmail || form.email;
    if (!emailToUse) {
      setError('Enter your admin email first.');
      return;
    }
    try {
      const data = await requestAdminRecoveryOtp(emailToUse);
      setInfo(data.message || 'Recovery code requested.');
    } catch (err) {
      setError(err.message || 'Unable to request a recovery code');
    }
  };

  const handleAdminRecoveryVerify = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const emailToUse = recoveryEmail || form.email;
    if (!emailToUse || !recoveryCode) {
      setError('Please enter your recovery code.');
      return;
    }
    try {
      const data = await verifyAdminRecovery(emailToUse, recoveryCode);
      if (data.user?.forcePasswordReset) {
        setRequiresPasswordReset(true);
        setInfo(data.message || 'Identity verified. Reset your password now.');
      } else {
        navigate(data.user.role === 'Admin' ? '/admin' : '/profile');
      }
    } catch (err) {
      setError(err.message || 'Identity verification failed');
    }
  };

  const handleRecoveryPasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (passwordResetForm.password !== passwordResetForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const data = await changePassword(passwordResetForm.password);
      setInfo(data.message || 'Password updated.');
      navigate(data.user.role === 'Admin' ? '/admin' : '/profile');
    } catch (err) {
      setError(err.message || 'Could not update password');
    }
  };

  const handleSupportRequest = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const data = await submitSupportRequest({
        name: supportForm.name,
        email: supportForm.email || form.email,
        message: supportForm.message
      });
      setInfo(data.message || 'Support request submitted.');
      setShowSupportForm(false);
      setSupportForm({ name: '', email: '', message: '' });
    } catch (err) {
      setError(err.message || 'Support request failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-card-hover w-full max-w-md border border-slate-100">
        <div className="text-center mb-6">
          <Link to="/" className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {BRAND_NAME}
          </Link>
          <p className="text-gray-500 mt-2 text-sm md:text-base">
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-md text-sm font-semibold transition ${mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`py-2 rounded-md text-sm font-semibold transition ${mode === 'signup' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
          >
            Signup
          </button>
        </div>

        {mode === 'login' && recoveryMode && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <p className="font-semibold">Account recovery</p>
            <p className="mt-1">Use the code sent to your registered contact details to regain access.</p>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={handleAdminRecoveryRequest}
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-700"
              >
                Send recovery code
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleAdminRecoveryVerify}
                className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
              >
                Verify and continue
              </button>
            </div>
          </div>
        )}

        {requiresPasswordReset && (
          <form onSubmit={handleRecoveryPasswordChange} className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-700">Reset your password to continue</p>
            <input
              type="password"
              value={passwordResetForm.password}
              onChange={(e) => setPasswordResetForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="New password"
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
            <input
              type="password"
              value={passwordResetForm.confirmPassword}
              onChange={(e) => setPasswordResetForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm password"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
            <button type="submit" className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
              Update password
            </button>
          </form>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <label className="block text-sm font-semibold text-dark mb-2">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary transition mb-4"
                required
              />

              <label className="block text-sm font-semibold text-dark mb-2">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary transition mb-4"
              />
            </>
          )}

          <label className="block text-sm font-semibold text-dark mb-2">Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary transition mb-4"
            required
          />

          <label className="block text-sm font-semibold text-dark mb-2">Password</label>
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="w-full px-4 py-2 pr-12 border-2 rounded-lg focus:outline-none focus:border-primary transition"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-500 hover:text-primary transition"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          {(error || googleError) && <p className="text-red-500 text-xs mb-4 text-center">{error || googleError}</p>}
          {info && <p className="text-emerald-600 text-xs mb-4 text-center">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-lg transition disabled:opacity-50 text-sm md:text-base"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="w-full text-sm font-semibold text-slate-500 hover:text-primary transition"
            >
              Forgot your password?
            </button>
            {recoveryMode ? (
              <button
                type="button"
                onClick={() => setRecoveryMode(false)}
                className="w-full text-sm font-semibold text-slate-500 hover:text-primary transition"
              >
                Return to sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRecoveryEmail(form.email);
                  setRecoveryMode(true);
                }}
                className="w-full text-sm font-semibold text-slate-500 hover:text-primary transition"
              >
                Verify identity another way
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSupportForm((visible) => !visible)}
              className="w-full text-sm font-semibold text-slate-500 hover:text-primary transition"
            >
              Need help? Contact support
            </button>
            {showSupportForm && (
              <form onSubmit={handleSupportRequest} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left">
                <input
                  type="text"
                  placeholder="Your name"
                  value={supportForm.name}
                  onChange={(e) => setSupportForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  required
                />
                <input
                  type="email"
                  placeholder="Your email"
                  value={supportForm.email}
                  onChange={(e) => setSupportForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  required
                />
                <textarea
                  value={supportForm.message}
                  onChange={(e) => setSupportForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell us what happened and how we can help"
                  className="mb-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  required
                />
                <button type="submit" className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
                  Submit support request
                </button>
              </form>
            )}
            <a
              href={`${API_URL}/auth/google`}
              className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:border-primary hover:text-primary hover:bg-indigo-50"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-black text-blue-600 shadow-sm">G</span>
              Sign in with Google
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
