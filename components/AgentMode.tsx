
import React, { useEffect, useState, useRef } from "react";
import { SubAgent as Agent, AgentAction, AgentMessage } from "../types";
import { AgentManager } from "../services/agent";

type Props = {
  agentManager: AgentManager;
};

export const AgentMode: React.FC<Props> = ({ agentManager }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sub = agentManager.subscribe((nextAgents) => {
      setAgents([...nextAgents]);
      if (!activeAgentId && nextAgents.length) setActiveAgentId(nextAgents[0].id);
    });
    // initialize
    setAgents(agentManager.listAgents());
    return () => sub.unsubscribe();
  }, [agentManager, activeAgentId]);

  useEffect(() => {
    if (!activeAgentId) return;
    const agent = agentManager.getAgent(activeAgentId);
    if (!agent) return;
    setMessages(agent.messages || []);
  }, [activeAgentId, agentManager, agents]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createAgent = async () => {
    const a = await agentManager.create({
      name: `Agent ${agents.length + 1}`,
      goals: ["Research and summarize"],
    });
    setActiveAgentId(a.id);
  };

  const send = async () => {
    if (!activeAgentId || input.trim() === "") return;
    const content = input.trim();
    setInput("");
    await agentManager.sendUserMessage(activeAgentId, content);
  };

  const runBrowse = async (url: string) => {
    if (!activeAgentId) return;
    await agentManager.enqueueAction(activeAgentId, {
      type: "browse",
      payload: { url },
    } as AgentAction);
  };

  return (
    <div className="flex h-full w-full bg-brand-dark animate-[fadeIn_0.5s_ease-out]">
      {/* Sidebar: Agents List */}
      <aside className="w-64 border-r border-[#25252b] bg-[#0F0F12] flex flex-col">
        <div className="p-4 border-b border-[#25252b]">
          <h3 className="text-brand-lime font-bold text-sm tracking-widest uppercase mb-1">Sub-Agents</h3>
          <p className="text-xs text-slate-500">Manage your autonomous workers</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveAgentId(a.id)}
              className={`w-full text-left p-3 rounded-lg transition-all text-sm font-mono group relative border ${
                a.id === activeAgentId 
                  ? "bg-[#1C1C21] border-brand-lime text-white shadow-[0_0_15px_rgba(210,241,89,0.1)]" 
                  : "bg-transparent border-transparent text-slate-400 hover:bg-[#1C1C21] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${a.id === activeAgentId ? 'bg-brand-lime animate-pulse' : 'bg-slate-600'}`}></div>
                <span className="truncate">{a.name}</span>
              </div>
            </button>
          ))}
          
          {agents.length === 0 && (
            <div className="text-center p-4 text-slate-600 text-xs italic">
              No agents deployed.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#25252b]">
          <button 
            onClick={createAgent}
            className="w-full py-2 bg-[#1C1C21] hover:bg-brand-lime hover:text-black border border-slate-700 hover:border-brand-lime text-slate-300 rounded text-xs font-bold uppercase tracking-wider transition-all"
          >
            + Deploy Agent
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-brand-dark relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {(messages || []).map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl p-4 border ${
                m.role === 'user' 
                  ? 'bg-[#1C1C21] border-slate-700 text-white rounded-tr-none' 
                  : m.role === 'system'
                  ? 'bg-[#151518] border-dashed border-slate-700 text-slate-400 font-mono text-xs w-full'
                  : 'bg-brand-cyan/5 border-brand-cyan/30 text-brand-cyan rounded-tl-none'
              }`}>
                {m.role !== 'user' && (
                  <div className="text-[10px] uppercase font-bold opacity-50 mb-1 tracking-wider">
                    {m.role === 'system' ? 'System Log' : activeAgentId ? agentManager.getAgent(activeAgentId)?.name : 'Agent'}
                  </div>
                )}
                
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {m.content}
                </div>

                {m.meta?.url && (
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => runBrowse(m.meta!.url)}
                      className="text-xs bg-black/20 hover:bg-black/40 px-2 py-1 rounded border border-current opacity-70 hover:opacity-100 transition-opacity"
                    >
                      Retry Fetch: {new URL(m.meta.url).hostname}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#25252b] bg-[#0F0F12]">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#1C1C21] border border-[#25252b] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime transition-all placeholder:text-slate-600"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={activeAgentId ? "Give instructions or ask a question..." : "Select or create an agent first"}
              disabled={!activeAgentId}
            />
            <button 
              onClick={send}
              disabled={!activeAgentId}
              className="bg-brand-lime text-black px-6 rounded-lg font-bold text-sm hover:bg-[#dfff6b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              SEND
            </button>
          </div>
        </div>
      </main>

      {/* Right Tools Panel */}
      <aside className="w-72 border-l border-[#25252b] bg-[#0F0F12] p-4 hidden lg:flex flex-col gap-6">
        <div>
          <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Command Center</h4>
          
          <div className="space-y-4">
            <div className="bg-[#1C1C21] p-3 rounded border border-[#25252b]">
              <label className="block text-xs text-slate-400 mb-2 font-mono">Manual Browse</label>
              <div className="flex gap-2">
                <input 
                  id="url-browse" 
                  placeholder="example.com" 
                  className="flex-1 bg-black/30 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-cyan"
                />
                <button
                  onClick={() => {
                    const el = document.getElementById("url-browse") as HTMLInputElement | null;
                    if (el?.value) runBrowse(el.value.startsWith('http') ? el.value : `https://${el.value}`);
                  }}
                  className="bg-brand-cyan/20 text-brand-cyan px-2 py-1 rounded text-xs border border-brand-cyan/50 hover:bg-brand-cyan/30"
                >
                  GO
                </button>
              </div>
            </div>
            
            <div className="bg-[#1C1C21] p-3 rounded border border-[#25252b]">
              <label className="block text-xs text-slate-400 mb-2 font-mono">Memory Stats</label>
              <div className="text-xs text-slate-500">
                <div className="flex justify-between mb-1">
                  <span>Context Usage</span>
                  <span className="text-brand-purple">12%</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full">
                  <div className="bg-brand-purple w-[12%] h-full rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-auto">
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded text-yellow-500 text-xs leading-relaxed">
            <strong>Note:</strong> Agents operate autonomously. Verify all external actions.
          </div>
        </div>
      </aside>
    </div>
  );
};
