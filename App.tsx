
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { processUserRequest, AgentResponse, transcribeAudio, analyzeImage, synthesizeSpeech } from './services/geminiService';
import { MockFinancialDashboard } from './components/MockFinancialDashboard';
import { AgentStatusPanel } from './components/AgentStatusPanel';
import { SafetyModal, TransactionPreview } from './components/SafetyModal';
import { ChatMessage, DashboardState, AgentType, ProcessingStep, SafetyStatus, AgentAction, BrowserResult, Transaction } from './types';
import { MOCK_TRANSACTIONS } from './constants';
import { detectNavigationTarget, AVAILABLE_PAGES } from './navigationMap';
import { BrowserAutomationEngine, AutomationAction } from './automationEngine';
import { AgentManager } from './services/agent';
import { LiveAudioAgent } from './components/LiveAudioAgent';
import { ImageGenerationModal } from './components/ImageGenerationModal';
import { AgentMode } from './components/AgentMode';

const INITIAL_DASHBOARD_STATE: DashboardState = {
  currentPage: 'overview',
  balance: 975124.00,
  transferForm: {
    recipient: '',
    amount: '',
    note: ''
  },
  transactions: MOCK_TRANSACTIONS,
  lastTransactionStatus: 'idle',
  uploadedFile: null
};

