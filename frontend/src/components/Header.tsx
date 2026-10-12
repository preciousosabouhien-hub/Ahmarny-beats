import React, { useState } from 'react';
import {
  LayoutDashboard, LogIn, LogOut, Menu, Music2, ShoppingBag, UserRound, X,
} from 'lucide-react';
import type { User } from '../types';

type HeaderProps = {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
};

/** Shared navigation used by all public and account pages. */
export function Header({ user, onLogin, onLogout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header>
      <a className="logo" href="/" aria-label="Ahmarny home">
        <span className="logoMark"><Music2 size={19} /></span>
        AHMARNY
      </a>

      <nav className={menuOpen ? 'open' : ''}>
        <a href="/">Home</a>
        <a href="/store">Beat Store</a>
        <a href="/#licenses">Licensing</a>
        <a href="/#about">About</a>

        {user ? (
          <>
            <a href={user.role === 'ADMIN' ? '/admin' : '/account'}>
              {user.role === 'ADMIN'
                ? <><LayoutDashboard size={15} /> Dashboard</>
                : <><UserRound size={15} /> Account</>}
            </a>
            <button className="navBtn" onClick={onLogout}>
              <LogOut size={15} /> Logout
            </button>
          </>
        ) : (
          <button className="navBtn" onClick={onLogin}>
            <LogIn size={15} /> Login
          </button>
        )}
      </nav>

      <div className="headerActions">
        <a href="/store" aria-label="Open beat store"><ShoppingBag size={19} /></a>
        <button
          className="hamb"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
