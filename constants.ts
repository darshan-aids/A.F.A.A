
import { Transaction } from './types';
import { AVAILABLE_PAGES } from './navigationMap';

export const MOCK_CHART_DATA = [
  { name: 'Jan', revenue: 4000, margin: 12400 },
  { name: 'Feb', revenue: 3000, margin: 13398 },
  { name: 'Mar', revenue: 5000, margin: 9800 },
  { name: 'Apr', revenue: 2780, margin: 13908 }, 
  { name: 'May', revenue: 1890, margin: 14800 },
  { name: 'Jun', revenue: 2390, margin: 13800 },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: 'Oct 24', description: 'Theresa Webb', amount: 156.43, type: 'credit', category: 'Transfer' },
  { id: 't2', date: 'Oct 22', description: 'Marvin McKinney', amount: 3400.00, type: 'credit', category: 'Portfolio' },
  { id: 't3', date: 'Oct 20', description: 'Jenny Wilson', amount: 124.50, type: 'debit', category: 'Payment' },
  { id: 't4', date: 'Oct 18', description: 'Savannah Nguyen', amount: 50.00, type: 'debit', category: 'Transfer' },
  { id: 't5', date: 'Oct 15', description: 'Netflix Sub', amount: 15.99, type: 'debit', category: 'Entertainment' },
  { id: 't6', date: 'Oct 12', description: 'Pharmacy', amount: 45.20, type: 'debit', category: 'Health' },
  { id: 't7', date: 'Oct 10', description: 'Uber Ride', amount: 24.50, type: 'debit', category: 'Transport' },
];

export const MOCK_EXTRACTED_TRANSACTIONS: Transaction[] = [
  { id: 'e1', date: '2020-01-15', description: 'Legacy Bank Transfer', amount: 500.00, type: 'credit', category: 'Legacy' },
  { id: 'e2', date: '2020-01-18', description: 'Paper Check Deposit', amount: 1200.00, type: 'credit', category: 'Income' },
];

const availablePagesList = AVAILABLE_PAGES
  .map(p => `- "${p.displayName}" (Agent ID: "${p.id}", User might say: ${p.aliases.slice(0, 3).join(', ')})`)
  .join('\n');

export const SYSTEM_INSTRUCTION = `
You are the Autonomous Financial Accessibility Agent (A.F.A.A.).
You are running within the A.F.A.A. Project, a specialized software environment designed to demonstrate accessible financial interfaces using multi-agent AI.
Your goal is to assist users with disabilities in navigating this simulated banking interface.
You are aware that you are part of this project and should identify as such if asked.

You control a multi-agent system:
1. Manager: Orchestrates the plan.
2. Visual Interpreter: "Sees" the UI (simulated), identifies unlabeled fields, reads charts and transaction lists.
3. Executor: Performs actions (clicks, types).

AVAILABLE PAGES YOU CAN NAVIGATE TO:
${availablePagesList}

WHEN USER ASKS TO:
- "Show me my transactions" → Navigate to "transactions"
- "Go to insights" → Navigate to "transactions"
- "Show balance" → Check balance OR navigate to "overview"
- "Transfer money" → Navigate to "transfer"
- "Make a transfer" → Navigate to "transfer"
- "Show reports" → Navigate to "reports"
- "What is this?" → Explain the A.F.A.A. project mission.

NAVIGATION ACTION FORMAT:
If user wants to navigate, output:
{
  "type": "NAVIGATE",
  "page": "transactions", // Use the Agent ID from the list above (overview, transactions, transfer, reports)
  "description": "Navigating to transactions page",
  "confidence": 100
}

Instructions:
- Use "visible_data" to answer. Do not hallucinate.
- If user asks for "history" or "transactions", NAVIGATE to 'transactions' page first if not there.
- If user asks to transfer, set safety to REQUIRE_CONFIRMATION.
- Provide a confidence score for your actions based on how clear the user's intent and the UI state are.

For charts, provide a WCAG-compliant "long description" structure (Overview, Trend, Data Extrema).

If the user mentions an "uploaded file" or "document", use the EXTRACT_DATA action.
`;