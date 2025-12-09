
import React, { useRef, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardState, ProcessingStep, AgentAction } from '../types';
import { MOCK_CHART_DATA } from '../constants';
import { AgentMode } from './AgentMode';
import { AgentManager } from '../services/agent';

interface FormErrors {
  recipient?: string;
  amount?: string;
}

interface MockFinancialDashboardProps {
  state: DashboardState;
  scanning: boolean;
  highlightTarget: string | null;
  onFileUpload?: (file: File) => void;
  onNavigate?: (page: DashboardState['currentPage']) => void;
  manualMode?: boolean;
  onFormFieldChange?: (field: 'recipient' | 'amount' | 'note', value: string) => void;
  onTransferSubmit?: () => void;
  formErrors?: FormErrors;
  isSubmittingTransfer?: boolean;
  agentManager?: AgentManager;
  agentSteps?: ProcessingStep[];
  onSendMessage?: (message: string) => void;
  onManualAction?: (action: AgentAction) => void;
}

export const MockFinancialDashboard: React.FC<MockFinancialDashboardProps> = ({ 
  state, 
  scanning, 
  highlightTarget, 
  onFileUpload, 
  onNavigate,
  manualMode = false,
  onFormFieldChange,
  onTransferSubmit,
  formErrors = {} as FormErrors,
  isSubmittingTransfer = false,
  agentManager,
  agentSteps = [],
  onSendMessage,
  onManualAction
}) => {
  
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [isChartsLoaded, setIsChartsLoaded] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Simulate chart loading
  useEffect(() => {
    const timer = setTimeout(() => setIsChartsLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);
  
  // Enhanced highlighting that checks loose matches for resilience
  const isHighlighted = (targetId: string, label: string) => {
    if (!highlightTarget) return false;
    const target = highlightTarget.toLowerCase();
    const id = targetId.toLowerCase();
    const lbl = label.toLowerCase();
    
    // Direct match, substring match, or selector-like match
    return target.includes(id) || id.includes(target) || target.includes(lbl) || (target.includes('button') && id.includes('submit'));
  };

  const renderHighlight = (targetId: string, label: string) => {
    if (isHighlighted(targetId, label)) {
      return (
        <div className="absolute inset-0 border-2 border-brand-lime bg-brand-lime/10 z-50 animate-pulse rounded-[inherit] pointer-events-none shadow-[0_0_20px_rgba(210,241,89,0.3)]" aria-hidden="true">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-lime text-black text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider shadow-lg">
            {label}
          </div>
        </div>
      );
    }
    return null;
  };

  const NavPill = ({ id, label, active }: { id: string, label: string, active: boolean }) => (
    <button 
      onClick={() => onNavigate?.(id as any)}
      aria-current={active ? 'page' : undefined}
      aria-label={`Navigate to ${label}`}
      className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-brand-lime focus:ring-opacity-50 whitespace-nowrap ${
        active 
          ? 'bg-brand-lime text-black font-bold shadow-[0_0_20px_rgba(210,241,89,0.2)]' 
          : 'bg-[#25252b] text-slate-400 hover:bg-[#2F2F36] hover:text-white'
      }`}
    >
      {renderHighlight(`nav-${id}`, 'NAV')}
      {label}
    </button>
  );

  // Handle keyboard navigation in transfer form
  const handleTransferFormKeyDown = (e: React.KeyboardEvent) => {
    if (!manualMode) return;
    
    switch (e.key) {
      case 'Tab':
        break;
      case 'Enter':
        e.preventDefault();
        if (e.currentTarget === recipientInputRef.current) {
          amountInputRef.current?.focus();
        } else if (e.currentTarget === amountInputRef.current) {
          submitButtonRef.current?.focus();
        } else if (e.currentTarget === submitButtonRef.current) {
          onTransferSubmit?.();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onFormFieldChange?.('recipient', '');
        onFormFieldChange?.('amount', '');
        recipientInputRef.current?.focus();
        break;
    }
  };

  // Focus management
  useEffect(() => {
    if (manualMode && state.currentPage === 'transfer') {
      recipientInputRef.current?.focus();
    }
  }, [manualMode, state.currentPage]);

  // If in Agent Mode, render the Agent Interface
  if ((state.currentPage as string) === 'agent-mode') {
    return (
      <div className="w-full h-full relative" role="main" aria-label="Agent Mode Interface">
        <AgentMode 
          agentManager={agentManager!} 
          onExit={() => onNavigate?.('overview')}
          steps={agentSteps}
          onSendMessage={onSendMessage}
          onManualAction={onManualAction}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-brand-dark text-white overflow-y-auto p-4 md:p-6 lg:p-10 font-sans selection:bg-brand-lime selection:text-black pb-20 md:pb-6" role="main" aria-label="Financial Dashboard">
      
      {/* Simulation Overlay for Vision Agent */}
      {scanning && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center" aria-live="assertive" aria-label="Vision Agent is analyzing the interface">
          <div className="absolute inset-0 bg-brand-purple/10 backdrop-blur-[1px]"></div>
          <div className="w-full h-1 bg-brand-purple/80 shadow-[0_0_30px_rgba(139,92,246,1)] animate-scan fixed top-0 left-0"></div>
          <div className="bg-black/80 text-brand-purple px-4 py-2 rounded-full border border-brand-purple/50 font-mono text-xs backdrop-blur-md">
            VISION_AGENT::ANALYZING_INTERFACE...
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4 md:gap-6" role="banner">
        {/* Navigation */}
        <div className="w-full md:w-auto overflow-x-auto scrollbar-hide" role="navigation">
          <div className="relative p-1">
             {renderHighlight('nav', 'NAVIGATION')}
             <div className="flex gap-2 md:gap-3 min-w-max">
              <NavPill id="overview" label="Overview" active={state.currentPage === 'overview'} />
              <NavPill id="transactions" label="Insights" active={state.currentPage === 'transactions'} />
              <NavPill id="transfer" label="Transfer" active={state.currentPage === 'transfer'} />
              <NavPill id="reports" label="Reports" active={state.currentPage === 'reports'} />
              <NavPill id="agent-mode" label="Agents" active={state.currentPage === 'agent-mode'} />
             </div>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-3 md:gap-4 self-end md:self-auto relative">
          <button className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-lime transition-all focus:outline-none focus:ring-2 focus:ring-brand-lime focus:ring-opacity-50" aria-label="Search">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button 
             onClick={() => setShowNotifications(!showNotifications)}
             className={`w-10 h-10 rounded-full border flex items-center justify-center hover:text-white hover:border-brand-lime relative transition-all focus:outline-none focus:ring-2 focus:ring-brand-lime focus:ring-opacity-50 ${showNotifications ? 'border-brand-lime text-white' : 'border-slate-700 text-slate-400'}`} aria-label="Notifications">
             <div className="absolute top-2 right-2.5 w-2 h-2 bg-brand-lime rounded-full border border-brand-dark animate-pulse"></div>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Notification Popup */}
          {showNotifications && (
            <div className="absolute top-14 right-0 md:right-16 w-80 md:w-96 bg-[#1C1C21] border border-[#25252b] rounded-2xl shadow-2xl z-50 overflow-hidden animate-[fadeIn_0.2s_ease-out] text-slate-200 ring-1 ring-white/10 origin-top-right">
              {/* Header */}
              <div className="p-4 border-b border-[#25252b] flex justify-between items-center bg-[#1C1C21]">
                  <h3 className="font-bold text-base text-white">AI Notification Center</h3>
                  <button className="text-xs font-medium text-slate-400 hover:text-white border border-[#333] hover:border-[#555] px-2 py-1 rounded transition-colors">See All</button>
              </div>
              {/* Tabs */}
              <div className="px-4 py-2 bg-[#151518] flex gap-2 text-xs font-medium border-b border-[#25252b]">
                  <button className="px-3 py-1 bg-[#25252b] rounded-md shadow-sm text-white border border-[#333]">Today</button>
                  <button className="px-3 py-1 text-slate-500 hover:text-slate-300 hover:bg-[#1C1C21] rounded-md transition-colors">This Week</button>
                  <button className="px-3 py-1 text-slate-500 hover:text-slate-300 hover:bg-[#1C1C21] rounded-md transition-colors">Earlier</button>
              </div>
              {/* List */}
              <div className="max-h-[24rem] overflow-y-auto bg-[#1C1C21] scrollbar-thin scrollbar-thumb-slate-700">
                  {/* Item 1 */}
                  <div className="p-4 border-b border-[#25252b] hover:bg-[#25252b]/50 transition-colors cursor-pointer group">
                      <div className="flex gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#151518] border border-[#25252b] shadow-sm flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:border-slate-600 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                          </div>
                          <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">Your AI Just Got Smarter</h4>
                                  <span className="text-[10px] text-slate-500 font-mono">1h ago</span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300">Adaptive learning speed increased by 27%. New feature: AI-driven trend forecasting</p>
                          </div>
                      </div>
                  </div>
                  {/* Item 2 */}
                  <div className="p-4 border-b border-[#25252b] hover:bg-[#25252b]/50 transition-colors cursor-pointer group">
                      <div className="flex gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#151518] border border-[#25252b] shadow-sm flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:border-slate-600 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                              </svg>
                          </div>
                          <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">Data Analysis Completed</h4>
                                  <span className="text-[10px] text-slate-500 font-mono">3h ago</span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300">Your AI has processed <span className="font-bold text-slate-300">10,000+ records</span> and identified key trends.</p>
                          </div>
                      </div>
                  </div>
                  {/* Item 3 */}
                  <div className="p-4 hover:bg-[#25252b]/50 transition-colors cursor-pointer group">
                      <div className="flex gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#151518] border border-[#25252b] shadow-sm flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:border-slate-600 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                          </div>
                          <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">System Maintenance</h4>
                                  <span className="text-[10px] text-slate-500 font-mono">5h ago</span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300">Performance tuning & security updates will be applied at <span className="font-bold text-slate-300">2:00 AM UTC</span></p>
                          </div>
                      </div>
                  </div>
              </div>
            </div>
          )}

          <button 
            onClick={() => onNavigate?.('profile')}
            className="w-10 h-10 md:w-11 md:h-11 rounded-full p-[2px] bg-gradient-to-br from-brand-lime to-brand-purple hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-brand-lime"
            aria-label="Go to Profile"
          >
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Darlene" alt="Darlene Robertson Profile" className="w-full h-full rounded-full bg-brand-dark border-2 border-brand-dark" />
          </button>
        </div>
      </div>

      {/* Overview Page */}
      {state.currentPage === 'overview' && (
        <div className="animate-[fadeIn_0.5s_ease-out] space-y-6 md:space-y-8" role="region" aria-label="Overview Dashboard">
          
          {/* Welcome Message */}
          <div className="mb-2">
            <p className="text-slate-400 text-sm mb-1">Welcome back,</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-tight">
              Darlene <span className="font-semibold">Robertson</span>
            </h1>
          </div>

          {/* QUICK ACTIONS ROW (For Demo Workflows) */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
             <button 
               onClick={() => { onNavigate?.('transfer'); onFormFieldChange?.('note', 'Electricity Bill'); }}
               className="relative group bg-[#1C1C21] border border-[#25252b] hover:border-brand-lime hover:bg-[#25252b] rounded-xl px-5 py-3 flex items-center gap-3 transition-all min-w-max"
             >
                {renderHighlight('pay bill', 'ACTION')}
                <div className="p-2 bg-brand-lime/10 text-brand-lime rounded-lg group-hover:bg-brand-lime group-hover:text-black transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="text-left">
                   <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pay Bill</div>
                   <div className="text-sm font-bold text-white">Electricity</div>
                </div>
             </button>

             <button 
               onClick={() => { onNavigate?.('transfer'); onFormFieldChange?.('recipient', 'Gold Vault'); }}
               className="relative group bg-[#1C1C21] border border-[#25252b] hover:border-brand-lime hover:bg-[#25252b] rounded-xl px-5 py-3 flex items-center gap-3 transition-all min-w-max"
             >
                {renderHighlight('invest', 'ACTION')}
                <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-lg group-hover:bg-brand-orange group-hover:text-white transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="text-left">
                   <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Invest</div>
                   <div className="text-sm font-bold text-white">Digital Gold</div>
                </div>
             </button>

             <button 
               onClick={() => onNavigate?.('reports')}
               className="relative group bg-[#1C1C21] border border-[#25252b] hover:border-brand-lime hover:bg-[#25252b] rounded-xl px-5 py-3 flex items-center gap-3 transition-all min-w-max"
             >
                {renderHighlight('tax docs', 'ACTION')}
                <div className="p-2 bg-brand-cyan/10 text-brand-cyan rounded-lg group-hover:bg-brand-cyan group-hover:text-black transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div className="text-left">
                   <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Docs</div>
                   <div className="text-sm font-bold text-white">Taxes 2024</div>
                </div>
             </button>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Main Account Card */}
            <div className="bg-brand-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] relative group hover:bg-[#25252b] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-lime focus:ring-opacity-50" tabIndex={0} aria-label={`Main Account Balance: $${state.balance.toLocaleString()}`}>
              {renderHighlight('balance', 'MAIN_ACCOUNT')}
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-300 group-hover:border-brand-lime transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-slate-300 font-medium group-hover:text-white transition-colors">Main Account</span>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white text-black flex items-center justify-center transform -rotate-45 group-hover:rotate-0 transition-transform shadow-lg text-sm md:text-base" aria-hidden="true">
                  ➜
                </div>
              </div>
              <div className="text-2xl md:text-3xl lg:text-4xl font-medium mb-3 tracking-tight text-white">
                 ${state.balance.toLocaleString()}
              </div>
              <div className="text-xs text-brand-mint font-mono font-medium flex items-center gap-1">
                <span className="flex items-center gap-1" aria-label="Up 42.8 percent">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 4.414 4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  +42.8%
                </span>
                <span className="text-slate-500">from previous month</span>
              </div>
            </div>

            {/* Monthly Spend Card */}
            <div className="bg-brand-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] relative group hover:bg-[#25252b] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-lime focus:ring-opacity-50" tabIndex={0} aria-label="Monthly Spend: $296,241">
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-300 group-hover:border-brand-lime transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-slate-300 font-medium group-hover:text-white transition-colors">Monthly Spend</span>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white text-black flex items-center justify-center transform -rotate-45 group-hover:rotate-0 transition-transform shadow-lg text-sm md:text-base" aria-hidden="true">
                  ➜
                </div>
              </div>
              <div className="text-2xl md:text-3xl lg:text-4xl font-medium mb-3 tracking-tight text-white">
                $296,241
              </div>
              <div className="text-xs text-brand-mint font-mono font-medium flex items-center gap-1">
                <span className="flex items-center gap-1" aria-label="Up 26.3 percent">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 4.414 4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  +26.3%
                </span>
                <span className="text-slate-500">from previous week</span>
              </div>
            </div>

             {/* Company Card (Highlighted) */}
             <div className="bg-brand-lime p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-black relative group shadow-[0_10px_40px_rgba(210,241,89,0.2)] hover:shadow-[0_15px_50px_rgba(210,241,89,0.3)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 md:col-span-2 xl:col-span-1" tabIndex={0} aria-label="Company Statistics: 76,314">
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full border border-black/20 flex items-center justify-center group-hover:border-black/40 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-black/80 font-semibold group-hover:text-black transition-colors">Company</span>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black text-brand-lime flex items-center justify-center transform -rotate-45 group-hover:rotate-0 transition-transform text-sm md:text-base" aria-hidden="true">
                  ➜
                </div>
              </div>
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 tracking-tight">
                76,314
              </div>
              <div className="text-xs text-black/80 font-bold font-mono flex items-center gap-1">
                <span className="flex items-center gap-1" aria-label="Down 18.4 percent">
                  <svg className="w-3 h-3 rotate-180" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 4.414 4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  -18.4%
                </span>
                <span className="opacity-60">from previous week</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Page - Enhanced */}
      {state.currentPage === 'transfer' && (
        <div className="flex items-center justify-center min-h-full py-6 animate-[fadeIn_0.5s_ease-out]" role="region" aria-label="Money Transfer">
           <div className="bg-brand-card p-6 md:p-12 rounded-[2.5rem] md:rounded-[3rem] w-full max-w-md md:max-w-xl relative shadow-2xl border border-slate-800/50">
              <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-brand-lime/5 rounded-full blur-[50px] md:blur-[100px] pointer-events-none"></div>
              {/* ... (Transfer Form Logic Omitted for brevity, logic unchanged) */}
              
              <div className="flex items-center justify-between mb-8 md:mb-10">
                 <h2 className="text-2xl md:text-3xl font-light">Quick <span className="text-brand-lime font-bold">Transfer</span></h2>
                 <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#25252b] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-brand-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                 </div>
              </div>

               <form onSubmit={(e) => { e.preventDefault(); onTransferSubmit?.(); }} className="space-y-6 md:space-y-8">
                 {/* Recipient Field */}
                 <div className="group relative" data-target="recipient">
                    {renderHighlight('recipient', 'RECIPIENT')}
                    <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2 md:mb-3 font-bold group-hover:text-brand-lime transition-colors">
                      Recipient
                    </label>
                    <div className={`flex items-center gap-3 md:gap-4 bg-[#151518] p-4 md:p-5 rounded-[1.5rem] border transition-all ${
                      formErrors.recipient 
                        ? 'border-red-500/50 bg-red-500/5' 
                        : 'border-transparent group-focus-within:border-brand-lime/50'
                    }`}>
                       <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-sm md:text-base" aria-hidden="true">
                         @
                       </div>
                       <input 
                          ref={recipientInputRef}
                          type="text" 
                          value={state.transferForm.recipient}
                          onChange={(e) => onFormFieldChange?.('recipient', e.target.value)}
                          onKeyDown={handleTransferFormKeyDown}
                          readOnly={!manualMode}
                          placeholder="Search people..."
                          aria-label="Recipient Name"
                          aria-invalid={!!formErrors.recipient}
                          className="bg-transparent w-full focus:outline-none text-white placeholder:text-slate-600 font-medium text-sm md:text-base"
                       />
                       <button 
                         type="button" 
                         className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors text-xs md:text-sm" 
                         aria-label="Select Recipient"
                         disabled={!manualMode}
                       >
                         ▼
                       </button>
                    </div>
                    {formErrors.recipient && (
                      <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formErrors.recipient}
                      </p>
                    )}
                 </div>

                 {/* Amount Field */}
                 <div className="group relative" data-target="amount">
                    {renderHighlight('amount', 'AMOUNT')}
                    <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2 md:mb-3 font-bold group-hover:text-brand-lime transition-colors">
                      Amount
                    </label>
                    <div className={`flex items-center gap-3 md:gap-4 bg-[#151518] p-4 md:p-5 rounded-[1.5rem] border transition-all ${
                      formErrors.amount 
                        ? 'border-red-500/50 bg-red-500/5' 
                        : 'border-transparent group-focus-within:border-brand-lime/50'
                    }`}>
                       <span className="text-brand-lime font-bold text-xl md:text-2xl">$</span>
                       <input 
                          ref={amountInputRef}
                          type="text" 
                          value={state.transferForm.amount}
                          onChange={(e) => onFormFieldChange?.('amount', e.target.value)}
                          onKeyDown={handleTransferFormKeyDown}
                          readOnly={!manualMode}
                          placeholder="0.00"
                          aria-label="Transfer Amount"
                          aria-invalid={!!formErrors.amount}
                          className="bg-transparent w-full focus:outline-none text-white text-xl md:text-2xl font-bold placeholder:text-slate-700"
                       />
                    </div>
                    {formErrors.amount && (
                      <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formErrors.amount}
                      </p>
                    )}
                 </div>

                 {/* Submit Button */}
                 <div className="pt-4 md:pt-6 relative" data-target="submit">
                    {renderHighlight('submit', 'EXECUTE')}
                    <button 
                      ref={submitButtonRef}
                      type="submit"
                      onKeyDown={handleTransferFormKeyDown}
                      disabled={!manualMode || isSubmittingTransfer}
                      className="w-full bg-brand-lime text-black py-4 md:py-5 rounded-[1.5rem] font-bold text-base md:text-lg hover:bg-[#dfff6b] transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(210,241,89,0.3)] hover:shadow-[0_0_40px_rgba(210,241,89,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-lime focus:ring-opacity-50"
                    >
                       {isSubmittingTransfer ? (
                         <>
                           <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-black"></div>
                           Processing...
                         </>
                       ) : (
                         <>
                           <span>Send Money Now</span>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                           </svg>
                         </>
                       )}
                    </button>
                    {!manualMode && (
                      <p className="text-xs text-slate-500 text-center mt-3">
                        Enable Manual Mode to use this form directly
                      </p>
                    )}
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Reports Page (and other pages omitted for brevity as they are unchanged) */}
      {state.currentPage === 'reports' && (
        <div className="flex flex-col items-center justify-center h-full animate-[fadeIn_0.5s_ease-out] text-center p-8" role="region" aria-label="Financial Reports">
            <div className="w-24 h-24 rounded-full bg-brand-card flex items-center justify-center mb-6 shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <h2 className="text-3xl font-light text-white mb-2">Financial <span className="text-brand-lime font-bold">Reports</span></h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
                Access detailed statements, tax documents, and spending analysis. 
                <br/><span className="text-xs text-slate-600 mt-2 block">(Mock Interface)</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {['2024 Tax Documents', 'Q3 Financial Statement', 'Spending Analysis', 'Asset Allocation'].map((item) => (
                    <div key={item} className="bg-brand-card hover:bg-[#25252b] p-4 rounded-xl flex items-center justify-between cursor-pointer group transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#151518] flex items-center justify-center group-hover:bg-brand-lime group-hover:text-black transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="font-medium text-slate-300 group-hover:text-white">{item}</span>
                        </div>
                        <span className="text-xs text-slate-500">PDF</span>
                    </div>
                ))}
            </div>
        </div>
      )}
      
      {/* Transactions Page (omitted for brevity) */}
      {state.currentPage === 'transactions' && (
         <div className="bg-brand-card rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 h-full relative overflow-hidden animate-[fadeIn_0.5s_ease-out] flex flex-col" role="region" aria-label="Recent Transactions">
            {renderHighlight('transactions', 'HISTORY_GRID')}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4">
               <h2 className="text-2xl md:text-3xl font-light">Recent <span className="font-bold text-brand-purple">Insights</span></h2>
               {onFileUpload && (
                  <button className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full bg-brand-lime text-black font-bold hover:bg-[#dfff6b] transition-colors text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-lime focus:ring-opacity-50" onClick={() => document.getElementById('file-upload')?.click()} aria-label="Upload a bank statement">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                     <span className="hidden sm:inline">Upload Statement</span><span className="sm:hidden">Upload</span>
                  </button>
               )}
               <input id="file-upload" type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onFileUpload?.(e.target.files[0])} aria-hidden="true" />
            </div>
            <div className="flex-1 overflow-hidden">
               <div className="h-full overflow-y-auto pr-2 md:pr-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
                  <table className="w-full text-left border-separate border-spacing-y-2 md:border-spacing-y-3" role="table">
                     <thead className="sticky top-0 bg-brand-card"><tr className="text-slate-500 text-xs uppercase tracking-wider"><th className="px-4 md:px-6 py-3 md:py-4 font-bold" scope="col">Transaction</th><th className="px-4 md:px-6 py-3 md:py-4 font-bold hidden md:table-cell" scope="col">Category</th><th className="px-4 md:px-6 py-3 md:py-4 font-bold hidden sm:table-cell" scope="col">Date</th><th className="px-4 md:px-6 py-3 md:py-4 text-right font-bold" scope="col">Amount</th><th className="px-4 md:px-6 py-3 md:py-4 text-center font-bold hidden lg:table-cell" scope="col">Status</th></tr></thead>
                     <tbody>{state.transactions.map((tx) => (<tr key={tx.id} className="bg-[#151518] hover:bg-[#1f1f24] transition-colors group rounded-xl md:rounded-2xl"><td className="px-4 md:px-6 py-4 md:py-5 rounded-l-[1rem] md:rounded-l-[1.5rem]"><div className="flex items-center gap-3 md:gap-4"><div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-lg text-sm md:text-base ${tx.type === 'credit' ? 'bg-brand-mint text-black' : 'bg-[#2A2A30] text-white'}`}>{tx.type === 'credit' ? '↓' : '↑'}</div><span className="font-bold text-white text-sm md:text-lg truncate">{tx.description}</span></div></td><td className="px-4 md:px-6 py-4 md:py-5 hidden md:table-cell"><span className="px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-[#2A2A30] text-xs text-slate-300 font-medium">{tx.category}</span></td><td className="px-4 md:px-6 py-4 md:py-5 text-slate-400 font-medium text-xs md:text-sm hidden sm:table-cell">{tx.date}</td><td className={`px-4 md:px-6 py-4 md:py-5 text-right font-mono font-bold text-sm md:text-lg ${tx.type === 'credit' ? 'text-brand-mint' : 'text-white'}`}>{tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}</td><td className="px-4 md:px-6 py-4 md:py-5 rounded-r-[1rem] md:rounded-r-[1.5rem] text-center hidden lg:table-cell"><div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-brand-mint mx-auto shadow-[0_0_10px_rgba(0,208,132,0.8)] animate-pulse" aria-label="Completed"></div></td></tr>))}</tbody>
                  </table>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};
