
export interface PageRoute {
  id: string;
  name: string;
  aliases: string[];
  displayName: string;
}

export const AVAILABLE_PAGES: PageRoute[] = [
  {
    id: 'overview',
    name: 'overview',
    aliases: ['dashboard', 'home', 'main', 'start', 'overview', 'balance', 'summary'],
    displayName: 'Overview Dashboard'
  },
  {
    id: 'transactions',
    name: 'insights',
    aliases: ['insights', 'insight', 'transactions', 'transaction', 'history', 'activity', 'transaction history', 'records', 'statement', 'recent'],
    displayName: 'Insights & Transactions'
  },
  {
    id: 'transfer',
    name: 'transfer',
    aliases: ['transfer', 'transfers', 'send money', 'send', 'payment', 'send funds', 'pay'],
    displayName: 'Money Transfer'
  },
  {
    id: 'reports',
    name: 'reports',
    aliases: ['reports', 'report', 'financial reports', 'statements', 'analytics', 'documents', 'docs'],
    displayName: 'Financial Reports'
  },
  {
    id: 'settings',
    name: 'settings',
    aliases: ['settings', 'preferences', 'config', 'profile', 'account'],
    displayName: 'Settings'
  },
  {
    id: 'agent-mode',
    name: 'agent mode',
    aliases: ['agents', 'agent', 'agent mode', 'sub agents', 'comet', 'workers', 'bot manager'],
    displayName: 'Agent Mode'
  }
];

export function detectNavigationTarget(userInput: string): { id: string; displayName: string } | null {
  const input = userInput.toLowerCase();
  
  for (const page of AVAILABLE_PAGES) {
    if (page.id === input || page.name === input) {
        return { id: page.id, displayName: page.displayName };
    }
    for (const alias of page.aliases) {
      if (input.includes(alias)) {
        return { id: page.id, displayName: page.displayName };
      }
    }
  }
  
  return null;
}
