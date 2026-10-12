import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import type { User } from '../types';

type AuthModalProps = {
  mode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: User) => void;
};

/** Login and registration share one form to keep account handling consistent. */
export function AuthModal({ mode, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api(`/auth/${isLogin ? 'login' : 'register'}`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      // The token is required for all customer-owned API routes, including the cart.
      localStorage.setItem('ahmarny_token', result.token);
      onSuccess(result.user);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not authenticate. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="close" type="button" aria-label="Close sign-in dialog" onClick={onClose}>×</button>
        <p className="eyebrow">{isLogin ? 'WELCOME BACK' : 'JOIN AHMARNY'}</p>
        <h2 id="auth-title">{isLogin ? 'Sign in to your account.' : 'Create your account.'}</h2>

        {error && <div className="error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          {!isLogin && (
            <input
              placeholder="Full name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              minLength={2}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password (8+ characters)"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            minLength={8}
            required
          />
          <button className="checkout" disabled={busy}>
            {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>
        <button className="switch" type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
          {isLogin ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
