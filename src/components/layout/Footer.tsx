import React from 'react';

export function Footer() {
  return (
    <footer style={{padding: '3rem 2.5rem', textAlign: 'center', borderTop: '1.5px solid var(--border)'}}>
      <div className="nav-logo" style={{marginBottom: '.75rem'}}>Fara<span>sume</span></div>
      <p style={{color: 'var(--muted)', fontSize: '.85rem'}}>&copy; 2026 Farasume. Built to get you hired.</p>
    </footer>
  );
}
