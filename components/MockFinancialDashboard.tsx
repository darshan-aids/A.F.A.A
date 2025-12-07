import React from 'react';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardState } from '../types';
import { MOCK_CHART_DATA } from '../constants';

interface MockFinancialDashboardProps {
  state: DashboardState;
  scanning: boolean;
  highlightTarget: string | null;
  onFileUpload?: (file: File) => void;
  onNavigate?: (page: DashboardState['currentPage']) => void;
}

export const MockFinancialDashboard: React.FC<MockFinancialDashboardProps> = ({ state, scanning, highlightTarget, onFileUpload, onNavigate }) => {
  
  const renderHighlight = (targetId: string, label: string) => {
    if (highlightTarget && targetId.includes(highlightTarget)) {
      return (
        <div className="absolute inset-0 border-2 border-brand-lime bg-brand-lime/10 z-50 animate-pulse rounded-[inherit] pointer-events-none">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-lime text-black text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(210,241,89,0.5)]">
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
      className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 relative ${
        active 
          ? 'bg-brand-lime text-black font-bold shadow-[0_0_20px_rgba(210,241,89,0.2)]' 
          : 'bg-[#25252b] text-slate-400 hover:bg-[#2F2F36] hover:text-white'
      }`}
    >
      {renderHighlight(`nav-${id}`, 'NAV')}
      {label}
    </button>
  );

  return (
    <div className="w-full h-full bg-brand-dark text-white overflow-y-auto p-6 md:p-10 font-sans selection:bg-brand-lime selection:text-black">
      
      {/* Simulation Overlay for Vision Agent */}
      {scanning && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-brand-purple/10 backdrop-blur-[1px]"></div>
          <div className="w-full h-1 bg-brand-purple/80 shadow-[0_0_30px_rgba(139,92,246,1)] animate-scan fixed top-0 left-0"></div>
          <div className="bg-black/80 text-brand-purple px-4 py-2 rounded-full border border-brand-purple/50 font-mono text-xs backdrop-blur-md">
            VISION_AGENT::ANALYZING_INTERFACE...
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="flex gap-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          <div className="relative p-1">
             {renderHighlight('nav', 'NAVIGATION')}
             <div className="flex gap-3">
              <NavPill id="overview" label="Overview" active={state.currentPage === 'overview'} />
              <NavPill id="transactions" label="Insights" active={state.currentPage === 'transactions'} />
              <NavPill id="transfer" label="Transfer" active={state.currentPage === 'transfer'} />
              <button className="px-6 py-2.5 rounded-full text-sm font-medium bg-[#25252b] text-slate-400 hover:text-white">Reports</button>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-lime">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-lime relative">
             <div className="absolute top-2 right-2.5 w-2 h-2 bg-brand-lime rounded-full border border-brand-dark"></div>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-br from-brand-lime to-brand-purple">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Darlene" alt="User" className="w-full h-full rounded-full bg-brand-dark border-2 border-brand-dark" />
          </div>
        </div>
      </div>

      {state.currentPage === 'overview' && (
        <div className="animate-[fadeIn_0.5s_ease-out]">
          {/* Hero Text */}
          <div className="mb-10">
            <p className="text-slate-400 text-sm mb-1">Welcome back,</p>
            <h1 className="text-5xl font-light text-white tracking-tight">Darlene <span className="font-semibold">Robertson</span></h1>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Dark Card 1 */}
            <div className="bg-brand-card p-8 rounded-[2.5rem] relative group hover:bg-[#25252b] transition-all duration-300">
              {renderHighlight('balance', 'MAIN_ACCOUNT')}
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-slate-300 font-medium">Main Account</span>
                </div>
                <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transform -rotate-45 hover:rotate-0 transition-transform shadow-lg">
                  ➜
                </button>
              </div>
              <div className="text-4xl font-medium mb-3 tracking-tight">
                 ${state.balance.toLocaleString()}
              </div>
              <div className="text-xs text-brand-mint font-mono font-medium flex items-center gap-1">
                <span>+42.8%</span>
                <span className="text-slate-500">from previous month</span>
              </div>
            </div>

            {/* Dark Card 2 */}
            <div className="bg-brand-card p-8 rounded-[2.5rem] relative group hover:bg-[#25252b] transition-all duration-300">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-slate-300 font-medium">Monthly Spend</span>
                </div>
                <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transform -rotate-45 hover:rotate-0 transition-transform shadow-lg">
                  ➜
                </button>
              </div>
              <div className="text-4xl font-medium mb-3 tracking-tight">296,241</div>
              <div className="text-xs text-brand-mint font-mono font-medium flex items-center gap-1">
                <span>+26.3%</span>
                <span className="text-slate-500">from previous week</span>
              </div>
            </div>

             {/* Lime Card (Highlights) */}
             <div className="bg-brand-lime p-8 rounded-[2.5rem] text-black relative group shadow-[0_10px_40px_rgba(210,241,89,0.2)]">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-black/70 font-semibold">Company</span>
                </div>
                <button className="w-10 h-10 rounded-full bg-black text-brand-lime flex items-center justify-center transform -rotate-45 hover:rotate-0 transition-transform">
                  ➜
                </button>
              </div>
              <div className="text-4xl font-bold mb-3 tracking-tight">76,314</div>
              <div className="text-xs text-black/70 font-bold font-mono flex items-center gap-1">
                <span>-18.4%</span>
                <span className="opacity-60">from previous week</span>
              </div>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex gap-4 mb-6">
             <button className="px-6 py-2 rounded-full bg-brand-lime text-black font-bold text-sm">All</button>
             <button className="px-6 py-2 rounded-full bg-brand-card text-slate-400 hover:text-white text-sm transition-colors">Engagement</button>
             <button className="px-6 py-2 rounded-full bg-brand-card text-slate-400 hover:text-white text-sm transition-colors">Visit</button>
             <button className="px-6 py-2 rounded-full bg-brand-card text-slate-400 hover:text-white text-sm transition-colors">Post</button>
             <div className="flex-1"></div>
             <button className="w-10 h-10 rounded-full bg-brand-card text-slate-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
             </button>
             <button className="px-4 py-2 rounded-full bg-brand-card text-slate-300 text-sm flex items-center gap-2">
                Download reports
             </button>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[400px]">
             
             {/* Left: Chart */}
             <div className="bg-brand-card p-8 rounded-[2.5rem] relative flex flex-col group hover:bg-[#25252b] transition-colors">
                {renderHighlight('chart', 'ANALYTICS')}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                     </div>
                     <span className="text-slate-300 font-medium">Engagement rate</span>
                  </div>
                  <div className="flex gap-2">
                     <button className="px-4 py-1.5 rounded-full bg-[#151518] text-xs text-slate-400">Monthly</button>
                     <button className="px-4 py-1.5 rounded-full bg-brand-lime text-black text-xs font-bold shadow-[0_0_15px_rgba(210,241,89,0.3)]">Annually</button>
                  </div>
                </div>

                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={MOCK_CHART_DATA} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} dy={10} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-[#1a1a1e] border border-brand-purple/30 p-4 rounded-xl shadow-2xl">
                                <p className="text-slate-400 text-xs mb-1">April, 2023</p>
                                <p className="text-2xl font-bold text-white">{payload[0].value?.toLocaleString()}</p>
                                <p className="text-xs text-brand-mint font-bold mt-1">+12.8%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <defs>
                         <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                        </linearGradient>
                        <pattern id="stripe-pattern" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                          <line x1="0" y1="0" x2="0" y2="8" stroke="#6d28d9" strokeWidth="2" opacity="0.5" />
                        </pattern>
                      </defs>
                      <Bar 
                        dataKey="margin" 
                        fill="url(#stripe-pattern)" 
                        radius={[100, 100, 100, 100]} 
                        stackId="a"
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="url(#purpleGradient)" 
                        radius={[100, 100, 100, 100]}
                        stackId="b"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* Middle: Heatmap Grid Placeholder */}
             <div className="bg-brand-card p-8 rounded-[2.5rem] relative flex flex-col group hover:bg-[#25252b] transition-colors">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-300">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                      </div>
                      <span className="text-slate-300 font-medium">Time visit</span>
                   </div>
                   <button className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold flex items-center gap-1">
                      Follower <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                   </button>
                </div>
                
                {/* Simulated Heatmap Grid */}
                <div className="flex-1 grid grid-cols-7 gap-2 content-center">
                   {Array.from({ length: 42 }).map((_, i) => {
                      const opacity = Math.random();
                      const isLime = opacity > 0.7;
                      return (
                        <div 
                          key={i} 
                          className={`rounded-lg w-full h-8 ${isLime ? 'bg-brand-lime shadow-[0_0_10px_rgba(210,241,89,0.3)]' : 'bg-[#2A2A30]'} transition-all duration-500 hover:scale-110`}
                          style={{ opacity: isLime ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.4 }}
                        ></div>
                      )
                   })}
                </div>
                <div className="flex justify-between mt-4 text-[10px] text-slate-500 font-mono uppercase">
                   <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>
             </div>

             {/* Right: Messages/Transactions */}
             <div className="bg-brand-card p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col group hover:bg-[#25252b] transition-colors">
                {renderHighlight('transactions', 'MESSAGES')}
                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-300">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                         </svg>
                      </div>
                      <span className="font-medium text-slate-300">Messages</span>
                   </div>
                   <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform">+</button>
                </div>

                <div className="mb-6 relative">
                   <input type="text" placeholder="Search message" className="w-full bg-[#151518] rounded-full py-4 px-6 text-sm text-slate-300 focus:outline-none border border-transparent focus:border-slate-700 transition-all placeholder:text-slate-600" />
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 absolute right-4 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                </div>

                <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-hide">
                   {state.transactions.slice(0, 5).map((tx, idx) => (
                      <div key={tx.id} className="flex items-center gap-4 p-2 hover:bg-[#1a1a1e] rounded-2xl cursor-pointer transition-colors group">
                         <div className="w-12 h-12 rounded-full flex-shrink-0 relative">
                            <img 
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${tx.description}`} 
                              alt="Avatar" 
                              className="w-full h-full rounded-full bg-slate-800"
                            />
                            {idx < 2 && <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-lime border-2 border-brand-card rounded-full"></div>}
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                               <h4 className="text-sm font-bold text-white truncate">{tx.description}</h4>
                               <span className="text-[10px] text-slate-500">3 min</span>
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                               {tx.type === 'credit' ? 'Incoming transfer confirmed' : `Payment of $${tx.amount} successful`}
                            </p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {state.currentPage === 'transfer' && (
        <div className="flex items-center justify-center h-full animate-[fadeIn_0.5s_ease-out]">
           <div className="bg-brand-card p-12 rounded-[3rem] w-full max-w-xl relative shadow-2xl border border-slate-800/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime/5 rounded-full blur-[100px] pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-10">
                 <h2 className="text-3xl font-light">Quick <span className="text-brand-lime font-bold">Transfer</span></h2>
                 <div className="w-12 h-12 rounded-full bg-[#25252b] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                 </div>
              </div>
              
              <div className="space-y-8">
                 <div className="group relative" data-target="recipient">
                    {renderHighlight('recipient', 'RECIPIENT')}
                    <label className="block text-xs uppercase tracking-widest text-slate-500 mb-3 font-bold group-hover:text-brand-lime transition-colors">Recipient</label>
                    <div className="flex items-center gap-4 bg-[#151518] p-5 rounded-[1.5rem] border border-transparent group-focus-within:border-brand-lime/50 transition-colors">
                       <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">@</div>
                       <input 
                          type="text" 
                          value={state.transferForm.recipient}
                          readOnly
                          placeholder="Search people..."
                          className="bg-transparent w-full focus:outline-none text-white placeholder:text-slate-600 font-medium"
                       />
                       <button className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">▼</button>
                    </div>
                 </div>

                 <div className="group relative" data-target="amount">
                    {renderHighlight('amount', 'AMOUNT')}
                    <label className="block text-xs uppercase tracking-widest text-slate-500 mb-3 font-bold group-hover:text-brand-lime transition-colors">Amount</label>
                    <div className="flex items-center gap-4 bg-[#151518] p-5 rounded-[1.5rem] border border-transparent group-focus-within:border-brand-lime/50 transition-colors">
                       <span className="text-brand-lime font-bold text-2xl">$</span>
                       <input 
                          type="text" 
                          value={state.transferForm.amount}
                          readOnly
                          placeholder="0.00"
                          className="bg-transparent w-full focus:outline-none text-white text-2xl font-bold placeholder:text-slate-700"
                       />
                    </div>
                 </div>

                 <div className="pt-6 relative" data-target="submit">
                    {renderHighlight('submit', 'EXECUTE')}
                    <button className="w-full bg-brand-lime text-black py-5 rounded-[1.5rem] font-bold text-lg hover:bg-[#dfff6b] transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(210,241,89,0.3)] flex items-center justify-center gap-2">
                       <span>Send Money Now</span>
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                       </svg>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {state.currentPage === 'transactions' && (
         <div className="bg-brand-card rounded-[3rem] p-10 h-full relative overflow-hidden animate-[fadeIn_0.5s_ease-out]">
            {renderHighlight('transactions', 'HISTORY_GRID')}
            <div className="flex justify-between items-center mb-10">
               <h2 className="text-3xl font-light">Recent <span className="font-bold text-brand-purple">Insights</span></h2>
               {onFileUpload && (
                  <button 
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand-lime text-black font-bold hover:bg-[#dfff6b] transition-colors text-sm shadow-lg"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                     </svg>
                     Upload Statement
                  </button>
               )}
               <input 
                 id="file-upload" 
                 type="file" 
                 className="hidden" 
                 onChange={(e) => e.target.files?.[0] && onFileUpload?.(e.target.files[0])} 
               />
            </div>
            
            <div className="overflow-y-auto h-[calc(100%-6rem)] pr-4">
               <table className="w-full text-left border-separate border-spacing-y-3">
                  <thead>
                     <tr className="text-slate-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-bold">Transaction</th>
                        <th className="px-6 py-4 font-bold">Category</th>
                        <th className="px-6 py-4 font-bold">Date</th>
                        <th className="px-6 py-4 text-right font-bold">Amount</th>
                        <th className="px-6 py-4 text-center font-bold">Status</th>
                     </tr>
                  </thead>
                  <tbody>
                     {state.transactions.map((tx) => (
                        <tr key={tx.id} className="bg-[#151518] hover:bg-[#1f1f24] transition-colors group rounded-2xl">
                           <td className="px-6 py-5 rounded-l-[1.5rem]">
                              <div className="flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                                    tx.type === 'credit' ? 'bg-brand-mint text-black' : 'bg-[#2A2A30] text-white'
                                 }`}>
                                    {tx.type === 'credit' ? '↓' : '↑'}
                                 </div>
                                 <span className="font-bold text-white text-lg">{tx.description}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <span className="px-3 py-1.5 rounded-full bg-[#2A2A30] text-xs text-slate-300 font-medium">
                                 {tx.category}
                              </span>
                           </td>
                           <td className="px-6 py-5 text-slate-400 font-medium">{tx.date}</td>
                           <td className={`px-6 py-5 text-right font-mono font-bold text-lg ${
                              tx.type === 'credit' ? 'text-brand-mint' : 'text-white'
                           }`}>
                              {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                           </td>
                           <td className="px-6 py-5 rounded-r-[1.5rem] text-center">
                              <div className="w-3 h-3 rounded-full bg-brand-mint mx-auto shadow-[0_0_10px_rgba(0,208,132,0.8)] animate-pulse"></div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      )}

    </div>
  );
};