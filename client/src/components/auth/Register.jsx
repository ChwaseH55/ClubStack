import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const FEATURE_BULLETS = [
  'Set up your org in under two minutes',
  'Invite members with a single link',
  'Enable only the features you need',
  'Custom branding at no extra cost',
];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const { error } = await register(email, password, name);
    setLoading(false);
    if (error) { addToast(error.message, 'error'); return; }
    addToast('Account created! Check your email to confirm before signing in.', 'success', 6000);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-5/12 bg-indigo-950 flex-col justify-between p-10 xl:p-16 2xl:p-24">
        <Link to="/" className="font-bold text-xl xl:text-2xl text-white tracking-tight">
          Club<span className="text-indigo-400">Stack</span>
        </Link>
        <div className="space-y-8 xl:space-y-10">
          <div className="space-y-4">
            <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-white leading-snug">
              Your club deserves<br />better tooling.
            </h2>
            <p className="text-indigo-300 leading-relaxed xl:text-lg">
              Create your free account and have your organization up and running in minutes.
            </p>
          </div>
          <ul className="space-y-3 xl:space-y-4">
            {FEATURE_BULLETS.map(b => (
              <li key={b} className="flex items-start gap-3 text-sm xl:text-base text-indigo-200">
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-indigo-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-indigo-600 text-xs xl:text-sm">© {new Date().getFullYear()} ClubStack</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 xl:px-20 2xl:px-32 bg-white">
        <div className="w-full max-w-sm xl:max-w-md mx-auto space-y-7 xl:space-y-8">
          <div className="space-y-2">
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              ← Back to home
            </Link>
            <h1 className="text-2xl xl:text-3xl font-bold text-slate-900 mt-3">Create account</h1>
            <p className="text-sm xl:text-base text-slate-500">Free to start. No credit card required.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 xl:space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm xl:text-base font-medium text-slate-700">Your name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Smith" className="input xl:py-3" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm xl:text-base font-medium text-slate-700">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="input xl:py-3" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm xl:text-base font-medium text-slate-700">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="input xl:py-3" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 xl:py-3 xl:text-base mt-1">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-sm xl:text-base text-center text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
