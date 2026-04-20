import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/lib/auth';
import { GoogleGenAI } from '@google/genai';
import { Send, FileText, ArrowLeft, Activity, Printer, Linkedin, Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Lazy initialization for the API client
let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is missing. AI features will be disabled.");
      // We still return an instance but operations will fail gracefully
      aiInstance = new GoogleGenAI({ apiKey: 'missing-key' });
    } else {
      aiInstance = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiInstance;
};

interface Message {
  role: 'user' | 'model';
  content: string;
}

const PREBUILT_ROLES: Record<string, { title: string, instruction: string }> = {
  'swe': {
    title: 'Software Engineer',
    instruction: "You are an expert technical recruiter gathering information to build a Software Engineer CV. Ask questions one at a time about: 1) Their primary languages/frameworks, 2) Their most impactful project and its technical complexity, 3) Previous roles and scope of impact. Keep your questions extremely brief.",
  },
  'pm': {
    title: 'Product Manager',
    instruction: "You are an expert tech recruiter gathering information to build a Product Manager CV. Ask questions one at a time about: 1) Products launched, 2) User metrics/revenue impact, 3) Cross-functional leadership experience. Keep your questions extremely brief.",
  },
  'sales': {
    title: 'Sales Executive',
    instruction: "You are an expert sales recruiter gathering information to build a Sales Executive CV. Ask questions one at a time about: 1) Quota attainment and ARR generated, 2) Average deal sizes and sales cycles, 3) Territories or product lines managed. Keep your questions extremely brief.",
  },
  'ux': {
    title: 'UI/UX Designer',
    instruction: "You are an expert design recruiter gathering information to build a UI/UX Designer CV. Ask questions one at a time about: 1) Design tools and methodologies, 2) User research and testing experience, 3) Key portfolio projects and design impact. Keep your questions extremely brief.",
  },
  'marketing': {
    title: 'Marketing Specialist',
    instruction: "You are an expert marketing recruiter gathering information to build a Marketing Specialist CV. Ask questions one at a time about: 1) Campaign performance and growth metrics, 2) Brand strategy and positioning, 3) Multi-channel marketing experience. Keep your questions extremely brief.",
  },
  'data': {
    title: 'Data Analyst',
    instruction: "You are an expert data science recruiter gathering information to build a Data Analyst CV. Ask questions one at a time about: 1) Data tools and technologies (Python, SQL, Tableau), 2) Statistical modeling and analysis projects, 3) Insight-driven business impact. Keep your questions extremely brief.",
  }
};

