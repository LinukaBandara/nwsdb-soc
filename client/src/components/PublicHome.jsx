import React, { useState } from 'react';

const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

const WaterMark = () => (
  <div className="public-water-mark" aria-hidden="true">
    <svg viewBox="0 0 24 24">
      <path d="M12 2.5S5.5 10 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10 12 2.5 12 2.5Z" />
      <path d="M8.5 15.1c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5" />
    </svg>
  </div>
);

export default function PublicHome({ onLogin, onRegister }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (fn) => {
    setMobileOpen(false);
    fn();
  };

  return (
    <main className="public-site">
      <header className="public-header">
        <a className="public-brand" href="#top" aria-label="NWSDB home">
          <span className="public-brand-mark"><WaterMark /></span>
          <span>
            <strong>National Water Supply</strong>
            <small>& Drainage Board · Sri Lanka</small>
          </span>
        </a>

        <nav className={mobileOpen ? 'public-nav is-open' : 'public-nav'} aria-label="Main navigation">
          <a href="#services" onClick={() => setMobileOpen(false)}>Services</a>
          <a href="#how-it-works" onClick={() => setMobileOpen(false)}>How it works</a>
          <a href="#help" onClick={() => setMobileOpen(false)}>Help</a>
          <button className="public-nav-login" onClick={() => go(onLogin)}>Sign in</button>
          <button className="public-nav-register" onClick={() => go(onRegister)}>Create account <Arrow /></button>
        </nav>

        <button className="public-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">
          <span /><span /><span />
        </button>
      </header>

      <section className="public-hero" id="top">
        <div className="public-hero-grid">
          <div className="public-hero-copy">
            <div className="public-live-pill">
              <span className="public-live-dot" />
              Digital customer services · Available online
            </div>
            <p className="public-overline">Your water account, in one place</p>
            <h1>Manage your <em>water service</em> with confidence.</h1>
            <p className="public-hero-lead">
              View consumption, understand your estimated bill, settle payments securely,
              and keep your NWSDB account information close at hand.
            </p>
            <div className="public-hero-actions">
              <button className="public-primary" onClick={onRegister}>Create customer account <Arrow /></button>
              <button className="public-secondary" onClick={onLogin}>Sign in to your account</button>
            </div>
            <div className="public-trust-row">
              <span><b>01</b> Secure authentication</span>
              <span><b>02</b> Account-based access</span>
              <span><b>03</b> Digital payments</span>
            </div>
          </div>

          <div className="public-hero-visual" aria-label="Water service account overview preview">
            <div className="public-orbit orbit-one" />
            <div className="public-orbit orbit-two" />
            <div className="public-water-card">
              <div className="public-card-top">
                <span className="public-mini-brand"><WaterMark /></span>
                <span className="public-card-status"><i /> Service active</span>
              </div>
              <div className="public-card-label">Your water account</div>
              <div className="public-card-number">NWSDB-0001</div>
              <div className="public-card-divider" />
              <div className="public-card-stats">
                <div><span>Consumption</span><strong>18.4 <small>m³</small></strong></div>
                <div><span>Estimated bill</span><strong>Rs. 1,240</strong></div>
              </div>
              <div className="public-card-chart">
                <span style={{height:'38%'}} /><span style={{height:'56%'}} /><span style={{height:'44%'}} />
                <span style={{height:'68%'}} /><span style={{height:'52%'}} /><span style={{height:'82%'}} />
                <span style={{height:'61%'}} /><span style={{height:'74%'}} /><span style={{height:'91%'}} />
                <div className="public-chart-line" />
              </div>
              <div className="public-card-footer"><span>Latest verified reading</span><strong>24 Sep 2026</strong></div>
            </div>
            <div className="public-float-card public-float-payment">
              <span className="public-float-icon">✓</span>
              <span><small>Payment status</small><strong>Completed</strong></span>
            </div>
            <div className="public-float-card public-float-secure">
              <span className="public-shield">⌁</span>
              <span><small>Protected session</small><strong>JWT secured</strong></span>
            </div>
          </div>
        </div>
        <div className="public-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 90" preserveAspectRatio="none"><path d="M0 48C220 100 390 0 620 34c230 34 360 58 820-8v64H0Z" /></svg>
        </div>
      </section>

      <section className="public-section public-services" id="services">
        <div className="public-section-heading">
          <div><p className="public-overline">One connected portal</p><h2>Everything you need to manage your account.</h2></div>
          <p>Designed around the everyday tasks that matter to a water service customer.</p>
        </div>
        <div className="public-service-grid">
          <article><span className="public-service-number">01</span><div className="public-service-icon">◒</div><h3>Track consumption</h3><p>Review your latest meter reading, usage history and estimated billing information from your account.</p><a href="#how-it-works">Learn more <Arrow /></a></article>
          <article><span className="public-service-number">02</span><div className="public-service-icon">↗</div><h3>Pay your bill</h3><p>Submit a digital payment and keep a searchable record of your transactions and electronic receipts.</p><a href="#how-it-works">Learn more <Arrow /></a></article>
          <article><span className="public-service-number">03</span><div className="public-service-icon">✓</div><h3>Stay in control</h3><p>Access your account through authenticated, role-aware services built around secure API communication.</p><a href="#how-it-works">Learn more <Arrow /></a></article>
        </div>
      </section>

      <section className="public-process" id="how-it-works">
        <div className="public-process-inner">
          <div className="public-process-copy">
            <p className="public-overline">Simple from the start</p>
            <h2>From connection to control in three steps.</h2>
            <p>Create your customer access, verify your account, then use the portal to monitor usage and manage payments.</p>
            <button className="public-primary" onClick={onRegister}>Get started <Arrow /></button>
          </div>
          <div className="public-steps">
            <div><b>01</b><span><strong>Create access</strong><small>Register with your name, email and NWSDB account number.</small></span></div>
            <div><b>02</b><span><strong>Sign in securely</strong><small>Your role and account access are verified by the Identity Service.</small></span></div>
            <div><b>03</b><span><strong>Manage your service</strong><small>View usage, make payments and review your account records.</small></span></div>
          </div>
        </div>
      </section>

      <section className="public-help" id="help">
        <div className="public-help-box">
          <div><span className="public-help-icon">?</span><div><p className="public-overline">Need assistance?</p><h2>Ready to access your water account?</h2><p>Sign in if you already have access, or create a customer account to begin.</p></div></div>
          <div className="public-help-actions"><button className="public-secondary" onClick={onLogin}>Sign in</button><button className="public-primary" onClick={onRegister}>Create account <Arrow /></button></div>
        </div>
      </section>

      <footer className="public-footer">
        <div className="public-footer-brand"><span className="public-brand-mark"><WaterMark /></span><div><strong>National Water Supply & Drainage Board</strong><small>Sri Lanka · Digital Customer Services</small></div></div>
        <div className="public-footer-links"><a href="#services">Services</a><a href="#how-it-works">How it works</a><a href="#help">Help</a><button onClick={onLogin}>Sign in</button></div>
        <div className="public-footer-bottom"><span>© 2026 National Water Supply & Drainage Board. All rights reserved.</span><span>Secure digital service portal</span></div>
      </footer>
    </main>
  );
}
