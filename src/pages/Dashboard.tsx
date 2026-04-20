import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/lib/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '@/src/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';

interface SavedResume {
  id: string;
  title: string;
  markdown: string;
  date: string;
}

export function Dashboard() {
  const { user, upgradeToPremium, logout } = useAuth();
  const navigate = useNavigate();
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'resumes' | 'settings'>('resumes');

  // Settings states
  const [newName, setNewName] = useState(user?.name || '');
  const [updatingName, setUpdatingName] = useState(false);

  useEffect(() => {
    if (user) setNewName(user.name);
  }, [user]);

  useEffect(() => {
    if (searchParams.get('success') === 'true' && user && user.tier !== 'premium') {
      const upgradeOptimistically = async () => {
        try {
          await upgradeToPremium();
          setSearchParams({});
        } catch (e) {
          console.error("Failed to optimistically upgrade:", e);
        }
      };
      // Give Auth context a second to settle
      setTimeout(upgradeOptimistically, 500);
    }
  }, [searchParams, user, upgradeToPremium, setSearchParams]);

  useEffect(() => {
    async function fetchResumes() {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'resumes'),
          where('userId', '==', user.id)
        );
        const querySnapshot = await getDocs(q);
        const loaded: SavedResume[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          loaded.push({
            id: doc.id,
            title: data.title,
            markdown: data.markdown,
            date: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
          });
        });
        loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSavedResumes(loaded);
      } catch (error) {
        console.error("Error fetching resumes:", error);
      } finally {
        setLoadingResumes(false);
      }
    }

    if (user) {
      fetchResumes();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-16">
        <h2 style={{fontFamily: 'Syne', fontSize: '2rem', fontWeight: 800, marginBottom: '1rem'}}>Sign in required</h2>
        <p style={{color: 'var(--muted)', marginBottom: '2rem'}}>You must be logged in to view your dashboard.</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Return Home</button>
      </div>
    );
  }

  const handleStart = (id: string, isCustom = false) => {
    console.log(`Navigating to builder with id: ${id}, custom: ${isCustom}`);
    navigate(`/build/${id}?custom=${isCustom}`);
  };

  const handleOpenSaved = (id: string) => {
    console.log(`Opening saved resume with id: ${id}`);
    navigate(`/build/${id}?saved=true`);
  };

  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const deleteSaved = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Immediate feedback with loading state
    setDeleteLoading(id);
    console.log(`Executing immediate delete for resume: ${id}`);
    
    try {
      await deleteDoc(doc(db, 'resumes', id));
      setSavedResumes(prev => prev.filter(r => r.id !== id));
      setToast("Resume deleted successfully");
      setConfirmDeleteId(null);
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Critical: Firestore Delete Failed", error);
      const msg = error instanceof Error ? error.message : "Possible Permission Denied";
      setToast(`Delete failed: ${msg}`);
      setTimeout(() => setToast(null), 5000);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === user.name) return;
    setUpdatingName(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name: newName,
        updatedAt: serverTimestamp()
      });
      setToast("Name updated successfully");
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error updating name:", error);
      setToast("Failed to update name");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setUpdatingName(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("ARE YOU SURE? This will PERMANENTLY delete your account and all saved resumes. This action cannot be undone.")) {
      try {
        // 1. Delete all user resumes
        const q = query(collection(db, 'resumes'), where('userId', '==', user.id));
        const snapshots = await getDocs(q);
        const deletes = snapshots.docs.map(d => deleteDoc(doc(db, 'resumes', d.id)));
        await Promise.all(deletes);
        
        // 2. Delete user doc
        await deleteDoc(doc(db, 'users', user.id));
        
        // 3. Sign out & Redirect
        await logout();
        navigate('/');
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("Failed to delete account. You might need to re-authenticate first.");
      }
    }
  };

  const prebuilt = [
    { id: 'swe', title: 'Software Engineer', desc: 'Focuses on your technical stack, system design, and direct impact.' },
    { id: 'pm', title: 'Product Manager', desc: 'Highlights leadership, user metrics, and cross-functional work.' },
    { id: 'ux', title: 'UI/UX Designer', desc: 'Focuses on visual storytelling, user research, and interactive prototypes.' },
    { id: 'marketing', title: 'Marketing Specialist', desc: 'Emphasizes campaign performance, brand strategy, and growth metrics.' },
    { id: 'data', title: 'Data Analyst', desc: 'Highlights statistical analysis, visualization, and insight-driven decisions.' },
    { id: 'sales', title: 'Sales Executive', desc: 'Emphasizes quota attainment, revenue growth, and relationships.' },
  ];

  return (
    <div id="dashboard" className="page active w-full">
      {toast && (
        <div id="toast" className="show" style={{ 
          position: 'fixed', 
          bottom: '2rem', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 9999,
          background: 'var(--ink)',
          color: 'var(--paper)',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '0.875rem',
          fontWeight: 500
        }}>
          {toast}
        </div>
      )}
      <div className="dash-header">
        <div>
          <div className="dash-tabs">
            <h1 
              className={activeTab === 'resumes' ? 'dash-tab active' : 'dash-tab'}
              onClick={() => setActiveTab('resumes')}
            >
              My Resumes
            </h1>
            <h1 
              className={activeTab === 'settings' ? 'dash-tab active' : 'dash-tab'}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </h1>
          </div>
          <p style={{fontSize: '.8rem', color: 'var(--muted)', marginTop: '.25rem'}}>
            Welcome back, <span id="dashUserName">{user.name.split(' ')[0]}</span> &nbsp;
            <span id="dashPlanBadge">
              {user.tier === 'premium' ? 
                <span className="pro-badge">Pro ✦</span> : 
                <span className="free-badge">Free</span>
              }
            </span>
          </p>
        </div>
        {activeTab === 'resumes' && (
            <button 
              className="btn-primary" 
              onClick={() => {
                if (user.tier === 'premium') {
                  handleStart('new', true);
                } else {
                  navigate('/');
                  setTimeout(() => document.getElementById('pricing')?.scrollIntoView({behavior:'smooth'}), 100);
                }
              }} 
              style={{padding: '.7rem 1.5rem', fontSize: '.875rem'}}
            >
              {user.tier === 'premium' ? '+ New Resume' : '+ New Resume (Pro)'}
            </button>
        )}
      </div>

      <div className="dash-body">
        {activeTab === 'resumes' ? (
          <>
            {user.tier !== 'premium' && (
              <div className="upgrade-banner" id="upgradeBanner">
                <div>
                  <h3>Unlock unlimited resumes, PDF exports & more ✦</h3>
                  <p>You're on the Free plan · Upgrade to Pro for $4.99/month</p>
                </div>
                <button className="btn-accent" onClick={async () => {
                   try {
                     const resp = await fetch('/api/create-checkout-session', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ userId: user.id, type: 'subscription' })
                     });
                     const session = await resp.json();
                     if (session.url) window.location.href = session.url;
                   } catch (e) {
                     console.error(e);
                     alert("Payment failed to start.");
                   }
                }}>Upgrade to Pro →</button>
              </div>
            )}

            {savedResumes.length > 0 && (
              <>
                <h2 style={{fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', fontFamily: 'Syne'}}>Saved Resumes</h2>
                <div className="dash-grid">
                  {savedResumes.map(resume => (
                    <div key={resume.id} className="resume-card" onClick={() => handleOpenSaved(resume.id)} style={{cursor: 'pointer', border: '1.5px solid var(--ink)', position: 'relative'}}>
                      <div className="resume-card-preview" style={{color: 'var(--ink)'}}>📄</div>
                      <h3>{resume.title}</h3>
                      <p>Saved {new Date(resume.date).toLocaleDateString()}</p>
                      
                      <div className="card-actions">
                        <button type="button" className="btn-sm" onClick={(e) => { e.stopPropagation(); handleOpenSaved(resume.id); }}>Open</button>
                        <button 
                          type="button"
                          className="btn-sm danger" 
                          style={{borderColor: '#fca5a5', color: '#b91c1c', opacity: deleteLoading === resume.id ? 0.5 : 1}} 
                          disabled={deleteLoading === resume.id}
                          onClick={(e) => deleteSaved(e, resume.id)}
                        >
                          {deleteLoading === resume.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <h2 style={{fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', fontFamily: 'Syne', marginTop: savedResumes.length > 0 ? '2.5rem' : '0'}}>Quick Start Presets</h2>
            <div className="dash-grid">
              {prebuilt.map((preset) => (
                <div 
                  key={preset.id}
                  className="resume-card" 
                  onClick={() => handleStart(preset.id)}
                  style={{cursor: 'pointer'}}
                >
                  <div className="resume-card-preview">📄</div>
                  <h3>{preset.title}</h3>
                  <p>{preset.desc}</p>
                  <div className="card-actions">
                    <button className="btn-sm" onClick={(e) => { e.stopPropagation(); handleStart(preset.id); }}>Start</button>
                  </div>
                </div>
              ))}

              {user.tier === 'free' ? (
                <div className="new-resume-card" onClick={() => { navigate('/'); setTimeout(() => document.getElementById('pricing')?.scrollIntoView({behavior:'smooth'}), 100); }}>
                  <div style={{fontSize: '2rem', color: 'var(--muted)', fontWeight: 300}}>+</div>
                  <p style={{fontSize: '.9rem', color: 'var(--muted)', fontWeight: 500}}>Custom Path (Pro)</p>
                </div>
              ) : (
                 <div className="new-resume-card" onClick={() => handleStart('new', true)}>
                  <div style={{fontSize: '2rem', color: 'var(--muted)', fontWeight: 300}}>+</div>
                  <p style={{fontSize: '.9rem', color: 'var(--muted)', fontWeight: 500}}>Create Custom Resume</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="settings-panel">
            <div className="feature-card" style={{padding: '2rem'}}>
              <h2 style={{fontFamily: 'Syne', marginBottom: '1.5rem', fontSize: '1.25rem'}}>Account Details</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                <div>
                  <label style={{display: 'block', fontSize: '.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '.5rem'}}>Display Name</label>
                  <div style={{display: 'flex', gap: '1rem'}}>
                    <input 
                      type="text" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                      style={{flex: 1, padding: '.6rem .75rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--paper)', outline: 'none'}}
                    />
                    <button 
                      className="btn-primary" 
                      onClick={handleUpdateName}
                      disabled={updatingName || !newName.trim() || newName === user.name}
                      style={{padding: '.6rem 1.25rem', fontSize: '.8rem'}}
                    >
                      {updatingName ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{display: 'block', fontSize: '.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '.5rem'}}>Email Address</label>
                  <input 
                    type="text" 
                    value={user.email} 
                    readOnly
                    style={{width: '100%', padding: '.6rem .75rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', outline: 'none', cursor: 'not-allowed'}}
                  />
                  <p style={{fontSize: '.7rem', color: 'var(--muted)', marginTop: '.4rem'}}>Email settings are managed via your Google account.</p>
                </div>
              </div>
            </div>

            <div className="feature-card" style={{padding: '2rem', marginBottom: '2rem'}}>
              <h2 style={{fontFamily: 'Syne', marginBottom: '1.5rem', fontSize: '1.25rem'}}>Subscription & Billing</h2>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderRadius: '10px', background: user.tier === 'premium' ? 'rgba(249,115,22,0.05)' : 'var(--card)', border: '1.5px solid var(--border)'}}>
                <div>
                  <h3 style={{fontSize: '1rem', fontWeight: 700}}>Farasume {user.tier === 'premium' ? 'Pro ✦' : 'Free'}</h3>
                  <p style={{fontSize: '.85rem', color: 'var(--muted)', marginTop: '.25rem'}}>
                    {user.tier === 'premium' ? 'You have full access to all AI features and unlimited resumes.' : 'Upgrade to Pro for $4.99/mo for unlimited AI-powered resumes.'}
                  </p>
                </div>
                <div>
                  {user.tier === 'premium' ? (
                    <button className="btn-secondary" onClick={() => window.open('https://billing.stripe.com/p/login/test_6oE14U34U0eO8mIcMM', '_blank')} style={{padding: '.6rem 1.25rem', fontSize: '.8rem'}}>Manage Billing</button>
                  ) : (
                    <button className="btn-accent" onClick={async () => {
                      try {
                        const resp = await fetch('/api/create-checkout-session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: user.id, type: 'subscription' })
                        });
                        const session = await resp.json();
                        if (session.url) window.location.href = session.url;
                      } catch (e) {
                        console.error(e);
                      }
                    }} style={{padding: '.6rem 1.25rem', fontSize: '.8rem'}}>Upgrade Now</button>
                  )}
                </div>
              </div>
            </div>

            <div className="feature-card" style={{padding: '2rem', border: '1.5px solid #fee2e2'}}>
              <h2 style={{fontFamily: 'Syne', marginBottom: '1rem', fontSize: '1.25rem', color: '#991b1b'}}>Danger Zone</h2>
              <p style={{fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1.5rem'}}>Once you delete your account, there is no going back. Please be certain.</p>
              <div style={{display: 'flex', gap: '1rem'}}>
                <button className="btn-secondary" onClick={() => logout()} style={{padding: '.6rem 1.25rem', fontSize: '.8rem'}}>Sign Out</button>
                <button 
                  className="btn-secondary" 
                  onClick={handleDeleteAccount}
                  style={{padding: '.6rem 1.25rem', fontSize: '.8rem', color: '#b91c1c', borderColor: '#fca5a5'}}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
