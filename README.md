# A.F.A.A. - Autonomous Financial Accessibility Agent

> A multi-agent system powered by Gemini 3 Pro to navigate inaccessible financial interfaces for users with disabilities.

## 🚀 Overview

The A.F.A.A. is designed to bridge the gap between inaccessible financial websites and users with visual or motor impairments. It uses a **Multi-Agent Architecture** to "see" the UI, reason about it, and execute actions autonomously.

### Key Features
- **Visual Interpreter**: Reads complex charts and unlabeled forms using Gemini's vision capabilities.
- **Safety First**: Implements Human-in-the-Loop (HITL) protocols for all financial transactions.
- **Accessibility**: WCAG-compliant output, keyboard navigation, and simplified jargon modes.
- **Cyber UI**: A high-contrast, modern interface designed for clarity.

## 🛠️ Architecture

The system is composed of three agents orchestrated by `App.tsx`:
1.  **Manager**: Decomposes user intents (e.g., "Transfer $500") into steps.
2.  **Visual Interpreter**: Analyzes the dashboard state (`MockFinancialDashboard.tsx`) to find data.
3.  **Executor**: Updates the state (navigates, types, clicks).

## 📦 Setup

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Set your API Key:
    - Ensure `process.env.API_KEY` is available in your environment.
4.  Run the development server: `npm run dev`

## 🧪 Testing

This project includes a mock environment (`MockFinancialDashboard`) to simulate a banking portal.
- **Ctrl+T**: Quick Transfer shortcut
- **Ctrl+B**: Check Balance shortcut
- **Ctrl+H**: History shortcut

## ♿ Accessibility

We strive for **WCAG 2.1 AA** compliance.
- All interactive elements have aria-labels.
- High contrast color ratios (Brand Lime/Cyan on Dark).
- Focus states are clearly visible.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
