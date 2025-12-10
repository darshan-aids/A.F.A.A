

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
    screenshots?: string[];
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
  currentPage: 'overview' | 'transfer' | 'settings' | 'transactions' | 'reports' | 'agent-mode' | 'profile';
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
  type: 'NAVIGATE' | 'FILL_INPUT' | 'CLICK' | 'ANALYZE_CHART' | 'EXTRACT_DATA' | 'SCREENSHOT' | 'READ_PAGE' | 'WAIT' | 'SCROLL' | 'VERIFY' | 'HOVER' | 'GET_ELEMENT_VALUE' | 'WAIT_FOR_SELECTOR' | 'BROWSE';
  target?: string;
  page?: string;
  url?: string;
  value?: string;
  description?: string;
  confidence?: number;
  
  // Advanced Automation Properties
  selector?: string;
  elementText?: string;
  amount?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  expectedText?: string;
  payload?: any;
}

export interface BrowserResult {
  url: string;
  text?: string;
  links?: string[];
  screenshot?: string;
  timestamp?: string;
}

export interface ProcessingStep {
  agent: AgentType;
  status: 'pending' | 'processing' | 'completed' | 'waiting_approval';
  description: string;
  confidence?: number;
  actionType?: string;
  data?: any;
  payload?: BrowserResult | null;
}

// Sub-Agent Types
export type AgentMessage = {
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  timestamp?: string;
  meta?: Record<string, any>;
};

export type SubAgent = {
  id: string;
  name: string;
  goals: string[];
  messages: AgentMessage[];
  memory: any[];
  running: boolean;
  createdAt: string;
};
