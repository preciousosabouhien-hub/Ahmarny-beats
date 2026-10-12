import React from 'react';
import { ArrowRight, Headphones, ShieldCheck } from 'lucide-react';
import { Header } from '../components/Header';
import type { User } from '../types';

type LandingPageProps = { user: User | null; onLogin: () => void; onLogout: () => void };

/** Public-facing homepage with the main store call-to-action and licence overview. */
export function LandingPage({ user, onLogin, onLogout }: LandingPageProps) {
  const licenses = [
    { name: 'MP3 Lease', price: '₦15k', detail: 'For demos and emerging releases' },
    { name: 'WAV Lease', price: '₦25k', detail: 'For serious releases' },
    { name: 'Trackout', price: '₦50k', detail: 'For mixing and mastering' },
    { name: 'Exclusive', price: '₦150k', detail: 'For exclusive use' },
  ];

  return (
    <>
      <Header user={user} onLogin={onLogin} onLogout={onLogout} />
      <main>
        <section className="hero">
          <div className="heroCopy">
            <p className="eyebrow">THE AHMARNY SOUND</p>
            <h1>Beats that make<br /><em>records.</em></h1>
            <p className="lead">
              Premium instrumentals built for artists who want a sound that feels expensive from the first bar.
            </p>
            <div className="heroBtns">
              <a className="primary" href="/store">Explore beat store <ArrowRight size={18} /></a>
              <a className="secondary" href="#licenses">View licences</a>
            </div>
            <div className="proof">
              <span><strong>100+</strong> original beats</span>
              <span><strong>4</strong> flexible licences</span>
              <span><strong>24/7</strong> instant delivery</span>
            </div>
          </div>
          <div className="heroVisual">
            <div className="record"><div className="recordCenter">A</div></div>
            <div className="floatCard">
              <Headphones size={17} />
              <span><b>Studio ready</b><small>WAV • stems • MP3</small></span>
            </div>
          </div>
        </section>

        <section id="licenses" className="section dark">
          <div className="center">
            <p className="eyebrow">LICENSING</p>
            <h2>Choose the rights<br />your record needs.</h2>
            <p>Clear licensing, studio quality and instant delivery.</p>
          </div>
          <div className="licenseGrid">
            {licenses.map((license, index) => (
              <div className={index === 3 ? 'license featured' : 'license'} key={license.name}>
                <span>0{index + 1}</span>
                <h3>{license.name}</h3>
                <strong>{license.price}</strong>
                <p>{license.detail}</p>
                <a href="/store">Choose licence <ArrowRight size={15} /></a>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="about">
          <div><p className="eyebrow">WHY AHMARNY</p><h2>Less searching.<br />More creating.</h2></div>
          <div className="aboutText">
            <p>
              Ahmarny is a producer-first beat store built around one idea: the right instrumental should make you want to write immediately.
            </p>
            <div className="points">
              <span><ShieldCheck /> Clear licensing</span>
              <span><Headphones /> Studio quality</span>
              <span><ArrowRight /> Instant delivery</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
