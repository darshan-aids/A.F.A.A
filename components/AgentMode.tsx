
import React, { useEffect, useState, useRef } from "react";
import { AgentManager } from "../services/agent";
import { ProcessingStep, AgentType, AgentAction } from "../types";

type Props = {
  agentManager: AgentManager;
  onExit?: () => void;
  steps?: ProcessingStep[];
  onSendMessage?: (message: string) => void;
  onManualAction?: (action: AgentAction) => void;
};

export const AgentMode: React.FC<Props> = ({ agentManager, onExit, steps = [], onSendMessage, onManualAction }) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new steps arrive, unless user has scrolled up
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [steps]);

  const send = () => {
    if (!input.trim() || !onSendMessage) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const runBrowse = (url: string) => {
    if (onManualAction) {
       onManualAction({ type: 'BROWSE', url: url.startsWith('http') ? url : `https://${url}` } as AgentAction);
    }
  };

  const scrollToStep = (index: number) => {
     if (!containerRef.current) return;
     const cards = containerRef.current.querySelectorAll('[data-step-card]');
     if (cards[index]) {
         cards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
     }
  };

  const handleNav = (action: 'first' | 'last' | 'prev' | 'next' | 'page-up' | 'page-down') => {
      if (!steps.length) return;
      // Simple logic: we don't track "current" index in state to keep it simple, 
      // instead we use scroll position or just simple jumps. 
      // For "Page Up/Down", we can just scroll by container height.
      
      if (action === 'first') scrollToStep(0);
      if (action === 'last') scrollToStep(steps.length - 1);
      
      if (containerRef.current) {
         const h = containerRef.current.clientHeight;
         if (action === 'page-up') containerRef.current.scrollBy({ top: -h, behavior: 'smooth' });
         if (action === 'page-down') containerRef.current.scrollBy({ top: h, behavior: 'smooth' });
      }
  };

  const getAgentColor = (agent: AgentType) => {
    switch (agent) {
      case AgentType.MANAGER: return 'border-brand-cyan text-brand-cyan bg-brand-cyan/5';
      case AgentType.INTERPRETER: return 'border-brand-purple text-brand-purple bg-brand-purple/5';
      case AgentType.EXECUTOR: return 'border-brand-mint text-brand-mint bg-brand-mint/5';
      default: return 'border-slate-500 text-slate-400 bg-slate-500/5';
    }
  };

  return (
    <div className="flex h-full w-full bg-brand-dark animate-[fadeIn_0.5s_ease-out] overflow-hidden">
      
      {/* CENTER: MAIN CONSOLE AREA */}
      <main className="flex-1 flex flex-col bg-brand-dark relative z-0">
        
        {/* Header Bar */}
        <header className="h-16 border-b border-[#25252b] bg-[#0F0F12]/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-20">
           <div className="flex items-center gap-4">
              {onExit && (
                <button 
                  onClick={onExit}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1C1C21] border border-[#25252b] text-slate-400 hover:text-white hover:border-slate-500 transition-all text-xs font-bold group"
                >
                  <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Exit Agent Mode
                </button>
              )}
           </div>
           
           {/* Navigation Toolbar */}
           <div className="flex items-center gap-2 bg-[#1C1C21] p-1 rounded-lg border border-[#25252b]">
              <button onClick={() => handleNav('first')} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white text-xs" title="First Card">⏮</button>
              <button onClick={() => handleNav('page-up')} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white text-xs" title="Page Up">⏶</button>
              <button onClick={() => handleNav('page-down')} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white text-xs" title="Page Down">⏷</button>
              <button onClick={() => handleNav('last')} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white text-xs" title="Last Card">⏭</button>
           </div>

           <div className="flex items-center gap-3">
              <button 
                onClick={() => onSendMessage?.("navigate to overview")}
                className="bg-[#1C1C21] hover:bg-[#25252b] text-slate-400 hover:text-brand-lime px-3 py-1.5 rounded border border-[#25252b] text-xs font-mono transition-colors"
              >
                navigate to home
              </button>
           </div>
        </header>

        {/* FEED / CARDS */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
          {steps.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
                <div className="text-4xl mb-2">⚡</div>
                <p>System Idle. Waiting for instructions.</p>
             </div>
          )}

          {steps.map((step, idx) => (
             <div 
               key={idx} 
               data-step-card
               className={`p-4 rounded-xl border-l-4 shadow-lg animate-[fadeIn_0.3s_ease-out] relative bg-[#1C1C21] border border-t-[#25252b] border-r-[#25252b] border-b-[#25252b] ${getAgentColor(step.agent)}`}
             >
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider opacity-80">
                      {step.agent} 
                      <span className="text-slate-600 font-mono">::</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${step.status === 'processing' ? 'bg-current text-black animate-pulse' : 'border border-current opacity-70'}`}>
                         {step.status}
                      </span>
                   </div>
                   <div className="text-[10px] text-slate-500 font-mono">
                      #{idx + 1}
                   </div>
                </div>
                
                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-mono">
                   {step.description}
                </div>

                {step.confidence !== undefined && (
                   <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                         <div className="h-full bg-current opacity-50" style={{ width: `${step.confidence}%` }}></div>
                      </div>
                      <span className="text-[10px] font-mono opacity-60">{step.confidence}%</span>
                   </div>
                )}
             </div>
          ))}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#25252b] bg-[#0F0F12]">
          <div className="flex gap-2 relative">
            <input
              className="flex-1 bg-[#1C1C21] border border-[#25252b] text-white rounded-lg pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/50 transition-all placeholder:text-slate-600 font-mono"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Give instructions to the Default AI..."
            />
            <button 
              onClick={() => send()}
              className="absolute right-2 top-2 bottom-2 bg-brand-lime text-black px-4 rounded font-bold text-xs hover:bg-[#dfff6b] transition-colors tracking-widest"
            >
              SEND
            </button>
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR: COMMAND CENTER */}
      <aside className="w-80 border-l border-[#25252b] bg-[#0F0F12] p-5 hidden lg:flex flex-col gap-8 z-10">
        <div>
          <h4 className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            Command Center
            <span className="w-full h-[1px] bg-[#25252b]"></span>
          </h4>
          
          <div className="space-y-5">
            {/* Manual Browse */}
            <div className="bg-[#1C1C21] p-4 rounded-xl border border-[#25252b] shadow-sm">
              <label className="block text-[10px] text-slate-400 mb-2 font-mono uppercase tracking-wider">Manual Browse</label>
              <div className="flex gap-2">
                <input 
                  id="url-browse" 
                  placeholder="example.com" 
                  className="flex-1 bg-black/40 border border-[#25252b] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-cyan/50 font-mono"
                />
                <button
                  onClick={() => {
                    const el = document.getElementById("url-browse") as HTMLInputElement | null;
                    if (el?.value) runBrowse(el.value);
                  }}
                  className="bg-brand-cyan/10 text-brand-cyan px-3 py-1.5 rounded text-xs border border-brand-cyan/20 hover:bg-brand-cyan/20 font-bold transition-colors"
                >
                  GO
                </button>
              </div>
            </div>
            
            {/* Memory Stats */}
            <div className="bg-[#1C1C21] p-4 rounded-xl border border-[#25252b] shadow-sm">
              <label className="block text-[10px] text-slate-400 mb-3 font-mono uppercase tracking-wider">Memory Stats</label>
              <div className="text-xs text-slate-500">
                <div className="flex justify-between mb-2 font-mono text-[10px]">
                  <span>Context Usage</span>
                  <span className="text-brand-purple">12%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand-purple w-[12%] h-full rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                </div>
                <div className="mt-3 flex justify-between text-[10px] opacity-60">
                   <span>Tokens: 4,102</span>
                   <span>Limit: 32k</span>
                </div>
              </div>
            </div>
            
            {/* Jump to Card */}
            <div className="bg-[#1C1C21] p-4 rounded-xl border border-[#25252b] shadow-sm">
               <label className="block text-[10px] text-slate-400 mb-2 font-mono uppercase tracking-wider">Jump to Step</label>
               <div className="flex gap-2">
                  <input type="number" id="jump-step" placeholder="#" className="w-16 bg-black/40 border border-[#25252b] rounded px-2 py-1 text-xs text-white focus:outline-none font-mono" min="1" max={steps.length} />
                  <button 
                    onClick={() => {
                       const el = document.getElementById('jump-step') as HTMLInputElement;
                       if (el.value) scrollToStep(parseInt(el.value) - 1);
                    }}
                    className="flex-1 bg-[#25252b] hover:bg-[#303036] text-slate-300 text-xs rounded border border-[#333] transition-colors"
                  >
                     Go
                  </button>
               </div>
            </div>

          </div>
        </div>
        
        <div className="mt-auto">
          <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl text-yellow-500/80 text-[10px] leading-relaxed flex gap-3">
            <span className="text-lg">⚠️</span>
            <p><strong>Note:</strong> Agents operate autonomously. Verify all external actions before authorizing financial transactions.</p>
          </div>
        </div>
      </aside>
    </div>
  );
};
