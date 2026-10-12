import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react';
import { api, CART_KEY } from '../lib/api';
import { Header } from '../components/Header';
import type { User } from '../types';

/** Paystack redirects here; only the server-side verification result decides payment status. */
export function PaymentCallbackPage({ user, onLogin, onLogout }: { user: User | null; onLogin: () => void; onLogout: () => void }) {
  const [status, setStatus] = useState<'checking' | 'PAID' | 'FAILED' | 'PENDING' | 'ERROR'>('checking');
  const [message, setMessage] = useState('Verifying your payment with Paystack…');

  useEffect(() => {
    const reference = new URLSearchParams(location.search).get('reference') || new URLSearchParams(location.search).get('trxref');
    if (!reference) { setStatus('ERROR'); setMessage('We could not find a payment reference in the return URL.'); return; }
    api(`/payments/paystack/verify?reference=${encodeURIComponent(reference)}`)
      .then((result) => {
        setStatus(result.status);
        if (result.status === 'PAID') {
          setMessage(`Payment confirmed. Your order reference is ${result.reference}.`);
          localStorage.removeItem(CART_KEY);
          // Also clear the account cart after the server has confirmed payment.
          return api('/cart', { method: 'PUT', body: JSON.stringify({ items: [] }) }).catch(() => undefined);
        }
        if (result.status === 'FAILED') setMessage('Paystack reported that this payment failed. Your order has not been marked as paid.');
        else setMessage('The payment is not confirmed yet. Please check your account or contact support before trying again.');
      })
      .catch((error) => { setStatus('ERROR'); setMessage(error instanceof Error ? error.message : 'Payment verification failed.'); });
  }, []);

  const Icon = status === 'PAID' ? CheckCircle2 : status === 'checking' ? LoaderCircle : CircleAlert;
  return <>
    <Header user={user} onLogin={onLogin} onLogout={onLogout} />
    <main className="paymentResult">
      <Icon size={42} />
      <p className="eyebrow">PAYMENT STATUS</p>
      <h1>{status === 'PAID' ? 'Payment successful.' : status === 'checking' ? 'Checking your payment…' : 'Payment not confirmed.'}</h1>
      <p>{message}</p>
      <a className="primary" href={status === 'PAID' ? '/account' : '/store'}>{status === 'PAID' ? 'Go to account' : 'Return to store'} <ArrowRight size={17} /></a>
    </main>
  </>;
}
