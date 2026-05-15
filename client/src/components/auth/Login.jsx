import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const { error } = await login(email, password);
    setLoading(false);
    if (error) { addToast(error.message, 'error'); return; }
    addToast('Welcome back!', 'success');
    navigate('/home');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 bg-indigo-950 flex-col justify-between p-12">
        <Link to="/" className="font-bold text-xl text-white tracking-tight">
          Club<span className="text-indigo-400">Stack</span>
        </Link>
        <div className="space-y-4">
          <p className="text-3xl font-bold text-white leading-snug">
            "Run your club,<br />not your spreadsheets."
          </p>
          <p className="text-indigo-300 text-sm leading-relaxed max-w-sm">
            ClubStack brings your organization's announcements, events, forum, chat, and dues into one focused place.
          </p>
        </div>
        <p className="text-indigo-500 text-xs">© {new Date().getFullYear()} ClubStack</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-sm mx-auto space-y-7">
          <div className="space-y-1">
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              ← Back to home
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-4">Sign in</h1>
            <p className="text-sm text-slate-500">Enter your credentials to access your organizations.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-center text-slate-500">
            No account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
