
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { processUserRequest, AgentResponse } from './services/geminiService';
import { MockFinancialDashboard } from './components/MockFinancialDashboard';
import { AgentStatusPanel } from './components/AgentStatusPanel';
import { SafetyModal, TransactionPreview } from './components/SafetyModal';
import { ChatMessage, DashboardState, AgentType, ProcessingStep, SafetyStatus, AgentAction } from './types';
import { MOCK_TRANSACTIONS } from './constants';
import { detectNavigationTarget, AVAILABLE_PAGES } from './navigationMap';
import { BrowserAutomationEngine, AutomationAction } from './automationEngine';
import { AgentManager } from './services/agent';

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
      content: "A.F.A.A. Online with Browser Automation. I can see the screen, click elements, and navigate for you.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'IDLE' | 'PROCESSING' | 'WAITING_APPROVAL' | 'SAFE_MODE'>('IDLE');
  const [simpleMode, setSimpleMode] = useState(false);
  
  const [manualMode, setManualMode] = useState(false);
  const [formErrors, setFormErrors] = useState<{recipient?: string; amount?: string}>({});
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  
  const [dashboardState, setDashboardState] = useState<DashboardState>(INITIAL_DASHBOARD_STATE);
  const [agentSteps, setAgentSteps] = useState<ProcessingStep[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  
  const [pendingAction, setPendingAction] = useState<{ actions: AgentAction[], originalResponse: AgentResponse } | null>(null);
  const [transactionPreview, setTransactionPreview] = useState<TransactionPreview | undefined>(undefined);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
      
      addStep(AgentType.EXECUTOR, 'processing', `Executing: ${action.type}`);
    };

    const handleActionEnd = (e: CustomEvent<{action: AutomationAction, result: any}>) => {
      const { action, result } = e.detail;
      updateLastStepStatus(result.success ? 'completed' : 'waiting_approval'); // Use waiting_approval color for fail for visibility
      
      // Keep highlight briefly to show success/fail
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentSteps]);

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
        console.log(`[App] Agent triggered navigation to ${targetPage.displayName}`);
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
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setInputValue("Go to dashboard");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        setManualMode(!manualMode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manualMode]);

  // --- Form Handlers ---
  const validateForm = () => {
    const errors: {recipient?: string; amount?: string} = {};
    if (!dashboardState.transferForm.recipient.trim()) errors.recipient = 'Required';
    const amount = parseFloat(dashboardState.transferForm.amount.replace(/[^0-9.]/g, ''));
    if (!dashboardState.transferForm.amount.trim() || isNaN(amount)) errors.amount = 'Invalid amount';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormFieldChange = (field: 'recipient' | 'amount' | 'note', value: string) => {
    if (field === 'amount') {
      const numeric = value.replace(/[^0-9.]/g, '');
      const parts = numeric.split('.');
      value = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numeric;
    }
    setDashboardState(prev => ({ ...prev, transferForm: { ...prev.transferForm, [field]: value } }));
    if (formErrors[field as keyof typeof formErrors]) setFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleManualTransferSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmittingTransfer(true);
    await delay(2000);
    const amount = parseFloat(dashboardState.transferForm.amount);
    setDashboardState(prev => ({
      ...prev,
      balance: prev.balance - amount,
      lastTransactionStatus: 'success',
      transferForm: { recipient: '', amount: '', note: '' },
      transactions: [{ id: Date.now().toString(), description: prev.transferForm.recipient, amount, date: new Date().toLocaleDateString(), type: 'debit', category: 'Transfer' }, ...prev.transactions]
    }));
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: AgentType.MANAGER, content: "Transfer completed successfully.", timestamp: new Date() }]);
    setIsSubmittingTransfer(false);
  };

  const handleManualNavigation = (page: DashboardState['currentPage']) => {
    setDashboardState(prev => ({ ...prev, currentPage: page }));
  };

  const handleFileUpload = (file: File) => {
    setDashboardState(prev => ({ ...prev, uploadedFile: file }));
    setInputValue("Analyze this uploaded document");
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: AgentType.USER, content: inputValue, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);
    setSystemStatus('PROCESSING');
    setAgentSteps([]);

    addStep(AgentType.MANAGER, 'processing', 'Analyzing user request...');
    
    try {
      const response = await processUserRequest(userMsg.content, dashboardState, { simpleMode });
      updateLastStepStatus('completed');

      if (response.safety === SafetyStatus.REQUIRE_CONFIRMATION) {
        setTransactionPreview(extractTransactionDetails(response.actions, dashboardState));
        setSystemStatus('WAITING_APPROVAL');
        setPendingAction({ actions: response.actions, originalResponse: response });
        setShowSafetyModal(true);
        setIsProcessing(false);
        return;
      }

      await executeActionSequence(response.actions);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: AgentType.MANAGER,
        content: response.message,
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: AgentType.MANAGER, content: "Error coordinating agents.", timestamp: new Date() }]);
    } finally {
      if (!showSafetyModal) {
        setIsProcessing(false);
        setIsScanning(false);
        setActiveHighlight(null);
        setSystemStatus('IDLE');
      }
    }
  };

  const executeActionSequence = async (actions: AgentAction[]) => {
    if (!actions || !Array.isArray(actions)) return;
    setSystemStatus('PROCESSING');

    for (const action of actions) {
      const confidence = action.confidence || 95;
      
      // LEGACY: Delegate pure automation actions to the Engine via legacy path if needed
      // New Agent Mode uses AgentManager -> AutomationEngine directly.
      // This path is for the "Chat" interface usage.
      
      const automationActions = ['SCREENSHOT', 'READ_PAGE', 'SCROLL', 'WAIT', 'VERIFY', 'HOVER', 'GET_ELEMENT_VALUE', 'WAIT_FOR_SELECTOR'];
      
      if (automationActions.includes(action.type)) {
        // ... (legacy logic kept for compatibility with chat interface)
        addStep(AgentType.INTERPRETER, 'processing', `Executing ${action.type}...`, confidence);
        const report = await automationEngine.current.executeActions([action as any]);
        
        if (report.results[0]?.screenshot) {
           setMessages(prev => [...prev, {
             id: Date.now().toString(),
             sender: AgentType.INTERPRETER,
             content: "I've captured a screenshot of the current view for analysis.",
             timestamp: new Date()
           }]);
        }
        updateLastStepStatus('completed');
        await delay(500);
        continue;
      }

      switch (action.type) {
        case 'NAVIGATE':
          // Enhanced logic using detecting
          let targetPageId = action.page?.toLowerCase() || action.target?.toLowerCase() || '';
          if (!targetPageId) {
             const detected = detectNavigationTarget(action.description || '');
             targetPageId = detected?.id || 'overview';
          }
          
          addStep(AgentType.EXECUTOR, 'processing', `Navigating to ${targetPageId}...`, confidence);
          await automationEngine.current.executeActions([{
            type: 'NAVIGATE',
            page: targetPageId
          }]);
          updateLastStepStatus('completed');
          break;

        case 'FILL_INPUT':
          addStep(AgentType.EXECUTOR, 'processing', `Typing "${action.value}" into ${action.target}...`, confidence);
          
          let selector = '';
          if (action.target?.includes('recipient')) selector = 'input[placeholder*="Search"]';
          if (action.target?.includes('amount')) selector = 'input[placeholder*="0.00"]';
          
          if (selector) {
             await automationEngine.current.executeActions([{
                type: 'FILL_INPUT',
                selector: selector,
                value: action.value
             }]);
          } else {
             // Fallback
             setDashboardState(prev => {
              const field = action.target?.toLowerCase() || '';
              const newState = { ...prev.transferForm };
              if (field.includes('recipient')) newState.recipient = action.value || '';
              if (field.includes('amount')) newState.amount = action.value || '';
              if (field.includes('note')) newState.note = action.value || '';
              return { ...prev, transferForm: newState };
            });
          }
          updateLastStepStatus('completed');
          break;

        case 'CLICK':
           addStep(AgentType.EXECUTOR, 'processing', `Clicking ${action.target}...`, confidence);
           if (action.target?.toLowerCase().includes('submit')) {
             await automationEngine.current.executeActions([{
               type: 'CLICK',
               selector: 'button[type="submit"]'
             }]);
           }
           updateLastStepStatus('completed');
           break;

        case 'ANALYZE_CHART':
          setIsScanning(true);
          addStep(AgentType.INTERPRETER, 'processing', 'Scanning analytics...', confidence);
          await delay(2000);
          updateLastStepStatus('completed');
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
      await executeActionSequence(pendingAction.actions);
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: AgentType.MANAGER, content: pendingAction.originalResponse.message, timestamp: new Date() }]);
      setPendingAction(null);
      setIsProcessing(false);
      setSystemStatus('IDLE');
    }
  };

  const handleSafetyDeny = () => {
    setShowSafetyModal(false);
    setPendingAction(null);
    setSystemStatus('IDLE');
    setIsProcessing(false);
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: AgentType.MANAGER, content: "Cancelled.", timestamp: new Date() }]);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
  const addStep = (agent: AgentType, status: ProcessingStep['status'], description: string, confidence?: number) => {
    setAgentSteps(prev => [...prev, { agent, status, description, confidence }]);
  };
  const updateLastStepStatus = (status: ProcessingStep['status']) => {
    setAgentSteps(prev => { const n = [...prev]; if(n.length) n[n.length-1].status = status; return n; });
  };
  const getStatusColor = (s: string) => s === 'PROCESSING' ? 'text-brand-cyan' : s === 'WAITING_APPROVAL' ? 'text-brand-orange' : 'text-brand-mint';

  return (
    <div className="flex h-screen w-screen bg-brand-dark overflow-hidden font-sans text-slate-200">
      <div className="sr-only" role="status" aria-live="polite" ref={liveRegionRef}></div>

      {/* LEFT PANEL */}
      <div className="w-1/3 min-w-[400px] border-r border-[#25252b] flex flex-col bg-brand-dark z-10 relative">
        <div className="p-5 border-b border-[#25252b] bg-brand-dark/95 flex flex-col gap-3 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tighter flex items-center gap-2"><span className="text-brand-cyan">A.F.A.A.</span></h1>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Autonomous Financial Agent</span>
            </div>
            <div className="flex items-center gap-3 bg-[#1C1C21] border border-[#25252b] rounded-full px-3 py-1.5 shadow-inner">
               <div className={`w-2.5 h-2.5 rounded-full ${systemStatus === 'PROCESSING' ? 'bg-brand-cyan animate-pulse' : systemStatus === 'WAITING_APPROVAL' ? 'bg-brand-orange animate-pulse' : 'bg-brand-mint'}`}></div>
               <span className={`text-[10px] font-bold tracking-widest ${getStatusColor(systemStatus)}`}>{systemStatus.replace('_', ' ')}</span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
              <span className="bg-[#1C1C21] px-1.5 py-0.5 rounded border border-[#25252b]">Ctrl+T Transfer</span>
              <span className="bg-[#1C1C21] px-1.5 py-0.5 rounded border border-[#25252b]">Ctrl+D Dashboard</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setManualMode(!manualMode)} className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${manualMode ? 'bg-brand-lime/20 border-brand-lime text-brand-lime' : 'bg-[#1C1C21] border-[#25252b] text-slate-500'}`}>MANUAL</button>
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
                 <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type commands..." className="flex-1 bg-[#1C1C21] border border-[#25252b] text-slate-200 rounded-lg p-3 text-sm focus:border-brand-cyan focus:outline-none" disabled={isProcessing} />
                 <button onClick={handleSendMessage} disabled={isProcessing} className="bg-brand-cyan hover:bg-cyan-400 text-slate-900 px-5 py-2 rounded-lg text-sm font-bold transition-all">{isProcessing ? '...' : 'SEND'}</button>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 bg-brand-dark flex flex-col relative" aria-hidden={isScanning}>
        <div className="bg-[#1C1C21] p-2 flex items-center gap-3 text-xs text-slate-400 border-b border-[#25252b]">
           <div className="flex gap-1.5 ml-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div><div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div></div>
           <div className="bg-[#0F0F12] px-4 py-1.5 rounded flex-1 text-center font-mono opacity-60 truncate border border-[#25252b] text-[10px]">https://portal.darlene.demo/dashboard/{dashboardState.currentPage}</div>
        </div>
        <div className="flex-1 relative overflow-hidden">
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
            agentManager={agentManager}
          />
        </div>
      </div>

      <SafetyModal isOpen={showSafetyModal} transactionDetails={transactionPreview} onConfirm={handleSafetyConfirm} onCancel={handleSafetyDeny} />
    </div>
  );
};

export default App;
