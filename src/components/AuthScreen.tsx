import React, { useState } from 'react';
import { Eye, EyeOff, Gamepad2, LockKeyhole, Mail, UserRound } from 'lucide-react';
import {
  loginPlayer, registerPlayer, resendPlayerVerification, requestPlayerPasswordReset,
  verifyPlayerPasswordReset, resetPlayerPassword, savePlayerSession, RssPlayerSession,
} from '../utils/rssAuth';

type View = 'login' | 'register' | 'verify' | 'forgot' | 'reset';
interface Props {
  onAuthenticated: (session: RssPlayerSession) => void;
  onPlayAsGuest: () => void;
}

export const AuthScreen: React.FC<Props> = ({ onAuthenticated, onPlayAsGuest }) => {
  const [view, setView] = useState<View>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  };

  const submit = () => run(async () => {
    if (view === 'register') {
      if (password !== confirmPassword) throw new Error('Passwords do not match.');
      await registerPlayer({ display_name: name.trim(), email: email.trim(), password });
      setView('verify');
      setMessage('Registration received. Verify your email using the link sent by RSS Core, then sign in.');
    } else if (view === 'login') {
      const session = await loginPlayer({ email: email.trim(), password });
      savePlayerSession(session);
      onAuthenticated(session);
    } else if (view === 'forgot') {
      await requestPlayerPasswordReset(email.trim());
      setView('reset');
      setMessage('If an account exists, a six-digit reset code has been sent to your email.');
    } else if (view === 'reset') {
      const verified = await verifyPlayerPasswordReset(email.trim(), code.trim());
      await resetPlayerPassword(email.trim(), verified.reset_token, password);
      setView('login');
      setPassword('');
      setCode('');
      setMessage('Password changed. Sign in with your new password.');
    }
  });

  const title = view === 'register' ? 'Create your player account'
    : view === 'verify' ? 'Verify your email'
    : view === 'forgot' ? 'Reset your password'
    : view === 'reset' ? 'Enter reset code'
    : 'Welcome back';

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#090b2b]">
      <section className="w-full max-w-md rounded-[28px] bg-white shadow-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-white border p-2 shadow-sm">
            <img src="/logo.png" alt="RSS Liquid Flow" className="w-full h-full object-contain" />
          </div>
          <p className="mt-4 text-[11px] tracking-[.22em] font-extrabold text-sky-700">RAZEEN SMART SOLUTION</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">RSS LIQUID FLOW PRO · Player account</p>
        </div>

        {view !== 'verify' && (
          <form className="mt-7 space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            {view === 'register' && (
              <label className="block text-sm font-semibold text-slate-700">Full name
                <span className="mt-1 flex items-center gap-2 rounded-xl border px-3"><UserRound size={18}/><input required minLength={2} value={name} onChange={e=>setName(e.target.value)} className="w-full py-3 outline-none" placeholder="Your name"/></span>
              </label>
            )}
            <label className="block text-sm font-semibold text-slate-700">Email address
              <span className="mt-1 flex items-center gap-2 rounded-xl border px-3"><Mail size={18}/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full py-3 outline-none" placeholder="you@example.com"/></span>
            </label>
            {(view === 'login' || view === 'register' || view === 'reset') && (
              <label className="block text-sm font-semibold text-slate-700">{view === 'reset' ? 'New password' : 'Password'}
                <span className="mt-1 flex items-center gap-2 rounded-xl border px-3"><LockKeyhole size={18}/><input required minLength={8} type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full py-3 outline-none" placeholder="At least 8 characters"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label="Toggle password visibility">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span>
              </label>
            )}
            {view === 'register' && (
              <label className="block text-sm font-semibold text-slate-700">Confirm password
                <span className="mt-1 flex items-center gap-2 rounded-xl border px-3"><LockKeyhole size={18}/><input required minLength={8} type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full py-3 outline-none" placeholder="Re-enter password"/></span>
              </label>
            )}
            {view === 'reset' && (
              <label className="block text-sm font-semibold text-slate-700">Six-digit email code
                <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3 tracking-[.35em] text-center" placeholder="000000"/>
              </label>
            )}
            <button disabled={busy} className="w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold py-3.5 disabled:opacity-60">{busy?'Please wait…':view==='register'?'Create account':view==='reset'?'Reset password':'Continue'}</button>
          </form>
        )}

        {view === 'verify' && (
          <div className="mt-7 space-y-3 text-center">
            <p className="text-sm text-slate-600">Open the verification email from RSS Core and tap its secure verification link. Then return here to sign in.</p>
            <button disabled={busy || !email} onClick={()=>void run(async()=>{await resendPlayerVerification(email.trim());setMessage('If verification is still pending, a new email has been sent.');})} className="w-full rounded-xl bg-sky-600 text-white font-bold py-3 disabled:opacity-60">Resend verification email</button>
            <button onClick={()=>setView('login')} className="w-full rounded-xl border py-3 font-semibold text-slate-700">Back to login</button>
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}

        {view !== 'verify' && (
          <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-semibold text-sky-700">
            {view === 'login' && <><button onClick={()=>{setView('register');setMessage('');setError('');}}>Create account</button><button onClick={()=>{setView('forgot');setMessage('');setError('');}}>Forgot password?</button></>}
            {view !== 'login' && <button onClick={()=>{setView('login');setMessage('');setError('');}}>Back to login</button>}
          </div>
        )}
        <div className="mt-6 border-t pt-5 text-center">
          <button onClick={onPlayAsGuest} className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-500"><Gamepad2 size={17}/> Continue as guest</button>
          <p className="mt-2 text-[11px] text-slate-400">Guest progress stays on this device. RSS Core account sync will be added separately.</p>
        </div>
      </section>
    </main>
  );
};
