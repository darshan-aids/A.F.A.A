import React from 'react';

export interface TransactionPreview {
  from: string;
  to: string;
  amount: string;
  newBalance: string;
  note?: string;
}

interface SafetyModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  transactionDetails?: TransactionPreview;
}

export const SafetyModal: React.FC<SafetyModalProps> = ({ isOpen, onConfirm, onCancel, transactionDetails }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-all duration-300">
      <div className="bg-slate-900 border border-brand-orange/50 rounded-xl max-w-md w-full shadow-[0_0_60px_rgba(255,107,53,0.15)] overflow-hidden scale-100 animate-[fadeIn_0.2s_ease-out]">
        
        {/* Header */}
        <div className="bg-brand-orange/10 p-4 border-b border-brand-orange/20 flex items-center gap-3">
          <div className="p-2 bg-brand-orange/20 rounded-full text-brand-orange animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">SECURITY CHECK</h2>
            <p className="text-xs text-brand-orange font-medium uppercase tracking-wider">Consequential Action Detected</p>
          </div>
        </div>

        <div className="p-6">
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            The agent is attempting to initiate a financial transfer. 
            Please review the details below carefully before authorizing.
          </p>

          {/* Transaction Card */}
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-brand-orange/5 blur-xl rounded-full -mr-8 -mt-8 pointer-events-none"></div>
            
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-800/50">
                <tr>
                  <td className="py-2 text-slate-500">From</td>
                  <td className="py-2 text-right text-slate-300 font-medium">{transactionDetails?.from || 'Checking Account'}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500">To</td>
                  <td className="py-2 text-right text-white font-bold">{transactionDetails?.to || 'Unknown Recipient'}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500">Amount</td>
                  <td className="py-2 text-right text-brand-cyan font-mono text-lg font-bold">
                    ${Number(transactionDetails?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {transactionDetails?.note && (
                  <tr>
                    <td className="py-2 text-slate-500">Note</td>
                    <td className="py-2 text-right text-slate-400 italic">"{transactionDetails.note}"</td>
                  </tr>
                )}
                <tr className="border-t border-slate-700">
                  <td className="pt-3 text-slate-500 font-medium">New Balance</td>
                  <td className="pt-3 text-right text-brand-mint font-mono font-bold">
                     ${transactionDetails?.newBalance || '---'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button 
              onClick={onCancel}
              className="px-4 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-brand-orange to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-sm shadow-[0_4px_20px_rgba(239,68,68,0.3)] hover:shadow-[0_4px_25px_rgba(239,68,68,0.5)] transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <span>Authorize Transfer</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};