import React, { useState, useEffect, useRef } from 'react';
import { processUserRequest, AgentResponse } from './services/geminiService';
import { MockFinancialDashboard } from './components/MockFinancialDashboard';
import { AgentStatusPanel } from './components/AgentStatusPanel';
import { SafetyModal, TransactionPreview } from './components/SafetyModal';
import { ChatMessage, DashboardState, AgentType, ProcessingStep, SafetyStatus, AgentAction } from './types';
import { MOCK_TRANSACTIONS } from './constants';

const INITIAL_DASHBOARD_STATE: DashboardState = {
  currentPage: 'overview',
  balance: 975124.00, // Updated to match Darlene Robertson mockup
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
      content: "A.F.A.A. Online. I am connected to Darlene's interface. I can see unlabeled forms and complex charts. Try 'Check my insights' or use Ctrl+T to transfer.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'IDLE' | 'PROCESSING' | 'WAITING_APPROVAL' | 'SAFE_MODE'>('IDLE');
  const [simpleMode, setSimpleMode] = useState(false);
  
  // Simulation State
  const [dashboardState, setDashboardState] = useState<DashboardState>(INITIAL_DASHBOARD_STATE);
  const [agentSteps, setAgentSteps] = useState<ProcessingStep[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  
  // Safety State
  const [pendingAction, setPendingAction] = useState<{ actions: AgentAction[], originalResponse: AgentResponse } | null>(null);
  const [transactionPreview, setTransactionPreview] = useState<TransactionPreview | undefined>(undefined);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentSteps]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+T: Transfer shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setInputValue("I want to make a transfer");
        inputRef.current?.focus();
      }
      // Ctrl+B: Balance shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setInputValue("Check my balance");
        inputRef.current?.focus();
      }
      // Ctrl+H: History/Transactions shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setInputValue("Show my insights history");
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Handlers ---

  const handleManualNavigation = (page: DashboardState['currentPage']) => {
    setDashboardState(prev => ({ ...prev, currentPage: page }));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: AgentType.USER,
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);
    setSystemStatus('PROCESSING');
    setAgentSteps([]); // Clear previous steps

    // 1. Manager Plans
    addStep(AgentType.MANAGER, 'processing', 'Analyzing user request...');
    
    try {
      const response = await processUserRequest(userMsg.content, dashboardState, { simpleMode });
      
      updateLastStepStatus('completed');
      
      // 2. Display Thought Process
      if (Array.isArray(response.thoughtProcess) && response.thoughtProcess.length > 0) {
        for (const thought of response.thoughtProcess) {
           addStep(AgentType.MANAGER, 'completed', thought);
           await delay(400);
        }
      }

      // 3. Safety Check
      if (response.safety === SafetyStatus.REQUIRE_CONFIRMATION) {
        // Extract details for the modal
        const details = extractTransactionDetails(response.actions, dashboardState);
        setTransactionPreview(details);

        addStep(AgentType.MANAGER, 'waiting_approval', 'Consequential action detected. Pausing for authorization.', 99);
        setSystemStatus('WAITING_APPROVAL');
        setPendingAction({ actions: response.actions, originalResponse: response });
        setShowSafetyModal(true);
        setIsProcessing(false);
        return;
      }

      // 4. Execute Actions
      await executeActionSequence(response.actions);

      // 5. Final Response
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: AgentType.MANAGER,
        content: response.message,
        timestamp: new Date()
      }]);
      
      // Announce final message
      if (liveRegionRef.current) {
        liveRegionRef.current.innerText = response.message;
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: AgentType.MANAGER,
        content: "I encountered an error coordinating the agents. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      if (!showSafetyModal) {
        setIsProcessing(false);
        setIsScanning(false);
        setActiveHighlight(null);
        setSystemStatus('IDLE');
      }
    }
  };

  const extractTransactionDetails = (actions: AgentAction[], currentState: DashboardState): TransactionPreview => {
    let amount = '0';
    let to = 'Unknown';
    let note = '';

    // Try to find values in actions
    actions.forEach(action => {
      if (action.type === 'FILL_INPUT' && action.target && action.value) {
        if (action.target.includes('amount')) amount = action.value;
        if (action.target.includes('recipient')) to = action.value;
        if (action.target.includes('note')) note = action.value;
      }
    });

    // Fallback to current form state if actions didn't have them (e.g., if they were filled in previous steps)
    if (amount === '0' && currentState.transferForm.amount) amount = currentState.transferForm.amount;
    if (to === 'Unknown' && currentState.transferForm.recipient) to = currentState.transferForm.recipient;

    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
    const newBalance = currentState.balance - numAmount;

    return {
      from: 'Main Account (...8842)',
      to,
      amount,
      note,
      newBalance: newBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  };

  const normalizeTarget = (target: string | undefined): 'overview' | 'transfer' | 'settings' | 'transactions' => {
    const t = (target || '').toLowerCase();
    if (t.includes('transfer')) return 'transfer';
    if (t.includes('setting')) return 'settings';
    if (t.includes('transaction') || t.includes('history') || t.includes('insight')) return 'transactions';
    return 'overview';
  };

  const executeActionSequence = async (actions: AgentAction[]) => {
    if (!actions || !Array.isArray(actions)) {
      console.warn("No valid actions to execute");
      return;
    }

    setSystemStatus('PROCESSING');

    for (const action of actions) {
      const confidence = action.confidence || 95; 

      if (action.target) {
        let highlightId = action.target.toLowerCase();
        if (highlightId.includes('submit')) highlightId = 'submit';
        if (highlightId.includes('recipient')) highlightId = 'recipient';
        if (highlightId.includes('amount')) highlightId = 'amount';
        if (highlightId.includes('chart')) highlightId = 'chart';
        if (highlightId.includes('balance')) highlightId = 'balance';
        if (highlightId.includes('overview') || highlightId.includes('transfer') || highlightId.includes('transaction') || highlightId.includes('nav')) highlightId = 'nav';
        
        setActiveHighlight(highlightId);
      }

      switch (action.type) {
        case 'NAVIGATE':
          const normalizedPage = normalizeTarget(action.target);
          addStep(AgentType.EXECUTOR, 'processing', `Navigating to ${normalizedPage}...`, confidence);
          await delay(1000);
          setDashboardState(prev => ({
            ...prev,
            currentPage: normalizedPage,
            lastTransactionStatus: 'idle'
          }));
          updateLastStepStatus('completed');
          break;

        case 'ANALYZE_CHART':
          setIsScanning(true);
          setActiveHighlight('chart');
          addStep(AgentType.INTERPRETER, 'processing', 'Scanning visual analytics...', confidence);
          await delay(2000);
          addStep(AgentType.INTERPRETER, 'completed', 'Analysis complete. Pattern recognition successful.', confidence);
          setIsScanning(false);
          break;

        case 'FILL_INPUT':
          addStep(AgentType.INTERPRETER, 'processing', `Locating field: ${action.target}`, confidence);
          await delay(800);
          updateLastStepStatus('completed');
          
          addStep(AgentType.EXECUTOR, 'processing', `Typing "${action.value}"...`, confidence);
          await delay(600);
          
          setDashboardState(prev => {
            const field = action.target?.toLowerCase() || '';
            const newState = { ...prev.transferForm };
            if (field.includes('recipient')) newState.recipient = action.value || '';
            if (field.includes('amount')) newState.amount = action.value || '';
            if (field.includes('note')) newState.note = action.value || '';
            return { ...prev, transferForm: newState };
          });
          updateLastStepStatus('completed');
          break;
        
        case 'EXTRACT_DATA':
          setIsScanning(true);
          addStep(AgentType.INTERPRETER, 'processing', 'De-rendering visual document structure...', confidence);
          await delay(2000);
          addStep(AgentType.EXECUTOR, 'processing', 'Structuring tabular data...', confidence);
          await delay(1000);
          // Simulate extracted data merge
          setDashboardState(prev => ({
            ...prev,
            transactions: [...(action.value ? JSON.parse(action.value) : []), ...prev.transactions]
          }));
          updateLastStepStatus('completed');
          setIsScanning(false);
          break;

        case 'CLICK':
          addStep(AgentType.EXECUTOR, 'processing', `Clicking "${action.target}"`, confidence);
          await delay(800);
          if (action.target?.toLowerCase().includes('submit')) {
            setDashboardState(prev => ({ ...prev, lastTransactionStatus: 'pending' }));
            await delay(1500);
            setDashboardState(prev => ({ 
              ...prev, 
              lastTransactionStatus: 'success', 
              balance: prev.balance - Number(prev.transferForm.amount || 0) 
            }));
          }
          updateLastStepStatus('completed');
          break;
      }
      
      await delay(500);
      setActiveHighlight(null);
    }
  };

  const handleSafetyConfirm = async () => {
    setShowSafetyModal(false);
    if (pendingAction) {
      setIsProcessing(true);
      setSystemStatus('PROCESSING');
      addStep(AgentType.MANAGER, 'completed', 'Authorization confirmed. Resuming...', 100);
      await executeActionSequence(pendingAction.actions);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: AgentType.MANAGER,
        content: pendingAction.originalResponse.message,
        timestamp: new Date()
      }]);
      
      setPendingAction(null);
      setIsProcessing(false);
      setSystemStatus('IDLE');
    }
  };

  const handleSafetyDeny = () => {
    setShowSafetyModal(false);
    setPendingAction(null);
    setSystemStatus('IDLE');
    addStep(AgentType.MANAGER, 'completed', 'Action denied by user.', 100);
    setIsProcessing(false);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: AgentType.MANAGER,
      content: "I have cancelled the operation.",
      timestamp: new Date()
    }]);
  };

  const handleFileUpload = (file: File) => {
    setDashboardState(prev => ({ ...prev, uploadedFile: file }));
    setInputValue("Analyze this uploaded document");
  };

  // --- Helpers ---
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const addStep = (agent: AgentType, status: ProcessingStep['status'], description: string, confidence?: number) => {
    setAgentSteps(prev => [...prev, { agent, status, description, confidence }]);
  };

  const updateLastStepStatus = (status: ProcessingStep['status']) => {
    setAgentSteps(prev => {
      const newSteps = [...prev];
      if (newSteps.length > 0) {
        newSteps[newSteps.length - 1].status = status;
      }
      return newSteps;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSING': return 'text-brand-cyan drop-shadow-[0_0_8px_rgba(0,217,255,0.5)]';
      case 'WAITING_APPROVAL': return 'text-brand-orange drop-shadow-[0_0_8px_rgba(255,107,53,0.5)]';
      case 'SAFE_MODE': return 'text-brand-mint';
      default: return 'text-brand-mint drop-shadow-[0_0_8px_rgba(0,208,132,0.3)]'; // Idle Green
    }
  };

  const getStatusDot = (status: string) => {
    if (status === 'PROCESSING') return <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan animate-pulse-fast shadow-[0_0_10px_#00D9FF]"></div>;
    if (status === 'WAITING_APPROVAL') return <div className="w-2.5 h-2.5 rounded-full bg-brand-orange animate-pulse shadow-[0_0_10px_#FF6B35]"></div>;
    return <div className="w-2.5 h-2.5 rounded-full bg-brand-mint shadow-[0_0_8px_#00D084]"></div>; // Idle Green with glow
  };

  return (
    <div className="flex h-screen w-screen bg-brand-dark overflow-hidden font-sans text-slate-200">
      
      <div className="sr-only" role="status" aria-live="polite" ref={liveRegionRef}></div>

      {/* LEFT PANEL: Chat & Agent Brain */}
      <div className="w-1/3 min-w-[400px] border-r border-[#25252b] flex flex-col bg-brand-dark z-10 relative">
        
        {/* Header */}
        <div className="p-5 border-b border-[#25252b] bg-brand-dark/95 flex flex-col gap-3 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tighter flex items-center gap-2">
                <span className="text-brand-cyan">A.F.A.A.</span>
              </h1>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Autonomous Financial Agent</span>
            </div>
            
            {/* Status Pod */}
            <div className="flex items-center gap-3 bg-[#1C1C21] border border-[#25252b] rounded-full px-3 py-1.5 shadow-inner">
               {getStatusDot(systemStatus)}
               <span className={`text-[10px] font-bold tracking-widest ${getStatusColor(systemStatus)}`}>
                 {systemStatus.replace('_', ' ')}
               </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-2">
             <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
               <span className="bg-[#1C1C21] px-1.5 py-0.5 rounded border border-[#25252b]">Ctrl+T Transfer</span>
               <span className="bg-[#1C1C21] px-1.5 py-0.5 rounded border border-[#25252b]">Ctrl+B Balance</span>
             </div>

            <button 
              onClick={() => setSimpleMode(!simpleMode)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${simpleMode ? 'bg-brand-purple/20 border-brand-purple text-brand-purple shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'bg-[#1C1C21] border-[#25252b] text-slate-400 hover:border-slate-600'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${simpleMode ? 'bg-brand-purple' : 'bg-slate-500'}`}></div>
              SIMPLE MODE
            </button>
          </div>
        </div>

        {/* Agent Activity Feed */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-[#25252b] bg-[#0F0F12]">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Neural Activity Log</h2>
             <div className="h-px bg-[#25252b] flex-1 ml-4"></div>
          </div>
          <AgentStatusPanel steps={agentSteps} />
        </div>

        {/* Chat Interface */}
        <div className="h-[45%] flex flex-col bg-brand-dark shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
           <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === AgentType.USER ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.3s_ease-out]`}>
                  <div className={`max-w-[85%] p-3.5 rounded-xl text-sm leading-relaxed shadow-sm ${
                    msg.sender === AgentType.USER 
                      ? 'bg-[#25252b] text-slate-200 rounded-tr-none' 
                      : 'bg-brand-cyan/5 text-brand-cyan border border-brand-cyan/20 rounded-tl-none shadow-[0_2px_15px_rgba(0,217,255,0.05)]'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
           </div>

           <div className="p-4 border-t border-[#25252b] bg-[#0F0F12]">
             <div className="flex gap-2 relative">
               <input
                 ref={inputRef}
                 type="text"
                 value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                 placeholder="Type instructions..."
                 className="flex-1 bg-[#1C1C21] border border-[#25252b] text-slate-200 rounded-lg p-3 text-sm focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan transition-all placeholder:text-slate-600"
                 disabled={isProcessing}
               />
               <button 
                onClick={handleSendMessage}
                disabled={isProcessing}
                className="bg-brand-cyan hover:bg-cyan-400 text-slate-900 px-5 py-2 rounded-lg text-sm disabled:opacity-50 font-bold transition-all shadow-[0_0_15px_rgba(0,217,255,0.3)] hover:shadow-[0_0_20px_rgba(0,217,255,0.5)] active:scale-95"
               >
                 {isProcessing ? '...' : 'SEND'}
               </button>
             </div>
           </div>
        </div>
      </div>

      {/* RIGHT PANEL: Browser Simulation */}
      <div className="flex-1 bg-brand-dark flex flex-col relative" aria-hidden={isScanning}>
        <div className="bg-[#1C1C21] p-2 flex items-center gap-3 text-xs text-slate-400 border-b border-[#25252b]">
           <div className="flex gap-1.5 ml-2">
             <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
           </div>
           <div className="bg-[#0F0F12] px-4 py-1.5 rounded flex-1 text-center font-mono opacity-60 truncate border border-[#25252b] text-[10px]">
             https://portal.darlene.demo/dashboard/{dashboardState.currentPage}
           </div>
        </div>
        
        <div className="flex-1 relative overflow-hidden">
           <MockFinancialDashboard 
            state={dashboardState} 
            scanning={isScanning} 
            highlightTarget={activeHighlight}
            onFileUpload={handleFileUpload}
            onNavigate={handleManualNavigation}
          />
        </div>
      </div>

      <SafetyModal 
        isOpen={showSafetyModal}
        transactionDetails={transactionPreview}
        onConfirm={handleSafetyConfirm}
        onCancel={handleSafetyDeny}
      />
    </div>
  );
};

export default App;