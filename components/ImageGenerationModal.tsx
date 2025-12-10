
import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';

interface ImageGenerationModalProps {
  onClose: () => void;
}

const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];

export const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    const img = await generateImage(prompt, aspectRatio);
    setResultImage(img);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-[#1C1C21] border border-[#25252b] rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
        
        {/* Controls */}
        <div className="p-6 md:w-1/2 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-[#25252b]">
          <div className="flex justify-between items-center">
             <h2 className="text-lg font-bold text-white flex items-center gap-2">
               <span className="text-brand-purple">✦</span> Creative Studio
             </h2>
             <button onClick={onClose} className="md:hidden text-slate-500 hover:text-white">✕</button>
          </div>
          
          <div>
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 block">Prompt</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the card design or financial visualization..."
              className="w-full h-32 bg-black/40 border border-[#25252b] rounded-lg p-3 text-sm text-white resize-none focus:border-brand-purple focus:outline-none"
            />
          </div>

          <div>
             <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 block">Aspect Ratio</label>
             <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map(ratio => (
                   <button 
                     key={ratio}
                     onClick={() => setAspectRatio(ratio)}
                     className={`py-1.5 text-xs rounded border transition-colors ${aspectRatio === ratio ? 'bg-brand-purple text-white border-brand-purple' : 'bg-[#151518] text-slate-400 border-[#25252b] hover:border-slate-600'}`}
                   >
                     {ratio}
                   </button>
                ))}
             </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className="mt-auto bg-brand-purple hover:bg-purple-500 text-white py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 Generating...
              </>
            ) : !prompt ? (
               'Enter Prompt' 
            ) : (
              'Generate Asset'
            )}
          </button>
        </div>

        {/* Preview */}
        <div className="p-6 md:w-1/2 bg-[#0F0F12] flex flex-col relative min-h-[300px]">
           <button onClick={onClose} className="hidden md:block absolute top-4 right-4 text-slate-500 hover:text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
           
           <div className="flex-1 flex items-center justify-center">
              {resultImage ? (
                <img src={resultImage} alt="Generated" className="max-w-full max-h-[400px] rounded-lg shadow-lg object-contain" />
              ) : (
                <div className="text-center text-slate-600">
                   <div className="text-4xl mb-3 opacity-20">🖼️</div>
                   <p className="text-sm">Preview will appear here</p>
                </div>
              )}
           </div>
           
           {resultImage && (
             <div className="mt-4 flex justify-end">
               <a href={resultImage} download={`generated-${aspectRatio}.png`} className="text-xs text-brand-purple hover:text-white flex items-center gap-1">
                 Download PNG 
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
               </a>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
