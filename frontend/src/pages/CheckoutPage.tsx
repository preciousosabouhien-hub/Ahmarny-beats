import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import { Header } from '../components/Header';
import { api, CART_KEY } from '../lib/api';
import { money } from '../lib/format';
import type { CartItem, User } from '../types';

/** Checkout creates an order from server-validated beat/licence IDs, then opens Paystack. */
export function CheckoutPage({ user, onLogin, onLogout }: { user: User | null; onLogin: () => void; onLogout: () => void }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) { setName(user.name); setEmail(user.email); } }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        try { setCart(JSON.parse(localStorage.getItem(CART_KEY) || '[]')); } catch { setCart([]); }
        return;
      }
      try {
        const items = await api('/cart');
        if (!cancelled) setCart(items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your cart.');
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const total = cart.reduce((sum, item) => sum + item.license.priceKobo, 0);

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!user) { setError('Please sign in to your customer account before checkout.'); onLogin(); return; }
    if (!cart.length) { setError('Your cart is empty. Return to the store and add a beat first.'); return; }
    setBusy(true);
    try {
      // The API calculates the amount from current database prices; this page never sends a total.
      const order = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          customerName: name.trim(),
          items: cart.map((item) => ({ beatId: item.beat.id, licenseId: item.license.id })),
        }),
      });
      const payment = await api('/payments/paystack/initialize', {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id }),
      });
      if (!payment.authorization_url) throw new Error('Paystack did not return a checkout URL.');
      window.location.assign(payment.authorization_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
      setBusy(false);
    }
  }

  return <>
    <Header user={user} onLogin={onLogin} onLogout={onLogout} />
    <main className="checkoutPage">
      <a className="backLink" href="/store"><ArrowLeft size={16} /> Back to beat store</a>
      <p className="eyebrow">SECURE CHECKOUT</p>
      <h1>Finish your order.</h1>
      <p className="checkoutIntro">Review your licences and continue to Paystack to pay securely.</p>
      {!user && <div className="error">You need to sign in to your Ahmarny account before completing checkout. <button type="button" className="textButton" onClick={onLogin}>Sign in / create account</button></div>}
      {error && <div className="error" role="alert">{error}</div>}
      <div className="checkoutLayout">
        <section className="checkoutPanel">
          <h2>Customer details</h2>
          <form onSubmit={pay}>
            <label htmlFor="checkout-name">Full name</label>
            <input id="checkout-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} required disabled={!user} />
            <label htmlFor="checkout-email">Email address</label>
            <input id="checkout-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={!user} />
            <button className="checkout" disabled={busy || !user || !cart.length}>
              {busy ? 'Connecting to Paystack…' : <>Continue to Paystack <ArrowRight size={17} /></>}
            </button>
            <p className="secureNote"><LockKeyhole size={14} /> Payment is processed on Paystack. Your card details are not stored by Ahmarny.</p>
          </form>
        </section>
        <section className="checkoutPanel orderSummary">
          <h2>Your order</h2>
          {!cart.length ? <p className="empty">Your cart is empty. <a href="/store">Browse beats</a></p> : cart.map((item) =>
            <div className="summaryLine" key={item.license.id}>
              <div><strong>{item.beat.title}</strong><small>{item.license.name}</small></div><strong>{money(item.license.priceKobo)}</strong>
            </div>
          )}
          <div className="total"><span>Total</span><strong>{money(total)}</strong></div>
        </section>
      </div>
    </main>
  </>;
}
