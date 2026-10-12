import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Header } from '../components/Header';
import { BeatCard } from '../components/BeatCard';
import { api, CART_KEY, token } from '../lib/api';
import { money } from '../lib/format';
import type { Beat, CartItem, License, User } from '../types';

const demo: Beat[] = [
  { id: 'demo-1', title: 'After Hours', slug: 'after-hours', genre: 'Afrobeats', mood: 'Late Night', bpm: 104, musicalKey: 'F# Min', description: 'Dark, melodic Afrobeats with warm percussion and space for a memorable hook.', coverUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80', licenses: [{ id: 'demo-1a', type: 'MP3_LEASE', name: 'MP3 Lease', priceKobo: 1500000 }, { id: 'demo-1b', type: 'WAV_LEASE', name: 'WAV Lease', priceKobo: 2500000 }] },
  { id: 'demo-2', title: 'Lagos Nights', slug: 'lagos-nights', genre: 'Afro R&B', mood: 'Smooth', bpm: 96, musicalKey: 'A Min', description: 'Smooth late-night Afro R&B with lush chords and a clean pocket.', coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80', licenses: [{ id: 'demo-2a', type: 'MP3_LEASE', name: 'MP3 Lease', priceKobo: 1500000 }, { id: 'demo-2b', type: 'WAV_LEASE', name: 'WAV Lease', priceKobo: 2500000 }] },
];

function readGuestCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') as CartItem[]; }
  catch { return []; }
}

/** Store catalogue, filters, and cart. Signed-in carts are backed by PostgreSQL through /api/cart. */
export function StorePage({ user, onLogin, onLogout }: { user: User | null; onLogin: () => void; onLogout: () => void }) {
  const [beats, setBeats] = useState<Beat[]>(demo);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const [cart, setCart] = useState<CartItem[]>(readGuestCart);
  const [message, setMessage] = useState('');
  const [cartReady, setCartReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { api('/beats').then((items) => { if (items.length) setBeats(items); }).catch(() => setMessage('Could not load the live catalogue; showing sample beats.')); }, []);

  // On login, load the account cart and merge any guest cart instead of losing it.
  useEffect(() => {
    let cancelled = false;
    async function loadCart() {
      setCartReady(false);
      if (!user || !token()) {
        if (!cancelled) { setCart(readGuestCart()); setCartReady(true); }
        return;
      }
      try {
        const remote: CartItem[] = await api('/cart');
        const guest = readGuestCart();
        const merged = [...remote];
        for (const item of guest) {
          if (!merged.some((saved) => saved.license.id === item.license.id)) merged.push(item);
        }
        if (guest.length) await api('/cart', { method: 'PUT', body: JSON.stringify({ items: merged.map((item) => ({ beatId: item.beat.id, licenseId: item.license.id })) }) });
        if (!cancelled) setCart(merged);
        localStorage.removeItem(CART_KEY);
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Could not load your saved cart.');
        if (!cancelled) setCart(readGuestCart());
      } finally { if (!cancelled) setCartReady(true); }
    }
    void loadCart();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Keep guest carts local; sync signed-in customers' cart rows to the API.
  useEffect(() => {
    if (!cartReady) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    if (!user || !token()) return;
    const timer = window.setTimeout(async () => {
      setSyncing(true);
      try {
        await api('/cart', { method: 'PUT', body: JSON.stringify({ items: cart.map((item) => ({ beatId: item.beat.id, licenseId: item.license.id })) }) });
        localStorage.removeItem(CART_KEY);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Cart sync failed.');
      } finally { setSyncing(false); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [cart, cartReady, user?.id]);

  const genres = ['All', ...Array.from(new Set(beats.map((beat) => beat.genre)))];
  const filtered = useMemo(() => beats.filter((beat) =>
    (genre === 'All' || beat.genre === genre) &&
    (!query || `${beat.title} ${beat.genre} ${beat.mood || ''}`.toLowerCase().includes(query.toLowerCase())),
  ), [beats, genre, query]);
  const total = cart.reduce((sum, item) => sum + item.license.priceKobo, 0);

  function add(beat: Beat, license: License) {
    if (cart.some((item) => item.license.id === license.id)) {
      setMessage('That licence is already in your cart.');
      return;
    }
    setCart((current) => [...current, { beat, license }]);
    setMessage(`${beat.title} added to cart.`);
  }
  function remove(licenseId: string) { setCart((current) => current.filter((item) => item.license.id !== licenseId)); }

  return <>
    <Header user={user} onLogin={onLogin} onLogout={onLogout} />
    <main>
      <section className="storeHero">
        <p className="eyebrow">AHMARNY BEAT STORE</p>
        <h1>Find the beat<br /><em>for your record.</em></h1>
        <p>Browse, preview and license original instrumentals. {user ? 'Your account cart syncs across devices.' : 'Sign in to keep your cart across devices.'}</p>
      </section>
      <section className="section">
        <div className="sectionHead"><div><p className="eyebrow">THE CATALOG</p><h2>{beats.length} beats available.</h2></div>
          <div className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search beats..." /></div>
        </div>
        <div className="filters">{genres.map((item) => <button key={item} className={genre === item ? 'active' : ''} onClick={() => setGenre(item)}>{item}</button>)}</div>
        <div className="grid">{filtered.map((beat) => <BeatCard key={beat.id} b={beat} onAdd={add} />)}</div>
      </section>
      <section className="cart">
        <div><p className="eyebrow">YOUR CART {syncing ? '· Syncing…' : ''}</p><h2>{cart.length ? 'Ready to checkout?' : 'Your cart is waiting.'}</h2></div>
        {cart.length ? <div className="cartBox">
          {cart.map((item) => <div className="cartLine" key={item.license.id}>
            <span><b>{item.beat.title}</b><small>{item.license.name}</small></span><strong>{money(item.license.priceKobo)}</strong>
            <button aria-label={`Remove ${item.beat.title}`} onClick={() => remove(item.license.id)}>×</button>
          </div>)}
          <div className="total"><span>Total</span><strong>{money(total)}</strong></div>
          <button className="checkout" onClick={() => {
            if (!user) { sessionStorage.setItem('ahmarny_after_login', '/checkout'); setMessage('Sign in or create an account to continue to secure checkout.'); onLogin(); return; }
            location.href = '/checkout';
          }}>Continue to secure checkout <ArrowRight /></button>
        </div> : <p className="empty">Select a licence and add a beat to your cart.</p>}
      </section>
    </main>
    {message && <div className="toast" role="status">{message}<button onClick={() => setMessage('')}>×</button></div>}
  </>;
}
