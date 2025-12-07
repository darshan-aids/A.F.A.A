export enum AgentType {
  MANAGER = 'MANAGER',
  INTERPRETER = 'INTERPRETER',
  EXECUTOR = 'EXECUTOR',
  USER = 'USER'
}

export enum SafetyStatus {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  REQUIRE_CONFIRMATION = 'REQUIRE_CONFIRMATION'
}

export interface ChatMessage {
  id: string;
  sender: AgentType;
  content: string;
  timestamp: Date;
  metadata?: {
    thoughtChain?: string[];
    safetyStatus?: SafetyStatus;
  };
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: string;
}

export interface DashboardState {
  currentPage: 'overview' | 'transfer' | 'settings' | 'transactions';
  balance: number;
  transferForm: {
    recipient: string;
    amount: string;
    note: string;
  };
  transactions: Transaction[];
  lastTransactionStatus: 'idle' | 'pending' | 'success' | 'failed';
  uploadedFile: File | null;
}

export interface AgentAction {
  type: 'NAVIGATE' | 'FILL_INPUT' | 'CLICK' | 'ANALYZE_CHART' | 'EXTRACT_DATA';
  target?: string;
  value?: string;
  description: string;
  confidence?: number; // 0-100 score
}

export interface ProcessingStep {
  agent: AgentType;
  status: 'pending' | 'processing' | 'completed' | 'waiting_approval';
  description: string;
  confidence?: number;
}