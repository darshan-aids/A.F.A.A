# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of A.F.A.A. seriously. If you discover a security vulnerability, please follow these steps:

1.  **Do not** open a public issue on GitHub.
2.  Email our security team at `security@example.com` (replace with actual contact if deployed).
3.  Include a detailed description of the vulnerability and steps to reproduce it.

## API Key Safety

- This application uses the Google Gemini API.
- **NEVER** commit your `API_KEY` to version control.
- Ensure `process.env.API_KEY` is injected securely in your deployment environment.
- In a production client-side environment, consider using a backend proxy to protect your API credentials.

## Data Privacy

- This is a financial accessibility tool.
- No real financial data is stored or transmitted in this prototype (Mock Data is used).
- In a production build, ensure all Personal Identifiable Information (PII) is handled according to GDPR/CCPA regulations.