export function CVBuilder() {
  const { id } = useParams();
  console.log(`Mounting CVBuilder with id: ${id}`);
  const [searchParams, setSearchParams] = useSearchParams();
  const isCustom = searchParams.get('custom') === 'true';
  const isSaved = searchParams.get('saved') === 'true';
  const { user, upgradeToPremium } = useAuth();
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isAIUpdating, setIsAIUpdating] = useState(false);

  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  
  // App Phase: 'configure' -> 'interview' -> 'generating' -> 'saving' -> 'preview'
  const [phase, setPhase] = useState<'configure' | 'interview' | 'generating' | 'saving' | 'preview'>(
    isSaved ? 'preview' : (isCustom ? 'configure' : 'interview')
  );
  
  const [resumeMarkdown, setResumeMarkdown] = useState('');
  const [template, setTemplate] = useState<'classic' | 'modern' | 'executive' | 'minimalist' | 'creative' | 'professional' | 'compact' | 'elegant' | 'techie' | 'brutalist' | 'vintage' | 'sidebar'>('classic');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Setup scenario
  const [roleTitle, setRoleTitle] = useState(
    isCustom || isSaved ? '' : (id ? PREBUILT_ROLES[id]?.title : '')
  );

  // Load existing if saved
  useEffect(() => {
    async function loadSavedResume() {
      if (!isSaved || !id || !user) return;
      try {
        const resumeRef = doc(db, 'resumes', id);
        const resumeSnap = await getDoc(resumeRef);
        if (resumeSnap.exists()) {
          const data = resumeSnap.data();
          if (data.userId === user.id) {
            setResumeMarkdown(data.markdown);
            setRoleTitle(data.title);
            setIsUnlocked(data.unlocked === true);
          } else {
            navigate('/dashboard'); // Not owner
          }
        } else {
          navigate('/dashboard'); // Not found
        }
      } catch (error) {
        console.error("Error loading resume:", error);
        navigate('/dashboard');
      }
    }
    loadSavedResume();
  }, [isSaved, id, user, navigate]);

  // Handle successful purchase
  useEffect(() => {
    if (searchParams.get('success') === 'true' && id && user) {
      const finalizePurchase = async () => {
        try {
          const resumeRef = doc(db, 'resumes', id);
          await updateDoc(resumeRef, {
            unlocked: true,
            updatedAt: serverTimestamp()
          });
          setIsUnlocked(true);
          setSearchParams({ saved: 'true' });
        } catch (e) {
          console.error("Failed to unlock resume:", e);
        }
      };
      finalizePurchase();
    }
  }, [searchParams, id, user, setSearchParams]);
  const [roleInstruction, setRoleInstruction] = useState(
    isCustom ? '' : (id ? PREBUILT_ROLES[id]?.instruction : '')
  );

  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importedData, setImportedData] = useState('');

  const handleLinkedInImport = async () => {
    if (!linkedInUrl) return;
    setIsImporting(true);
    // Simulate API extraction delay
    setTimeout(() => {
       setImportedData(`[IMPORTED FROM: ${linkedInUrl}]\n\nEXPERIENCE:\n- Senior Developer at Tech Innovations Inc. (2021 - Present)\n  • Led cloud migration to AWS\n  • Managed team of 4 engineers\n- Software Developer at WebCorp (2018 - 2021)\n  • Developed scalable React applications\n  • Reduced load times by 40%\n\nEDUCATION:\n- BSc Computer Science, State University (2014 - 2018)\n\nSKILLS:\nReact, Node.js, TypeScript, AWS, Team Leadership`);
       setIsImporting(false);
    }, 1500);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startInterview = (editingMode = false) => {
    if (!roleInstruction && isCustom && !editingMode) return;
    
    setPhase('interview');
    if (editingMode) setIsAIUpdating(true);

    const baseSystemPrompt = editingMode
      ? `You are an expert resume editor. The user has an existing resume (Markdown below) and wants to make some updates/edits to it.
         Your goal is to understand their requested changes (e.g., adding a new job, updating skills, or refining bullet points) and gather any necessary details.
         Once you have the details for the changes, tell the user you're ready to update their CV.
         
         CURRENT RESUME CONTENT:
         ${resumeMarkdown}
         
         Phase: Ask clarifying questions about their requested edits. Do not output the full resume yet.`
      : (isCustom 
        ? `You are an expert resume writer. The user wants to build a resume for the role of ${roleTitle}. 
           Phase 1: Ask exactly 5 insightful questions one by one (do not ask all at once) to gather comprehensive data on their experience, skills, and accomplishments.
           Phase 2: After the 5th question is answered, tell the user you have the core information and ask them if there's any "additional information, specific keywords, or personal touches" they want to include before generating the CV.
           Keep your questions brief. \n\nAdditional instructions: ${roleInstruction}`
        : (id ? PREBUILT_ROLES[id]?.instruction + ". Ask at least 5 questions one by one. Once done, ask the user for any final additional details they'd like to add." : ""));

    const contextAddition = importedData 
      ? `\n\nUSER'S EXISTING BACKGROUND DATA (IMPORTED FROM LINKEDIN/RESUME):\n${importedData}\n\nINSTRUCTION: The user has imported their existing profile data. DO NOT ask them for their basic work history or education if it is already provided above. Instead, review their data and formulate ONE specific question to dig deeper into an accomplishment, ask for specific metrics, or clarify an important detail. Acknowledge their imported data briefly in your first response.`
      : `\n\nINSTRUCTION: The user hasn't provided background data. Ask them to describe their most recent role or education to get started.`;

    const ai = getAI();
    const newChat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: baseSystemPrompt + contextAddition + "\n\nImportant: Only ask ONE question at a time. Keep it conversational like a chat. Do not output a formatted resume yet.",
        temperature: 0.7,
      }
    });

    setChat(newChat);
    
    const initialGreeting = importedData
      ? "I've successfully received your imported profile data. To make this resume stand out, let's dive into some specifics. Can you tell me more about your biggest achievement in your most recent role?"
      : "Hello! I'm ready to help build your CV. To get started, I just need a quick overview of what you're looking for, or we can dive straight into your most recent experience. Where would you like to begin?";

    // Auto-trigger the AI's first greeting to get the chat started
    const editGreeting = "I'm ready to help you update your resume. What changes or new information would you like to add today?";
    triggerAIResponse(newChat, editingMode ? editGreeting : initialGreeting);
  };

  // Auto-start prebuilt
  useEffect(() => {
    if (!isCustom && id && PREBUILT_ROLES[id] && !chat) {
      startInterview();
    }
  }, [isCustom, id]);

  const triggerAIResponse = async (activeChat: any, customInitialMessage?: string) => {
    setIsTyping(true);
    try {
      if (customInitialMessage) {
        setMessages([{ role: 'model', content: customInitialMessage }]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chat) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setQuestionCount(prev => prev + 1);
    setIsTyping(true);

    try {
      const responseStream = await chat.sendMessageStream({ message: userText });
      
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullResponse += chunk.text;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = fullResponse;
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Error in chat.sendMessageStream:', error);
      setMessages(prev => [...prev, { role: 'model', content: `*(Error communicating with the builder core. Please try again or refresh the page.)*` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateCV = async () => {
    if (!chat) return;
    setPhase('generating');
    
    try {
      const finalPrompt = "Based on our ENTIRE conversation above, please write a professional, highly-polished, ATS-optimized resume for me. Formatting rules: \n- Use standard markdown (H1 for name, H2 for sections like Experience, Education, Skills).\n- Use bullet points for accomplishments, prioritizing quantifiable metrics.\n- IMPORTANT: Output ONLY the markdown formatted resume. Do not include any conversational text like 'Here is your resume:' or 'Let me know what you think.' Just the markdown.";
      
      const response = await chat.sendMessage({ message: finalPrompt });
      
      // Strip out markdown code blocks if the AI includes them
      let md = response.text || '';
      if (md.startsWith('```markdown')) md = md.replace(/^```markdown\n/, '');
      if (md.endsWith('```')) md = md.replace(/\n```$/, '');
      
      setResumeMarkdown(md);

      // Now save it securely before previewing
      setPhase('saving');
      
      const titleToUse = roleTitle || PREBUILT_ROLES[id || '']?.title || 'Generated Resume';
      
      if (user) {
        if (isSaved && id) {
          // UPDATE existing resume
          const resumeRef = doc(db, 'resumes', id);
          await updateDoc(resumeRef, {
            markdown: md,
            updatedAt: serverTimestamp()
          });
        } else {
          // CREATE new resume
          const resumeId = Date.now().toString(); // Use timestamp as ID
          await setDoc(doc(db, 'resumes', resumeId), {
            userId: user.id,
            title: titleToUse,
            markdown: md,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          // After first save, navigate to the specific URL for this resume
          navigate(`/build/${resumeId}?saved=true`, { replace: true });
        }
      }
      
      // Finalize by entering template selection / preview
      setTimeout(() => setPhase('preview'), 800);

    } catch (error) {
      console.error('Failed to generate resume', error);
      setPhase('interview');
      alert("Failed to generate CV. Please try again.");
    }
  };

  const handlePrint = async () => {
    if (!user) return;
    
    if (user.tier !== 'premium' && !isUnlocked) {
      setShowPaywall(true);
      return;
    }

    const element = document.getElementById('resume-print-area');
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is taller than A4
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${roleTitle || 'resume'}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      // Fallback to browser print if library fails
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handlePurchase = async (type: 'subscription' | 'one-time') => {
    if (!user || !id) return;
    setIsPurchasing(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type,
          resumeId: id
        })
      });
      const session = await response.json();
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to initiate checkout. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleUpgrade = async () => {
    await handlePurchase('subscription');
  };

  const handleEnd = () => {
    navigate('/dashboard');
  };


  if (phase === 'configure') {
    return (
      <div id="builder" className="page active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', paddingTop: '6rem' }}>
        <div className="feature-card" style={{ maxWidth: '600px', width: '100%' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.85rem', color: 'var(--muted)', fontFamily: 'DM Sans,sans-serif', marginBottom: '1.5rem' }}>← Back to Hub</button>
          
          <h1 style={{ fontFamily: 'Syne', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Configure Career Path</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Tell the AI what role you are targeting to optimize the interview phase.</p>
          
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Target Role</label>
            <input 
              type="text" 
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              style={{ width: '100%', padding: '.6rem .875rem', borderRadius: '7px', border: '1.5px solid var(--border)', background: 'var(--paper)', fontFamily: 'DM Sans,sans-serif', fontSize: '.875rem', outline: 'none' }}
              placeholder="e.g., Senior Security Engineer"
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Focus Areas & Instructions</label>
            <textarea 
              value={roleInstruction}
              onChange={(e) => setRoleInstruction(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '.6rem .875rem', borderRadius: '7px', border: '1.5px solid var(--border)', background: 'var(--paper)', fontFamily: 'DM Sans,sans-serif', fontSize: '.875rem', outline: 'none', resize: 'vertical' }}
              placeholder="Make sure to highlight my experience with cloud infrastructure, Kubernetes, and compliance audits..."
            />
          </div>

          <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1.5px dashed var(--border)', borderRadius: '8px', background: 'var(--card)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '.85rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '.75rem' }}>
              <FileText size={16} color="var(--accent)" /> Import Existing Data
            </label>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>Paste your existing resume, LinkedIn profile summary, or raw experience data below.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea 
                value={importedData}
                onChange={(e) => setImportedData(e.target.value)}
                placeholder="e.g., Software Engineer with 5 years experience at..."
                rows={5}
                style={{ width: '100%', padding: '.6rem .875rem', borderRadius: '7px', border: '1.5px solid var(--border)', background: 'var(--paper)', fontFamily: 'DM Sans,sans-serif', fontSize: '.875rem', outline: 'none', resize: 'vertical' }}
              />
            </div>
          </div>
          
          <button 
            onClick={() => startInterview()}
            disabled={!roleInstruction.trim() || !roleTitle.trim()}
            className="btn-primary"
            style={{ width: '100%', opacity: (!roleInstruction.trim() || !roleTitle.trim()) ? 0.5 : 1, cursor: (!roleInstruction.trim() || !roleTitle.trim()) ? 'not-allowed' : 'pointer' }}
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'preview') {
    return (
      <div id="builder" className="page active">
        <AnimatePresence>
          {showPaywall && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative border border-gray-100"
              >
                <button 
                  onClick={() => setShowPaywall(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Sparkles className="text-orange-600" size={32} />
                </div>

                <h2 className="text-center text-3xl font-bold font-syne mb-2 tracking-tight">Export Your CV</h2>
                <p className="text-center text-gray-500 mb-8 leading-relaxed">
                  Choose the plan that fits your career goals. Unlock individual resumes or go Pro for unlimited access.
                </p>

                <div className="flex flex-col gap-4 mb-8">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                       <span className="font-bold text-gray-900">Single Resume Unlock</span>
                       <span className="text-xl font-bold font-syne">$1.99</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Unlimited PDF exports for this specific resume forever.</p>
                    <button 
                      onClick={() => handlePurchase('one-time')}
                      disabled={isPurchasing}
                      className="w-full bg-white border-2 border-black text-black rounded-lg py-2 text-sm font-bold hover:bg-black hover:text-white transition-all disabled:opacity-50"
                    >
                      {isPurchasing ? 'Processing...' : 'Unlock This CV'}
                    </button>
                  </div>

                  <div className="bg-orange-50 rounded-xl p-6 border border-orange-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-bold px-3 py-1 rounded-bl-lg uppercase">Best Value</div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="font-bold text-orange-900">Farasume Pro ✦</span>
                       <span className="text-xl font-bold font-syne">$4.99</span>
                    </div>
                    <p className="text-xs text-orange-700/70 mb-4">Unlimited resumes, premium themes, and unlimited PDF exports.</p>
                    <button 
                      onClick={() => handlePurchase('subscription')}
                      disabled={isPurchasing}
                      className="w-full bg-orange-600 text-white rounded-lg py-2 text-sm font-bold shadow-md hover:bg-orange-700 transition-all disabled:opacity-50"
                    >
                       {isPurchasing ? 'Processing...' : 'Subscribe & Unlock All'}
                    </button>
                  </div>
                </div>
                <p className="text-center text-[11px] text-gray-400 mt-4 px-4">
                  One-click secure upgrade. Cancel anytime. 7-day money back guarantee.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="builder-layout">
          <div className="builder-sidebar">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'2rem'}}>
              {!isSaved && <button onClick={() => setPhase('interview')} style={{background:'none',border:'none',cursor:'pointer',fontSize:'.85rem',color:'var(--muted)',fontFamily:'DM Sans,sans-serif'}}>← Back to Editor</button>}
              {isSaved && <button onClick={() => navigate('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',fontSize:'.85rem',color:'var(--muted)',fontFamily:'DM Sans,sans-serif'}}>← Hub</button>}
              <button 
                className="btn-accent" 
                onClick={handlePrint} 
                disabled={isExporting}
                style={{padding:'.6rem 1.25rem', fontSize:'.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px'}}
              >
                {isExporting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Preparing PDF...
                  </>
                ) : (
                  <>
                    <Printer size={16} /> Export PDF
                  </>
                )}
              </button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
               <h3 style={{ fontFamily: 'Syne', fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <Sparkles size={16} className="text-orange-500" /> Designer Finish
               </h3>
               <p style={{fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: '1.5'}}>
                 {isSaved ? "Your resume is ready. Choose a template style below to finalize the look." : "Success! Your AI CV is saved. Pick a designer template below."}
               </p>
 
               <div style={{ marginBottom: '1.5rem' }}>
                 <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>Visual Template</label>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                   {['classic', 'modern', 'executive', 'minimalist', 'creative', 'professional', 'compact', 'elegant', 'techie', 'brutalist', 'vintage', 'sidebar'].map(t => (
                     <button
                       key={t}
                       onClick={() => setTemplate(t as any)}
                       style={{ padding: '.5rem', fontSize: '.6rem', textTransform: 'capitalize', borderRadius: '6px', fontWeight: 600, transition: 'all 0.2s' }}
                       className={template === t ? 'btn-primary' : 'btn-secondary'}
                     >
                       {t}
                     </button>
                   ))}
                 </div>
               </div>
 
               <div className="flex flex-col gap-2 mb-4">
                 <button 
                  onClick={() => startInterview(true)}
                  className="w-full flex items-center justify-center gap-2 bg-black text-white rounded-xl py-3 font-bold hover:translate-y-[-2px] transition-all shadow-lg"
                 >
                   <Sparkles size={18} /> Edit with AI ✦
                 </button>
                 <button className="btn-secondary" style={{width: '100%', padding: '0.65rem', fontSize: '0.8rem', borderRadius: '8px'}} onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
               </div>
            </div>

            <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Export Settings</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> A4 Paper
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> High Res
                 </div>
              </div>
            </div>
          </div>
          <div className="builder-preview no-print">
            <div id="resume-print-area" className={`resume-sheet template-${template} shadow-2xl`}>
              <div className="markdown-body">
                <Markdown>{resumeMarkdown}</Markdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'generating') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 fixed inset-0 z-50 bg-[var(--paper)]">
        <div className="spinner" style={{width: '48px', height: '48px', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'var(--accent)', borderWidth: '4px', marginBottom: '2rem'}}></div>
        <h2 style={{fontFamily: 'Syne', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: 'var(--ink)'}}>Assembling Career Profile...</h2>
        <p style={{color: 'var(--muted)', fontSize: '0.9rem'}}>Formatting ATS constraints</p>
      </div>
    )
  }

  if (phase === 'saving') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 fixed inset-0 z-50 bg-[var(--paper)]">
        <div className="spinner" style={{width: '48px', height: '48px', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: '#10b981', borderWidth: '4px', marginBottom: '2rem'}}></div>
        <h2 style={{fontFamily: 'Syne', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: 'var(--ink)'}}>Saving CV to Hub...</h2>
        <p style={{color: 'var(--muted)', fontSize: '0.9rem'}}>Preparing preview and template engines</p>
      </div>
    )
  }

  return (
    <div id="builder" className="page active">
      <div className="builder-layout">
        <div className="builder-sidebar">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'2rem', minHeight: '40px'}}>
            <button onClick={handleEnd} style={{background:'none',border:'none',cursor:'pointer',fontSize:'.85rem',color:'var(--muted)',fontFamily:'DM Sans,sans-serif', display: 'flex', alignItems: 'center', height: '100%'}}>← Abort</button>
            <button 
              className="btn-accent" 
              onClick={generateCV} 
              disabled={!isAIUpdating && questionCount < 5}
              style={{padding:'.5rem 1rem',fontSize:'.8rem', opacity: (!isAIUpdating && questionCount < 5) ? 0.3 : 1, pointerEvents: (!isAIUpdating && questionCount < 5) ? 'none' : 'auto'}}
            >
              {isAIUpdating ? 'Apply Changes' : (questionCount < 5 ? `In Progress` : 'Finalize & Save')}
            </button>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              <span>{isAIUpdating ? 'Revision Progress' : 'Interview Progress'}</span>
              <span>{isAIUpdating ? 'Active Editing' : `${Math.min(questionCount, 5)} / 5`}</span>
            </div>
            {!isAIUpdating && (
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(Math.min(questionCount, 5) / 5) * 100}%` }}
                  style={{ height: '100%', background: 'var(--accent)' }}
                />
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto relative scroll-smooth flex flex-col gap-6 mb-4" style={{minHeight: '200px', paddingRight: '10px', paddingBottom: '2rem'}}>
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex w-full",
                    m.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div 
                    className={cn(
                      "max-w-[85%] rounded-2xl text-[0.9rem] leading-[1.6] transition-all",
                      m.role === 'user' 
                        ? "bg-[var(--ink)] text-[var(--paper)] rounded-br-sm shadow-lg border border-white/10" 
                        : "bg-white/80 backdrop-blur-md text-[var(--ink)] border border-white/20 rounded-bl-sm font-sans shadow-sm"
                    )}
                    style={{ padding: '12px 14px' }}
                  >
                    {m.role === 'model' && (
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                         <div className="w-2 h-2 bg-orange-500 rounded-full" />
                         <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-[0.1em]">AI Career Expert</span>
                       </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <h4 style={{ fontFamily: 'Syne', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={14} className="text-orange-500" /> Professional Insight
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: '1.4' }}>
              {questionCount < 2 && "Start with your most recent role. Quantifiable achievements (like percentages or dollar amounts) perform 40% better on ATS filters."}
              {questionCount >= 2 && questionCount < 4 && "Focus on problem-solving. Recruiters look for where you added value, not just a list of your daily tasks."}
              {questionCount >= 4 && "Almost there. We'll soon ask for any final touches to make your CV unique to your personality."}
            </p>
          </div>

          <form onSubmit={handleSend} className="mt-auto border-t-[1.5px] border-black/5 pt-4">
            <div className="relative flex items-center" style={{ minHeight: '44px' }}>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isTyping}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.5)',
                  backdropFilter: 'blur(10px)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.95rem',
                  outline: 'none',
                  paddingRight: '3.5rem'
                }}
                placeholder={isTyping ? "AI is reviewing..." : "Answer the expert..."}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 w-10 h-10 bg-[var(--ink)] text-[var(--paper)] rounded-xl flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105"
                style={{ top: '50%', transform: 'translateY(-50%)', margin: 0 }}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </div>
        
        <div className="builder-preview hidden md:flex" style={{opacity: 0.5}}>
          <div className="resume-sheet flex items-center justify-center flex-col text-center p-12">
            <FileText size={64} className="text-[var(--border)] mb-4" />
            <h3 style={{fontFamily: 'Syne', fontSize: '1.2rem', fontWeight: 700, color: 'var(--muted)'}}>Resume Preview</h3>
            <p style={{fontSize: '0.9rem', color: 'var(--muted)', maxWidth: '300px', marginTop: '0.5rem'}}>
              Your CV will be generated and previewed here once the interview is complete.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
