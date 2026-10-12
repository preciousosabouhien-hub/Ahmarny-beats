import React from 'react';
import { ArrowRight, UserRound } from 'lucide-react';
import { Header } from '../components/Header';
import type { User } from '../types';

/** Basic customer account screen. It is the natural home for order history later. */
export function AccountPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <>
      <Header user={user} onLogin={() => undefined} onLogout={onLogout} />
      <main className="accountPage">
        <p className="eyebrow">MY AHMARNY</p>
        <h1>Welcome, {user.name}.</h1>
        <div className="accountCard">
          <UserRound />
          <div>
            <h3>{user.email}</h3>
            <p>Your customer account is connected to the Ahmarny API. Your purchases and licences can be linked to this account.</p>
          </div>
        </div>
        <a className="primary" href="/store">Browse beats <ArrowRight size={18} /></a>
      </main>
    </>
  );
}
