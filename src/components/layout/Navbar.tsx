import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/lib/auth';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Navbar() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Features', id: 'features' },
    { label: 'Templates', id: 'templates' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'FAQ', id: 'faq' }
  ];

  const handleScroll = (id: string) => {
    setIsMobileMenuOpen(false);
    if (window.location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  return (
    <nav id="mainNav">
      <Link to="/" className="nav-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
        Fara<span style={{ color: 'var(--accent)' }}>sume</span>
      </Link>

      {/* Desktop Links */}
      <div className="nav-links desktop-only">
        {navItems.map(item => (
          <button key={item.id} onClick={() => handleScroll(item.id)} className="nav-link">
            {item.label}
          </button>
        ))}
      </div>

      <div className="nav-actions desktop-only">
        {!user ? (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => login()} className="btn-secondary" style={{ padding: '.6rem 1.25rem', fontSize: '.875rem' }}>Sign in</button>
            <button onClick={() => login()} className="btn-primary" style={{ padding: '.6rem 1.25rem', fontSize: '.875rem' }}>Get started</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span className="user-name-display">{user.name || user.email?.split('@')[0]}</span>
            <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', padding: '.6rem 1.25rem', fontSize: '.875rem' }}>Dashboard</Link>
            <button onClick={() => { logout(); navigate('/'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.875rem', color: 'var(--muted)' }}>Sign out</button>
          </div>
        )}
      </div>

      {/* Mobile Toggle */}
      <button 
        className="mobile-toggle" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mobile-menu-overlay"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="mobile-menu"
            >
              <div className="mobile-menu-content">
                <div className="mobile-nav-links">
                  {navItems.map(item => (
                    <button key={item.id} onClick={() => handleScroll(item.id)} className="mobile-nav-link">
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mobile-auth-actions">
                  {!user ? (
                    <>
                      <button onClick={() => { setIsMobileMenuOpen(false); login(); }} className="btn-primary w-full">Get Started</button>
                      <button onClick={() => { setIsMobileMenuOpen(false); login(); }} className="btn-secondary w-full">Sign In</button>
                    </>
                  ) : (
                    <>
                      <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="btn-primary w-full text-center no-underline">Go to Dashboard</Link>
                      <button onClick={() => { setIsMobileMenuOpen(false); logout(); navigate('/'); }} className="btn-secondary w-full">Sign Out</button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
