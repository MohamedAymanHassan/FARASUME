import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/lib/auth';
import { Check, ChevronDown, Star, User, FileText, Sparkles, Layout, MessageSquare, HelpCircle } from 'lucide-react';

export function Home() {
  const navigate = useNavigate();
  const { login, user, upgradeToPremium } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if(e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, {threshold:.1});
    
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const faqs = [
    {
      q: "Is Farasume really free?",
      a: "Yes! You can create your first resume, use our basic template, and get AI suggestions completely for free. We offer a Pro plan for users who need unlimited resumes, premium templates, and advanced AI features."
    },
    {
      q: "Will my resume be ATS-friendly?",
      a: "Absolutely. All our templates are designed with Applicant Tracking Systems in mind. We use standard fonts, clean layouts, and proper document structures to ensure your resume gets through the digital gatekeepers."
    },
    {
      q: "Can I cancel my Pro subscription anytime?",
      a: "Yes, you can cancel your subscription at any time from your settings page. You'll keep your Pro features until the end of your billing cycle."
    },
    {
      q: "How does the AI writing feature work?",
      a: "Our AI analysis your job description or your input and generates punchy, achievement-oriented bullet points. It helps you quantify your impact and use the right keywords for your industry."
    }
  ];

  return (
    <div id="landing" className="page active">
      <section className="hero">
        <div className="hero-badge"><span></span> AI-Powered Resume Builder</div>
        <h1>Build resumes<br/>that get you <em>hired.</em></h1>
        <p>Create stunning, ATS-friendly resumes in minutes. Let AI write your bullets, tailor your pitch, and export to PDF.</p>
        <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center'}}>
          <button className="btn-primary" onClick={() => user ? navigate('/dashboard') : login()}>
            {user ? 'Start Now' : 'Create my resume — free'}
          </button>
          <button className="btn-secondary" onClick={() => {
            document.getElementById('features')?.scrollIntoView({behavior:'smooth'});
          }}>See how it works</button>
        </div>
      </section>

      <section className="how-it-works reveal">
        <div className="section-label">The Process</div>
        <div className="section-title">Your new career starts<br/>in three simple steps.</div>
        <div className="step-grid">
          <div className="step-card">
            <span className="step-number">01</span>
            <h3>Choose a template</h3>
            <p>Select from our library of ATS-optimized designs tailored for your specific industry.</p>
          </div>
          <div className="step-card">
            <span className="step-number">02</span>
            <h3>Add your details</h3>
            <p>Our real-time editor and AI assistant help you craft the perfect bullets and summary.</p>
          </div>
          <div className="step-card">
            <span className="step-number">03</span>
            <h3>Download & apply</h3>
            <p>Export a pixel-perfect PDF and start getting the interview callbacks you deserve.</p>
          </div>
        </div>
      </section>

      <section className="templates-preview reveal" id="templates">
        <div className="section-label">Choose your style</div>
        <div className="section-title">Professional templates<br/>for every industry.</div>
        <div className="templates-grid">
          <div className="template-showcase-card">
            <div className="template-img-wrap">
              <div style={{padding: '2rem', textAlign: 'left', width: '100%'}}>
                <div style={{height: '20px', width: '60%', background: '#eee', marginBottom: '1rem'}}></div>
                <div style={{height: '10px', width: '100%', background: '#f5f5f5', marginBottom: '.5rem'}}></div>
                <div style={{height: '10px', width: '90%', background: '#f5f5f5', marginBottom: '.5rem'}}></div>
                <div style={{height: '10px', width: '95%', background: '#f5f5f5', marginBottom: '2rem'}}></div>
                <div style={{height: '15px', width: '30%', background: 'var(--accent)', marginBottom: '1rem'}}></div>
                <div style={{height: '10px', width: '100%', background: '#f5f5f5', marginBottom: '.5rem'}}></div>
                <div style={{height: '10px', width: '100%', background: '#f5f5f5', marginBottom: '.5rem'}}></div>
              </div>
            </div>
            <h4>Classic Professional</h4>
          </div>
          <div className="template-showcase-card">
            <div className="template-img-wrap" style={{borderLeft: '40px solid var(--ink)'}}>
              <div style={{padding: '2rem', textAlign: 'left', width: '100%'}}>
                <div style={{height: '25px', width: '70%', background: '#eee', marginBottom: '1rem'}}></div>
                <div style={{height: '12px', width: '100%', background: '#f5f5f5', marginBottom: '.5rem'}}></div>
                <div style={{height: '12px', width: '80%', background: '#f5f5f5', marginBottom: '2rem'}}></div>
                <div style={{height: '15px', width: '40%', background: '#eee', marginBottom: '1rem'}}></div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <div style={{height: '24px', width: '50px', background: '#f0f0f0', borderRadius: '4px'}}></div>
                  <div style={{height: '24px', width: '60px', background: '#f0f0f0', borderRadius: '4px'}}></div>
                </div>
              </div>
            </div>
            <h4>Modern Creative</h4>
          </div>
          <div className="template-showcase-card">
            <div className="template-img-wrap" style={{flexDirection: 'column'}}>
              <div style={{height: '60px', width: '100%', background: 'var(--ink)', display: 'flex', alignItems: 'center', padding: '0 2rem'}}>
                 <div style={{height: '20px', width: '40%', background: 'rgba(255,255,255,0.2)'}}></div>
              </div>
              <div style={{padding: '2rem', textAlign: 'left', width: '100%'}}>
                <div style={{height: '12px', width: '100%', background: '#f5f5f5', marginBottom: '.5rem'}}></div>
                <div style={{height: '12px', width: '100%', background: '#f5f5f5', marginBottom: '.5rem'}}></div>
                <div style={{height: '12px', width: '90%', background: '#f5f5f5', marginBottom: '2rem'}}></div>
                <div style={{height: '15px', width: '100%', background: '#eee', borderBottom: '2px solid #ddd', paddingBottom: '4px', marginBottom: '1rem'}}></div>
                <div style={{height: '10px', width: '100%', background: '#f5f5f5', marginBottom: '.5rem'}}></div>
              </div>
            </div>
            <h4>Executive Elite</h4>
          </div>
        </div>
      </section>

      <section className="features reveal" id="features">
        <div className="section-label">Why Farasume</div>
        <div className="section-title">Everything you need<br/>to land the job.</div>
        <div className="features-grid">
          <div className="feature-card"><div className="feature-icon"><Sparkles size={20}/></div><h3>AI-Written Bullets</h3><p>Describe your role, let AI craft impactful achievement-driven bullet points that impress hiring managers.</p></div>
          <div className="feature-card"><div className="feature-icon"><Check size={20}/></div><h3>ATS Optimized</h3><p>Every template is designed to pass Applicant Tracking Systems — so humans actually read your resume.</p></div>
          <div className="feature-card"><div className="feature-icon"><FileText size={20}/></div><h3>One-Click PDF Export</h3><p>Export pixel-perfect PDFs ready to send. Pro users get unlimited exports.</p></div>
          <div className="feature-card"><div className="feature-icon"><Layout size={20}/></div><h3>Real-Time Preview</h3><p>See exactly how your resume looks as you type. No guessing, no surprises.</p></div>
          <div className="feature-card"><div className="feature-icon"><Layout size={20} style={{transform: 'rotate(90deg)'}}/></div><h3>Multiple Resumes</h3><p>Tailor each resume for different job applications. Pro unlocks unlimited saves.</p></div>
          <div className="feature-card"><div className="feature-icon"><Check size={20}/></div><h3>Auto-Save</h3><p>Your work is automatically saved to the cloud every few seconds. Never lose a single word.</p></div>
        </div>
      </section>

      <section className="testimonials reveal">
        <div className="section-label">Success stories</div>
        <div className="section-title">Trusted by 10,000+<br/>happy job seekers.</div>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-quote">"Farasume helped me land a Senior Product Designer role at a top tech company. The AI bullet writer is a game changer."</div>
            <div className="testimonial-author">
              <div className="testimonial-avatar" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2ddd8'}}><User size={24}/></div>
              <div className="testimonial-info">
                <h4>Sarah Jenkins</h4>
                <p>Product Designer @ Meta</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-quote">"I was struggling to make my resume ATS-friendly. After using Farasume, I started getting interviews within a week."</div>
            <div className="testimonial-author">
              <div className="testimonial-avatar" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2ddd8'}}><User size={24}/></div>
              <div className="testimonial-info">
                <h4>Marcus Chen</h4>
                <p>Software Engineer @ Stripe</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-quote">"The interface is so clean and easy to use. I saved hours of formatting time and ended up with a beautiful resume."</div>
            <div className="testimonial-author">
              <div className="testimonial-avatar" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2ddd8'}}><User size={24}/></div>
              <div className="testimonial-info">
                <h4>Elena Rodriguez</h4>
                <p>Marketing Director</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing reveal" id="pricing">
        <div style={{maxWidth: '700px', margin: '0 auto 3.5rem', textAlign: 'center', position: 'relative', zIndex: 1}}>
          <div className="section-label" style={{color: 'rgba(255,255,255,.4)'}}>Pricing</div>
          <div className="section-title">Simple, honest pricing.</div>
          <p style={{color: 'rgba(255,255,255,.5)', fontSize: '1rem'}}>Build for free, pay only when you're ready to export.</p>
        </div>
        <div className="pricing-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', maxWidth: '1100px' }}>
          <div className="plan-card free">
            <div className="plan-name">Free</div>
            <div className="plan-price"><sup>$</sup>0</div>
            <div className="plan-period">forever</div>
            <ul className="plan-features">
              <li>Unlimited drafting</li>
              <li>Basic templates</li>
              <li>AI Career Expert chat</li>
              <li>Save progress anytime</li>
              <li style={{ opacity: 0.5 }}>No PDF export</li>
            </ul>
            <button className="plan-btn" onClick={() => user ? navigate('/dashboard') : login()}>
              {user ? 'View Dashboard' : 'Start Building'}
            </button>
          </div>
          <div className="plan-card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="plan-name">Single CV</div>
            <div className="plan-price"><sup>$</sup>1.99</div>
            <div className="plan-period">one-time payment</div>
            <ul className="plan-features">
               <li>Full PDF export</li>
               <li>Lifetime access to 1 CV</li>
               <li>Premium templates</li>
               <li>AI Bullet writing</li>
               <li>Clean, no watermark</li>
            </ul>
            <button className="plan-btn" onClick={() => user ? navigate('/dashboard') : login()}>
              {user ? 'Choose a template' : 'Get started'}
            </button>
          </div>
          <div className="plan-card pro">
            <div className="plan-name">Pro ✦</div>
            <div className="plan-price"><sup>$</sup>4.99</div>
            <div className="plan-period">per month</div>
            <ul className="plan-features">
              <li><strong>Unlimited</strong> resumes</li>
              <li><strong>Unlimited</strong> PDF exports</li>
              <li>All premium templates</li>
              <li>Unlimited AI writing</li>
              <li>Cover letter builder</li>
              <li>Priority support</li>
            </ul>
            <button className="plan-btn" onClick={async () => {
              if (!user) {
                login();
              } else if (user.tier === 'premium') {
                navigate('/dashboard');
              } else {
                // We'll initiate checkout in the builder or dashboard
                navigate('/dashboard');
              }
            }}>
              {user?.tier === 'premium' ? 'Current Plan' : 'Go Unlimited'}
            </button>
          </div>
        </div>
      </section>

      <section className="stats reveal" style={{ padding: '6rem 2.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div className="section-label">Our Impact</div>
        <div className="section-title">Numbers that speak<br/>for themselves.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--card)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
            <div style={{ fontFamily: 'Syne', fontSize: '3.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>40%</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Higher ATS pass rate</p>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--card)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
            <div style={{ fontFamily: 'Syne', fontSize: '3.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>2.5x</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>More interview invites</p>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--card)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
            <div style={{ fontFamily: 'Syne', fontSize: '3.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>10k+</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hired professionals</p>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--card)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
            <div style={{ fontFamily: 'Syne', fontSize: '3.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>150+</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Industries supported</p>
          </div>
        </div>
      </section>

      <section className="faq reveal" id="faq">
        <div className="section-label">Questions?</div>
        <div className="section-title">Frequently Asked Questions.</div>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item">
              <h3 onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {faq.q}
                <ChevronDown 
                  size={20} 
                  style={{transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s'}}
                />
              </h3>
              {openFaq === i && <p>{faq.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="bottom-cta reveal">
        <div className="bottom-cta-content">
          <h2>Ready to land<br/>your <em>dream job?</em></h2>
          <p>Join over 10,000 professionals who built their careers with Farasume.</p>
          <button className="btn-white" onClick={() => user ? navigate('/dashboard') : login()}>Build my resume now</button>
        </div>
        <div style={{position: 'absolute', top: '-10%', right: '-10%', width: '40%', height: '40%', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(80px)'}}></div>
        <div style={{position: 'absolute', bottom: '-10%', left: '-10%', width: '30%', height: '30%', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(60px)'}}></div>
      </section>
    </div>
  );
}
