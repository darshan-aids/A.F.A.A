
import React from 'react';
import { BrowserResult } from '../types';

type Props = {
  result?: BrowserResult | null;
  className?: string;
  onOpenLink?: (url: string) => void;
};

export const MiniBrowser: React.FC<Props> = ({ result, className = '', onOpenLink }) => {
  if (!result) return null;

  const isLoading = !result.text && !result.screenshot;

  return (
    <div className={`mt-4 rounded-xl overflow-hidden border border-[#333] bg-[#0F0F12] shadow-2xl font-mono ${className}`}>
        {/* Toolbar */}
        <div className="bg-[#151518] px-4 py-2 flex items-center gap-3 border-b border-[#333]">
            {/* Window Controls */}
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/30"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/30"></div>
            </div>
            
            {/* Nav Controls */}
            <div className="flex gap-2 text-slate-600 ml-2">
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>

            {/* Address Bar */}
            <div className="flex-1 bg-[#09090b] rounded px-3 py-1 text-[11px] text-slate-400 truncate flex items-center gap-2 border border-[#25252b] shadow-inner">
                <span className="text-green-500/70 text-[10px]">🔒</span>
                <span className="opacity-90">{result.url || 'about:blank'}</span>
            </div>
        </div>
        
        {/* Viewport */}
        <div className="relative bg-[#0F0F12] min-h-[150px] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
           
           {isLoading && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F0F12] z-10">
                   <div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mb-3"></div>
                   <span className="text-xs text-brand-cyan/70 animate-pulse">Connecting...</span>
               </div>
           )}

           <div className={`p-4 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
               {result.screenshot && (
                 <div className="mb-4 rounded border border-[#333] overflow-hidden shadow-lg">
                    <img src={result.screenshot} alt="Page Screenshot" className="w-full h-auto object-contain block" />
                 </div>
               )}
               
               {result.text && (
                   <div className="prose prose-invert prose-xs max-w-none">
                       <div className="leading-relaxed text-slate-300 opacity-90 whitespace-pre-wrap font-sans text-xs">
                           {result.text.length > 1000 ? (
                               <>
                                   {result.text.substring(0, 1000)}
                                   <span className="text-slate-500 italic block mt-2">[...Content Truncated]</span>
                               </>
                           ) : result.text}
                       </div>
                   </div>
               )}

               {/* Detected Links */}
               {result.links && result.links.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[#25252b]">
                     <div className="text-[10px] uppercase tracking-wider font-bold mb-3 text-slate-500 flex items-center gap-2">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        Identified Links <span className="bg-[#25252b] px-1.5 rounded text-white">{result.links.length}</span>
                     </div>
                     <div className="flex flex-wrap gap-2">
                         {result.links.slice(0, 8).map((link, i) => (
                             <button 
                               key={i}
                               onClick={() => onOpenLink?.(link)}
                               className="group px-2.5 py-1.5 bg-[#1C1C21] rounded text-[10px] text-brand-cyan/80 border border-brand-cyan/10 hover:border-brand-cyan/40 hover:bg-brand-cyan/10 transition-all truncate max-w-[200px] flex items-center gap-1.5"
                               title={link}
                             >
                               <span className="w-1 h-1 rounded-full bg-brand-cyan/50 group-hover:bg-brand-cyan"></span>
                               {link.replace(/^https?:\/\/(www\.)?/, '').substring(0, 25)}...
                             </button>
                         ))}
                         {result.links.length > 8 && (
                             <span className="px-2 py-1.5 text-[10px] text-slate-500">+{result.links.length - 8} more</span>
                         )}
                     </div>
                  </div>
               )}
           </div>
        </div>
    </div>
  );
};

export default MiniBrowser;
