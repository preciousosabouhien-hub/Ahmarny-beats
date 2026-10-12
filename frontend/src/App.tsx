import React, { useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { api, CART_KEY, token } from './lib/api';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LandingPage } from './pages/LandingPage';
import { PaymentCallbackPage } from './pages/PaymentCallbackPage';
import { StorePage } from './pages/StorePage';
import type { User } from './types';

/** Top-level route switch. Keeping navigation here makes each page independently maintainable. */
export default function App() {
  const [path, setPath] = useState(location.pathname);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => setPath(location.pathname);
    window.addEventListener('popstate', onPopState);
    const jwt = token();
    if (jwt) api('/auth/me').then((result) => setUser(result.user)).catch(() => localStorage.removeItem('ahmarny_token'));
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Intercept same-origin app links for lightweight navigation without a router dependency.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a[href^="/"]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = anchor.getAttribute('href')!;
      if (href.startsWith('/#')) return;
      event.preventDefault();
      history.pushState({}, '', href);
      setPath(location.pathname);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  function logout() {
    localStorage.removeItem('ahmarny_token');
    setUser(null);
    history.pushState({}, '', '/');
    setPath('/');
  }

  const pageProps = { user, onLogin: () => setAuthOpen(true), onLogout: logout };
  let page: React.ReactNode;
  if (path === '/store') page = <StorePage {...pageProps} />;
  else if (path === '/checkout') page = <CheckoutPage {...pageProps} />;
  else if (path === '/payment/callback') page = <PaymentCallbackPage {...pageProps} />;
  else if (path === '/account') page = user ? <AccountPage user={user} onLogout={logout} /> : <LandingPage {...pageProps} />;
  else if (path === '/admin') page = user?.role === 'ADMIN' ? <AdminPage user={user} onLogout={logout} /> : <LandingPage {...pageProps} />;
  else page = <LandingPage {...pageProps} />;

  return <>
    {page}
    {authOpen && <AuthModal mode="login" onClose={() => setAuthOpen(false)} onSuccess={async (authenticatedUser) => {
      setUser(authenticatedUser);
      setAuthOpen(false);

      // Merge a guest cart into the newly signed-in account before opening checkout.
      const nextPath = sessionStorage.getItem('ahmarny_after_login');
      if (nextPath === '/checkout') {
        try {
          const guestItems = JSON.parse(localStorage.getItem(CART_KEY) || '[]') as Array<{ beat: { id: string }; license: { id: string } }>;
          const savedItems = await api('/cart') as Array<{ beat: { id: string }; license: { id: string } }>;
          const merged = [...savedItems];
          for (const item of guestItems) {
            if (!merged.some((saved) => saved.license.id === item.license.id)) merged.push(item);
          }
          await api('/cart', {
            method: 'PUT',
            body: JSON.stringify({ items: merged.map((item) => ({ beatId: item.beat.id, licenseId: item.license.id })) }),
          });
          localStorage.removeItem(CART_KEY);
        } catch {
          // Keep the cart available locally if syncing fails; the checkout page will show the API error.
        }
        sessionStorage.removeItem('ahmarny_after_login');
        history.pushState({}, '', '/checkout');
        setPath('/checkout');
      }
    }} />}
  </>;
}
