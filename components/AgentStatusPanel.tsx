import React from 'react';
import { AgentType, ProcessingStep } from '../types';

interface AgentStatusPanelProps {
  steps: ProcessingStep[];
}

export const AgentStatusPanel: React.FC<AgentStatusPanelProps> = ({ steps }) => {
  const getAgentColor = (agent: AgentType) => {
    switch (agent) {
      case AgentType.MANAGER: return 'text-brand-cyan border-brand-cyan';
      case AgentType.INTERPRETER: return 'text-brand-purple border-brand-purple';
      case AgentType.EXECUTOR: return 'text-brand-mint border-brand-mint';
      default: return 'text-slate-400 border-slate-400';
    }
  };

  const getAgentIcon = (agent: AgentType, status: string) => {
    if (status === 'waiting_approval') return '🛡️';
    switch (agent) {
      case AgentType.MANAGER: return status === 'processing' ? '🔍' : '💡';
      case AgentType.INTERPRETER: return '👁️';
      case AgentType.EXECUTOR: return '⚡';
      default: return '🤖';
    }
  };

  const getAgentName = (agent: AgentType) => {
    switch (agent) {
      case AgentType.MANAGER: return 'Manager';
      case AgentType.INTERPRETER: return 'Visual Interpreter';
      case AgentType.EXECUTOR: return 'Action Executor';
      default: return 'System';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-brand-mint border-brand-mint/30 bg-brand-mint/10';
    if (score >= 70) return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
    return 'text-brand-orange border-brand-orange/30 bg-brand-orange/10';
  };

  return (
    <div className="space-y-4 font-mono text-sm" role="list" aria-label="Agent processing steps">
      {steps.map((step, idx) => (
        <div 
          key={idx} 
          className={`relative pl-4 border-l-2 ${step.status === 'processing' ? 'border-l-brand-cyan animate-pulse' : 'border-l-slate-800'} pb-2 last:pb-0`}
          role="listitem"
        >
          {/* Header Line */}
          <div className="flex justify-between items-center mb-1">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${getAgentColor(step.agent)}`}>
              <span className="text-sm">{getAgentIcon(step.agent, step.status)}</span>
              {getAgentName(step.agent)} 
              {step.status === 'processing' && <span className="ml-2 inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce" aria-label="Processing"/>}
            </div>
            
            {step.confidence !== undefined && step.status === 'completed' && (
              <div className={`text-[10px] px-2 py-0.5 rounded-full border font-bold tracking-tight opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] ${getConfidenceColor(step.confidence)}`}>
                {step.confidence}% CONFIDENCE
              </div>
            )}
          </div>

          {/* Description */}
          <div className={`text-sm leading-snug pl-6 ${step.status === 'completed' ? 'text-slate-400' : 'text-slate-200'}`}>
            {step.description}
          </div>

          {/* Special States */}
          {step.status === 'waiting_approval' && (
             <div className="ml-6 mt-3 text-xs bg-brand-orange/10 text-brand-orange px-3 py-2 rounded border border-brand-orange/30 font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(255,107,53,0.1)]">
                <span className="animate-pulse">⚠️</span> WAITING FOR AUTHORIZATION
             </div>
          )}
        </div>
      ))}
      
      {steps.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 text-slate-600 gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse"></div>
          <div className="text-xs font-medium tracking-widest uppercase">System Online</div>
        </div>
      )}
    </div>
  );
};