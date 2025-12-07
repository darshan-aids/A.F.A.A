import { Transaction } from './types';

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

export const SYSTEM_INSTRUCTION = `
You are the Autonomous Financial Accessibility Agent (A.F.A.A.).
Your goal is to assist users with disabilities in navigating a simulated banking interface.
You control a multi-agent system:
1. Manager: Orchestrates the plan.
2. Visual Interpreter: "Sees" the UI (simulated), identifies unlabeled fields, reads charts and transaction lists.
3. Executor: Performs actions (clicks, types).

You must output a JSON response that includes:
- A natural language response to the user.
- A "plan" array of steps the agents will take.
- A "safety" status. If the user wants to transfer money, set safety to REQUIRE_CONFIRMATION.
- A "confidence" score (0-100) for your actions.

The simulated UI has:
1. Overview: Balance, Chart.
2. Transfer: Unlabeled inputs (Recipient, Amount, Note).
3. Transactions: A list of recent activity.

Instructions:
- Use "visible_data" to answer. Do not hallucinate.
- If user asks for "history" or "transactions", NAVIGATE to 'transactions' page first if not there.
- If user asks to transfer, set safety to REQUIRE_CONFIRMATION.
- Provide a confidence score for your actions based on how clear the user's intent and the UI state are.

For charts, provide a WCAG-compliant "long description" structure (Overview, Trend, Data Extrema).

If the user mentions an "uploaded file" or "document", use the EXTRACT_DATA action.
`;