const App: React.FC = () => {
  // --- State ---
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: AgentType.MANAGER,
      content: "A.F.A.A. Online. I can see the screen, click elements, and navigate for you.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'IDLE' | 'PROCESSING' | 'WAITING_APPROVAL' | 'SAFE_MODE'>('IDLE');
  
  // Feature Toggles
  const [simpleMode, setSimpleMode] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false); // Gemini 3 Pro
  const [fastMode, setFastMode] = useState(false); // Gemini Flash Lite
  const [isRecording, setIsRecording] = useState(false);
  const [liveAgentActive, setLiveAgentActive] = useState(false);
  const [showImageGen, setShowImageGen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // TTS Toggle
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // UX Improvements: Manual Mode ON by default for immediate usability
  const [manualMode, setManualMode] = useState(true);
  const [formErrors, setFormErrors] = useState<{recipient?: string; amount?: string}>({});
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  
  const [dashboardState, setDashboardState] = useState<DashboardState>(INITIAL_DASHBOARD_STATE);
  const [agentSteps, setAgentSteps] = useState<ProcessingStep[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  
  const [pendingAction, setPendingAction] = useState<{ actions: AgentAction[], originalResponse: AgentResponse } | null>(null);
  const [transactionPreview, setTransactionPreview] = useState<TransactionPreview | undefined>(undefined);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  
  // Transaction Details Modal
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Mobile View State
  const [mobileTab, setMobileTab] = useState<'agent' | 'dashboard'>('dashboard');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Audio Recorder Ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // Audio Playback Context
  const audioContextRef = useRef<AudioContext | null>(null);

  // Automation Engine
  const automationEngine = useRef(new BrowserAutomationEngine());

  // Agent Mode Manager
  const agentManager = useMemo(() => new AgentManager(), []);

  // Connect engine to manager
  useEffect(() => {
    if (automationEngine.current) {
      agentManager.setAutomationEngine(automationEngine.current);
    }
  }, [agentManager]);

  // --- Automation Visualization Effects ---
  useEffect(() => {
    const handleActionStart = (e: CustomEvent<AutomationAction>) => {
      const action = e.detail;
      // Highlight based on selector or text logic
      if (action.selector) {
        setActiveHighlight(action.selector);
      } else if (action.elementText) {
        // Fallback simple highlight for text match
        setActiveHighlight(action.elementText); 
      }
      
      let initialPayload = undefined;
      // Provide an initial loading payload for BROWSE actions so the browser window appears immediately
      if (action.type === 'BROWSE' || action.type === 'READ_PAGE') {
         initialPayload = {
             url: action.url || 'about:blank',
             text: '',
             links: [],
             screenshot: undefined,
             timestamp: new Date().toISOString()
         };
      }
      
      addStep(AgentType.EXECUTOR, 'processing', `Executing: ${action.type}`, undefined, action.type, initialPayload);
    };

    const handleActionEnd = (e: CustomEvent<{action: AutomationAction, result: any}>) => {
      const { action, result } = e.detail;
      
      // Construct rich payload if available
      let payload = undefined;
      if ((action.type === 'BROWSE' || action.type === 'READ_PAGE' || action.type === 'SCREENSHOT')) {
         if (result.data || result.screenshot) {
             payload = {
                 url: action.url || result.data?.url || 'about:blank',
                 text: result.data?.text,
                 links: result.data?.links,
                 screenshot: result.screenshot,
                 timestamp: result.timestamp
             };
         }
      }

      updateLastStep({ 
          status: result.success ? 'completed' : 'waiting_approval',
          payload
      }); 
      
      setTimeout(() => {
        setActiveHighlight(null);
      }, 500);
    };

    window.addEventListener('agent-action-start', handleActionStart as EventListener);
    window.addEventListener('agent-action-success', handleActionEnd as EventListener);
    window.addEventListener('agent-action-fail', handleActionEnd as EventListener);

    return () => {
      window.removeEventListener('agent-action-start', handleActionStart as EventListener);
      window.removeEventListener('agent-action-success', handleActionEnd as EventListener);
      window.removeEventListener('agent-action-fail', handleActionEnd as EventListener);
    };
  }, []);

  // --- Effects ---
  useEffect(() => {
    if (mobileTab === 'agent') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, agentSteps, mobileTab]);

  // Handle Automation Navigation Events
  useEffect(() => {
    const handleAgentNavigate = (e: CustomEvent) => {
      const pageId = e.detail.page;
      const targetPage = AVAILABLE_PAGES.find(p => p.id === pageId || p.name === pageId || p.aliases.includes(pageId));
      
      if (targetPage) {
        setDashboardState(prev => ({
          ...prev,
          currentPage: targetPage.id as DashboardState['currentPage']
        }));
        
        if (window.innerWidth < 768) {
          setMobileTab('dashboard');
        }
      }
    };

    window.addEventListener('agent-navigate', handleAgentNavigate as EventListener);
    return () => window.removeEventListener('agent-navigate', handleAgentNavigate as EventListener);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        manualMode ? setDashboardState(prev => ({ ...prev, currentPage: 'transfer' })) : setInputValue("I want to make a transfer");
        if (!manualMode && window.innerWidth < 768) setMobileTab('agent');
        if (manualMode && window.innerWidth < 768) setMobileTab('dashboard');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setInputValue("Go to dashboard");
        if (window.innerWidth < 768) setMobileTab('agent');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        setManualMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manualMode]);

  // --- Form Handlers ---
  const validateForm = () => {
    const errors: {recipient?: string; amount?: string} = {};
    if (!dashboardState.transferForm.recipient.trim()) errors.recipient = 'Required';
    
    // ISSUE 40 & 43 FIX: Updated Regex to allow alphanumeric (0-9) and international characters (\u00C0-\u017F)
    const nameRegex = /^[a-zA-Z0-9\s\.\-'\u00C0-\u017F]+$/;
    if (dashboardState.transferForm.recipient.trim() && !nameRegex.test(dashboardState.transferForm.recipient)) {
        errors.recipient = 'Invalid characters in name';
    }

    // ISSUE 27: Amount Validation
    const amountStr = dashboardState.transferForm.amount.replace(/[^0-9.]/g, '');
    const amount = parseFloat(amountStr);
    
    if (!dashboardState.transferForm.amount.trim() || isNaN(amount)) {
        errors.amount = 'Invalid amount';
    } else if (amount <= 0) {
        errors.amount = 'Amount must be positive';
    } else if (amount > 1000000) {
        errors.amount = 'Limit exceeded ($1M)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormFieldChange = (field: 'recipient' | 'amount' | 'note', value: string) => {
    if (field === 'amount') {
      // ISSUE 32: Strict Decimal Precision & ISSUE 35: Negative Handling
      
      // 1. Allow only numbers and dots
      let cleaned = value.replace(/[^0-9.]/g, '');
      
      // 2. Prevent multiple dots
      const dots = cleaned.match(/\./g);
      if (dots && dots.length > 1) {
          return; // Ignore input if second dot
      }

      // 3. Limit to 2 decimal places
      if (cleaned.includes('.')) {
          const [int, dec] = cleaned.split('.');
          if (dec.length > 2) {
              cleaned = `${int}.${dec.slice(0, 2)}`;
          }
      }

      // 4. Limit absolute max value
      if (parseFloat(cleaned) > 1000000) cleaned = "1000000";
      
      setDashboardState(prev => ({ ...prev, transferForm: { ...prev.transferForm, amount: cleaned } }));
    } else {
      setDashboardState(prev => ({ ...prev, transferForm: { ...prev.transferForm, [field]: value } }));
    }
    
    if (formErrors[field as keyof typeof formErrors]) setFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleManualTransferSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmittingTransfer(true);
    await delay(1500); // Simulated network request
    
    const amount = parseFloat(dashboardState.transferForm.amount);
    
    // ISSUE 33 & 44: Date Format Consistency
    // Use 'en-US' with short month to match MOCK_TRANSACTIONS (e.g., "Oct 24")
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const newTx: Transaction = { 
        id: Date.now().toString(), 
        description: dashboardState.transferForm.recipient, 
        amount, 
        date: dateStr, 
        type: 'debit', 
        category: dashboardState.transferForm.note || 'Transfer' 
    };

    setDashboardState(prev => ({
      ...prev,
      balance: prev.balance - amount,
      lastTransactionStatus: 'success',
      transferForm: { recipient: '', amount: '', note: '' },
      transactions: [newTx, ...prev.transactions]
    }));
    
    // ISSUE 45: Success message persistence and detail
    // Added time to the success message to provide better context
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const successMsg = `Transfer of $${amount.toFixed(2)} to ${newTx.description} successful at ${timeStr}.`;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: AgentType.MANAGER, content: successMsg, timestamp: new Date() }]);
    
    // Auto-Speak success message if voice enabled
    if (voiceEnabled) {
       await playTts(successMsg);
    }

    setIsSubmittingTransfer(false);
  };

  const handleManualNavigation = (page: DashboardState['currentPage']) => {
    setDashboardState(prev => ({ ...prev, currentPage: page }));
  };

  const handleFileUpload = async (file: File) => {
    setDashboardState(prev => ({ ...prev, uploadedFile: file }));
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: AgentType.USER, content: `Uploaded ${file.name}`, timestamp: new Date() }]);
    
    // Auto-analyze using Gemini 3 Pro Vision
    setIsProcessing(true);
    setSystemStatus('PROCESSING');
    addStep(AgentType.INTERPRETER, 'processing', `Analyzing ${file.name}...`);
    
    try {
       const analysis = await analyzeImage(file);
       setMessages(prev => [...prev, { id: Date.now().toString(), sender: AgentType.INTERPRETER, content: analysis, timestamp: new Date() }]);
       updateLastStep({ status: 'completed' });
       if (voiceEnabled) await playTts(analysis.substring(0, 150) + "..."); // Speak summary
    } catch (e) {
       console.error(e);
       updateLastStep({ status: 'completed' });
       setMessages(prev => [...prev, { id: Date.now().toString(), sender: AgentType.INTERPRETER, content: "Failed to analyze image.", timestamp: new Date() }]);
    }
    
    setIsProcessing(false);
    setSystemStatus('IDLE');
    if (window.innerWidth < 768) setMobileTab('agent');
  };

  // --- Audio Logic ---
  
  // Helper to play raw PCM from Gemini TTS
  const playRawAudio = async (base64String: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const binaryString = atob(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM to float
      const int16Data = new Int16Array(bytes.buffer);
      const floatData = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        floatData[i] = int16Data[i] / 32768.0;
      }

      const buffer = ctx.createBuffer(1, floatData.length, 24000);
      buffer.getChannelData(0).set(floatData);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      setIsPlayingAudio(true);
      source.onended = () => setIsPlayingAudio(false);
      source.start();
    } catch (e) {
      console.error("Audio playback error", e);
      setIsPlayingAudio(false);
    }
  };

  const playTts = async (text: string) => {
    setIsPlayingAudio(true);
    const audioData = await synthesizeSpeech(text);
    if (audioData) {
      await playRawAudio(audioData);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
         if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      recorder.onstop = async () => {
         const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
         const reader = new FileReader();
         reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            setIsProcessing(true);
            const text = await transcribeAudio(base64);
            setInputValue(prev => prev + (prev ? ' ' : '') + text);
            setIsProcessing(false);
         };
         reader.readAsDataURL(blob);
         
         stream.getTracks().forEach(t => t.stop());
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Mic error", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
       mediaRecorderRef.current.stop();
       setIsRecording(false);
    }
  };

  const handleSendMessage = async (overrideContent?: string) => {
    const content = overrideContent || inputValue;
    if (!content.trim() || isProcessing) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: AgentType.USER, content: content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);
    setSystemStatus('PROCESSING');
    setAgentSteps([]);

    addStep(AgentType.MANAGER, 'processing', 'Analyzing user request...');
    
    try {
      const response = await processUserRequest(
        userMsg.content, 
        dashboardState, 
        { 
          simpleMode, 
          useThinking: thinkingMode, 
          useLite: fastMode,
          useSearch: true
        }
      );
      updateLastStep({ status: 'completed' });

      if (response.safety === SafetyStatus.REQUIRE_CONFIRMATION) {
        setTransactionPreview(extractTransactionDetails(response.actions, dashboardState));
        setSystemStatus('WAITING_APPROVAL');
        setPendingAction({ actions: response.actions, originalResponse: response });
        setShowSafetyModal(true);
        setIsProcessing(false);
        // Announce safety check if voice on
        if (voiceEnabled) await playTts("Safety check required. Please confirm this transaction.");
        return;
      }

      await executeActionSequence(response.actions);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: AgentType.MANAGER,
        content: response.message,
        timestamp: new Date()
      }]);

      // TTS: Speak the agent's response
      if (voiceEnabled) {
         await playTts(response.message);
      }

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          sender: AgentType.MANAGER, 
          content: `I encountered an issue processing that request. (${err.message || 'Unknown error'})`, 
          timestamp: new Date() 
      }]);
      updateLastStep({ status: 'failed', description: 'Process failed' });
    } finally {
      if (!showSafetyModal) {
        setIsProcessing(false);
        setIsScanning(false);
        setActiveHighlight(null);
        setSystemStatus('IDLE');
      }
    }
  };

  const handleManualAction = async (action: AgentAction) => {
      setIsProcessing(true);
      await executeActionSequence([action]);
      setIsProcessing(false);
  };

  const executeActionSequence = async (actions: AgentAction[]) => {
    if (!actions || !Array.isArray(actions)) return;
    setSystemStatus('PROCESSING');

    for (const action of actions) {
      const confidence = action.confidence || 95;
      
      const automationActions = ['SCREENSHOT', 'READ_PAGE', 'SCROLL', 'WAIT', 'VERIFY', 'HOVER', 'GET_ELEMENT_VALUE', 'WAIT_FOR_SELECTOR', 'BROWSE'];
      
      if (automationActions.includes(action.type)) {
        addStep(AgentType.INTERPRETER, 'processing', `Executing ${action.type}...`, confidence, action.type);
        const report = await automationEngine.current.executeActions([action as any]);
        
        // Update payload if browse data exists
        const result = report.results[0];
        let payload = undefined;
        if (action.type === 'BROWSE' && result?.success && result.data) {
             payload = {
                 url: action.url || result.data?.url || 'about:blank',
                 text: result.data?.text,
                 links: result.data?.links,
                 screenshot: result.screenshot,
                 timestamp: result.timestamp
             };
        }

        updateLastStep({ 
           status: 'completed', 
           payload
        });
        
        await delay(500);
        continue;
      }

      switch (action.type) {
        case 'NAVIGATE':
          let rawTarget = (action.page || action.target || action.url || '').toString().toLowerCase().trim();
          const detected = detectNavigationTarget(rawTarget || action.description || '');
          let targetPageId = detected ? detected.id : rawTarget || 'overview';
          
          addStep(AgentType.EXECUTOR, 'processing', `Navigating to ${targetPageId}...`, confidence, 'NAVIGATE');
          await automationEngine.current.executeActions([{ type: 'NAVIGATE', page: targetPageId, url: action.url }]);
          updateLastStep({ status: 'completed' });
          break;

        case 'FILL_INPUT':
          addStep(AgentType.EXECUTOR, 'processing', `Typing "${action.value}" into ${action.target}...`, confidence, 'FILL_INPUT');
          
          let selector = '';
          if (action.target?.includes('recipient')) selector = 'input[placeholder*="Search"]';
          if (action.target?.includes('amount')) selector = 'input[placeholder*="0.00"]';
          
          if (selector) {
             await automationEngine.current.executeActions([{ type: 'FILL_INPUT', selector: selector, value: action.value }]);
          } else {
             setDashboardState(prev => {
              const field = action.target?.toLowerCase() || '';
              const newState = { ...prev.transferForm };
              if (field.includes('recipient')) newState.recipient = action.value || '';
              if (field.includes('amount')) newState.amount = action.value || '';
              if (field.includes('note')) newState.note = action.value || '';
              return { ...prev, transferForm: newState };
            });
          }
          updateLastStep({ status: 'completed' });
          break;

        case 'CLICK':
           addStep(AgentType.EXECUTOR, 'processing', `Clicking ${action.target}...`, confidence, 'CLICK');
           if (action.target?.toLowerCase().includes('submit')) {
             await automationEngine.current.executeActions([{ type: 'CLICK', selector: 'button[type="submit"]' }]);
           }
           updateLastStep({ status: 'completed' });
           break;

        case 'ANALYZE_CHART':
          setIsScanning(true);
          addStep(AgentType.INTERPRETER, 'processing', 'Scanning analytics...', confidence, 'ANALYZE_CHART');
          await delay(2000);
          updateLastStep({ status: 'completed' });
          setIsScanning(false);
          break;
      }
      await delay(500);
      setActiveHighlight(null);
    }
  };

  const extractTransactionDetails = (actions: AgentAction[], currentState: DashboardState): TransactionPreview => {
    let amount = '0';
    let to = 'Unknown';
    actions.forEach(a => {
      if (a.type === 'FILL_INPUT' && a.value) {
        if (a.target?.includes('amount')) amount = a.value;
        if (a.target?.includes('recipient')) to = a.value;
      }
    });
    if (amount === '0') amount = currentState.transferForm.amount || '0';
    if (to === 'Unknown') to = currentState.transferForm.recipient || 'Unknown';
    return { from: 'Main Account', to, amount, newBalance: (currentState.balance - parseFloat(amount)).toFixed(2) };
  };

  const handleSafetyConfirm = async () => {
    setShowSafetyModal(false);
    if (pendingAction) {
      setIsProcessing(true);
      setSystemStatus('PROCESSING');
      try {
        await executeActionSequence(pendingAction.actions);
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: AgentType.MANAGER, content: pendingAction.originalResponse.message, timestamp: new Date() }]);
        if (voiceEnabled) await playTts(pendingAction.originalResponse.message);
      } catch (err) {
        console.error("Execute error", err);
      } finally {
        setPendingAction(null);
        setIsProcessing(false);
        setSystemStatus('IDLE');
      }
    }
  };

  const handleSafetyDeny = () => {
    setShowSafetyModal(false);
    setPendingAction(null);
    setSystemStatus('IDLE');
    setIsProcessing(false);
    const cancelMsg = "Transaction cancelled by user.";
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: AgentType.MANAGER, content: cancelMsg, timestamp: new Date() }]);
    if (voiceEnabled) playTts(cancelMsg);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
  const addStep = (agent: AgentType, status: ProcessingStep['status'], description: string, confidence?: number, actionType?: string, payload?: BrowserResult | null) => {
    setAgentSteps(prev => [...prev, { agent, status, description, confidence, actionType, payload }]);
  };
  const updateLastStep = (updates: Partial<ProcessingStep>) => {
    setAgentSteps(prev => { 
        if (!prev.length) return prev;
        const n = [...prev]; 
        n[n.length-1] = { ...n[n.length-1], ...updates }; 
        return n; 
    });
  };
  const getStatusColor = (s: string) => s === 'PROCESSING' ? 'text-brand-cyan' : s === 'WAITING_APPROVAL' ? 'text-brand-orange' : 'text-brand-mint';

  return (
    <div className="flex h-[100dvh] w-screen bg-brand-dark overflow-hidden font-sans text-slate-200 flex-col md:flex-row relative">
      <div className="sr-only" role="status" aria-live="polite" ref={liveRegionRef}></div>

      {liveAgentActive && <LiveAudioAgent onClose={() => setLiveAgentActive(false)} />}
      {showImageGen && <ImageGenerationModal onClose={() => setShowImageGen(false)} />}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#1C1C21] border border-[#333] rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
               <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-white">Transaction Details</h3>
                  <button onClick={() => setSelectedTransaction(null)} className="text-slate-500 hover:text-white p-2">✕</button>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-center my-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${selectedTransaction.type === 'credit' ? 'bg-[#1E3A2F] text-[#00D084]' : 'bg-[#2A2A30] text-slate-400'}`}>
                         {selectedTransaction.type === 'credit' ? '↓' : '↑'}
                      </div>
                  </div>
                  <div className="text-center mb-6">
                      <div className="text-2xl font-bold text-white">${selectedTransaction.amount.toFixed(2)}</div>
                      <div className="text-sm text-slate-400">{selectedTransaction.description}</div>
                  </div>
                  <div className="bg-[#151518] rounded-xl p-3 space-y-2 text-sm border border-[#25252b]">
                     <div className="flex justify-between"><span className="text-slate-500">Date</span> <span>{selectedTransaction.date}</span></div>
                     <div className="flex justify-between"><span className="text-slate-500">Category</span> <span>{selectedTransaction.category}</span></div>
                     <div className="flex justify-between"><span className="text-slate-500">ID</span> <span className="font-mono text-xs">{selectedTransaction.id}</span></div>
                  </div>
                  <button onClick={() => setSelectedTransaction(null)} className="w-full py-3 bg-[#25252b] hover:bg-[#333] rounded-xl font-bold text-sm transition-colors focus:ring-2 focus:ring-brand-lime">Close</button>
               </div>
            </div>
         </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1C1C21] border-t border-[#25252b] z-[60] flex items-center justify-around pb-1 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
         <button onClick={() => setMobileTab('agent')} className={`flex flex-col items-center justify-center gap-1 w-full h-full ${mobileTab === 'agent' ? 'text-brand-cyan' : 'text-slate-500'}`}>
           <span className="text-[10px] font-bold uppercase tracking-wider">Agent</span>
         </button>
         <button onClick={() => setMobileTab('dashboard')} className={`flex flex-col items-center justify-center gap-1 w-full h-full ${mobileTab === 'dashboard' ? 'text-brand-lime' : 'text-slate-500'}`}>
           <span className="text-[10px] font-bold uppercase tracking-wider">Dashboard</span>
         </button>
      </div>

      {/* LEFT PANEL (AGENT) */}
      <div className={`
        w-full md:w-1/3 md:min-w-[400px] border-r border-[#25252b] flex-col bg-brand-dark z-10 relative transition-all duration-300
        ${mobileTab === 'agent' ? 'flex h-[calc(100dvh-64px)] md:h-full' : 'hidden md:flex'}
      `}>
        <div className="p-5 border-b border-[#25252b] bg-brand-dark/95 flex flex-col gap-3 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tighter flex items-center gap-2"><span className="text-brand-cyan">A.F.A.A.</span></h1>
            </div>
            <div className="flex items-center gap-2">
               <button 
                 onClick={() => setLiveAgentActive(true)}
                 className="p-2 rounded-full bg-brand-lime/10 text-brand-lime hover:bg-brand-lime hover:text-black transition-all border border-brand-lime/30 focus:outline-none focus:ring-2 focus:ring-brand-lime"
                 title="Open Live Voice Agent"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
               </button>
               <div className="flex items-center gap-3 bg-[#1C1C21] border border-[#25252b] rounded-full px-3 py-1.5 shadow-inner">
                  <div className={`w-2.5 h-2.5 rounded-full ${systemStatus === 'PROCESSING' ? 'bg-brand-cyan animate-pulse' : systemStatus === 'WAITING_APPROVAL' ? 'bg-brand-orange animate-pulse' : 'bg-brand-mint'}`}></div>
                  <span className={`text-[10px] font-bold tracking-widest ${getStatusColor(systemStatus)}`}>{systemStatus.replace('_', ' ')}</span>
               </div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
            <div className="flex gap-2">
               <button onClick={() => setThinkingMode(!thinkingMode)} className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${thinkingMode ? 'bg-brand-purple text-white border-brand-purple shadow-[0_0_10px_rgba(139,92,246,0.3)]' : 'bg-[#1C1C21] text-slate-500 border-[#25252b]'}`}>🧠 DEEP THINK</button>
               <button onClick={() => setFastMode(!fastMode)} className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${fastMode ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-[#1C1C21] text-slate-500 border-[#25252b]'}`}>⚡ FAST</button>
               <button onClick={() => setShowImageGen(true)} className={`px-2 py-1 rounded text-[10px] font-bold border bg-[#1C1C21] text-slate-500 border-[#25252b] hover:text-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-purple`}>🎨 STUDIO</button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 border-b border-[#25252b] bg-[#0F0F12]">
          <AgentStatusPanel steps={agentSteps} />
        </div>

        <div className="h-[45%] flex flex-col bg-brand-dark shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === AgentType.USER ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.3s_ease-out]`}>
                  <div className={`max-w-[85%] p-3.5 rounded-xl text-sm leading-relaxed shadow-sm ${msg.sender === AgentType.USER ? 'bg-[#25252b] text-slate-200' : 'bg-brand-cyan/5 text-brand-cyan border border-brand-cyan/20'}`}>
                    {msg.content}
                    {msg.metadata?.screenshots?.map((src, i) => (
                      <img key={i} src={src} alt="Screen capture" className="mt-2 rounded border border-brand-cyan/30 max-h-32" />
                    ))}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
           </div>
           {!manualMode && (
             <div className="p-4 border-t border-[#25252b] bg-[#0F0F12]">
               <div className="flex gap-2 relative">
                 <button 
                   onClick={() => setVoiceEnabled(!voiceEnabled)}
                   className={`p-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-brand-lime ${voiceEnabled ? (isPlayingAudio ? 'bg-brand-mint text-black border-brand-mint' : 'bg-brand-lime/20 text-brand-lime border-brand-lime') : 'bg-[#1C1C21] text-slate-400 border-[#25252b] hover:text-white'}`}
                   title="Toggle Voice Output"
                 >
                    {isPlayingAudio ? (
                        <div className="flex gap-0.5 items-center h-5">
                            <div className="w-1 h-3 bg-current animate-pulse"></div>
                            <div className="w-1 h-5 bg-current animate-pulse delay-75"></div>
                            <div className="w-1 h-2 bg-current animate-pulse delay-150"></div>
                        </div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    )}
                 </button>
                 <button 
                   onMouseDown={startRecording}
                   onMouseUp={stopRecording}
                   onTouchStart={startRecording}
                   onTouchEnd={stopRecording}
                   className={`p-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-brand-lime ${isRecording ? 'bg-red-500/20 text-red-500 border-red-500 animate-pulse' : 'bg-[#1C1C21] text-slate-400 border-[#25252b] hover:text-white'}`}
                   title="Hold to Speak"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                 </button>
                 <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type commands..." className="flex-1 bg-[#1C1C21] border border-[#25252b] text-slate-200 rounded-lg p-3 text-sm focus:border-brand-cyan focus:outline-none" disabled={isProcessing} />
                 <button onClick={() => handleSendMessage()} disabled={isProcessing} className="bg-brand-cyan hover:bg-cyan-400 text-slate-900 px-5 py-2 rounded-lg text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-brand-cyan">{isProcessing ? '...' : 'SEND'}</button>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* RIGHT PANEL (DASHBOARD) */}
      <div className={`
        flex-1 bg-brand-dark flex-col relative transition-all duration-300
        ${mobileTab === 'dashboard' ? 'flex h-[calc(100dvh-64px)] md:h-full' : 'hidden md:flex'}
      `} aria-hidden={isScanning}>
        <div className="bg-[#1C1C21] p-2 flex items-center gap-3 text-xs text-slate-400 border-b border-[#25252b]">
           <div className="flex gap-1.5 ml-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div><div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div></div>
           <div className="bg-[#0F0F12] px-4 py-1.5 rounded flex-1 text-center font-mono opacity-60 truncate border border-[#25252b] text-[10px]">https://portal.darlene.demo/dashboard/{dashboardState.currentPage}</div>
           <div className="flex items-center gap-2">
             <button 
                onClick={() => setManualMode(!manualMode)} 
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${manualMode ? 'bg-brand-lime text-black' : 'bg-[#25252b] text-slate-500 hover:text-white'}`}
             >
                {manualMode ? 'MANUAL: ON' : 'MANUAL: OFF'}
             </button>
             <button onClick={() => setShowImageGen(true)} className="px-2 py-0.5 rounded bg-brand-purple/20 text-brand-purple text-[10px] font-bold hover:bg-brand-purple hover:text-white transition-colors">NEW DESIGN</button>
           </div>
        </div>
        <div className="flex-1 relative overflow-hidden">
           {dashboardState.currentPage === 'agent-mode' ? (
              <div className="w-full h-full relative" role="main" aria-label="Agent Mode Interface">
                <AgentMode 
                  agentManager={agentManager} 
                  onExit={() => handleManualNavigation('overview')}
                  steps={agentSteps}
                  onSendMessage={handleSendMessage}
                  onManualAction={handleManualAction}
                />
              </div>
           ) : (
              <MockFinancialDashboard 
                state={dashboardState} 
                scanning={isScanning} 
                highlightTarget={activeHighlight} 
                onFileUpload={handleFileUpload} 
                onNavigate={handleManualNavigation} 
                manualMode={manualMode} 
                onFormFieldChange={handleFormFieldChange} 
                onTransferSubmit={handleManualTransferSubmit} 
                formErrors={formErrors} 
                isSubmittingTransfer={isSubmittingTransfer}
                agentSteps={agentSteps}
                onSendMessage={handleSendMessage}
                onManualAction={handleManualAction}
                onTransactionClick={setSelectedTransaction}
              />
           )}
        </div>
      </div>

      <SafetyModal isOpen={showSafetyModal} transactionDetails={transactionPreview} onConfirm={handleSafetyConfirm} onCancel={handleSafetyDeny} />
    </div>
  );
};

export default App;
