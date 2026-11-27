import React, { useState } from 'react';
import { Lock, Mail, User, X, LogIn, UserPlus, Check } from 'lucide-react';
import { PlayerProgress } from '../types/game';

interface AuthModalProps {
  open: boolean;
  progress: PlayerProgress;
  onLogin: (emailOrUser: string) => void;
  onRegister: (emailOrUser: string) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  progress,
  onLogin,
  onRegister,
  onClose,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmed = identifier.trim();
    if (trimmed.length < 2) {
      setError('Please enter a valid email or username.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (tab === 'login') {
      onLogin(trimmed);
      setSuccessMsg(`Successfully signed in as ${trimmed}!`);
      setTimeout(() => {
        onClose();
      }, 850);
    } else {
      onRegister(trimmed);
      setSuccessMsg(`Account registered for ${trimmed}! Level 41 restored.`);
      setTimeout(() => {
        onClose();
      }, 850);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl theme-surface border p-6 shadow-2xl relative overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication window"
          className="absolute top-4 right-4 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl theme-surface-muted theme-ink cursor-pointer hover:opacity-90"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <img src="/logo.png" alt="RSS Liquid Flow" className="w-14 h-14 object-contain mx-auto mb-2 drop-shadow-sm" />
          <h2 id="auth-modal-title" className="font-display text-2xl font-bold theme-ink">
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-xs theme-ink-secondary mt-1">
            {tab === 'login'
              ? 'Enter your email or username to access your RSS Liquid Flow level progress.'
              : 'Register your account to securely sync your level journey across devices.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl theme-surface-muted mb-5">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`min-h-[40px] rounded-xl font-display text-xs font-bold transition-all cursor-pointer ${
              tab === 'login'
                ? 'theme-surface theme-ink shadow-xs'
                : 'theme-ink-secondary hover:opacity-100'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`min-h-[40px] rounded-xl font-display text-xs font-bold transition-all cursor-pointer ${
              tab === 'register'
                ? 'theme-surface theme-ink shadow-xs'
                : 'theme-ink-secondary hover:opacity-100'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-[#FFE7EC] dark:bg-[#3A1E33] border border-[#F3BCC8] dark:border-[#6A3256] text-[#B82843] dark:text-[#FF8AA1] text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-[#EEF7F1] dark:bg-[#133831] border border-[#BFE2CB] dark:border-[#246A60] text-[#247243] dark:text-[#5EEAD4] text-xs font-semibold text-center flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold theme-ink mb-1.5">Email or Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="riyazzamra@gmail.com"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl theme-surface-muted border theme-border text-sm font-semibold theme-ink focus:outline-2 focus:outline-[#E55A3C]"
              />
            </div>
            <p className="text-[11px] theme-ink-muted mt-1">
              Tip: Use <strong className="theme-ink">riyazzamra@gmail.com</strong> to load Level 41 progress.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold theme-ink mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl theme-surface-muted border theme-border text-sm font-semibold theme-ink focus:outline-2 focus:outline-[#E55A3C]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] rounded-2xl btn-tactile-coral text-white font-display text-base font-bold flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {tab === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Level 41</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Register &amp; Start</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t theme-border text-center text-xs theme-ink-secondary">
          Active Account: <strong className="theme-ink">{progress.playerName}</strong>
        </div>
      </div>
    </div>
  );
};
