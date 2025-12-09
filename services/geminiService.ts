
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { AgentAction, SafetyStatus, DashboardState } from '../types';

// Initialize the client
// NOTE: Process.env.API_KEY is handled by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AgentResponse {
  message: string;
  actions: AgentAction[];
  safety: SafetyStatus;
  thoughtProcess: string[];
}

export interface RequestConfig {
  simpleMode?: boolean;
}

export const processUserRequest = async (
  userMessage: string,
  dashboardState: DashboardState,
  config?: RequestConfig
): Promise<AgentResponse> => {
  try {
    const model = 'gemini-2.5-flash'; 

    const screenContext = {
      current_screen: dashboardState.currentPage,
      visible_data: {
        balance: dashboardState.balance,
        transfer_form: dashboardState.currentPage === 'transfer' ? dashboardState.transferForm : 'Not visible',
        recent_transactions: dashboardState.currentPage === 'transactions' ? dashboardState.transactions : 'User must navigate to Transactions page to see details',
        transaction_status: dashboardState.lastTransactionStatus
      }
    };

    let prompt = `
      User Request: "${userMessage}"
      Current Visual Context (JSON): ${JSON.stringify(screenContext)}
      
      Instructions:
      1. Use "visible_data" to answer questions.
      2. WORKFLOW MAPPING:
         - "Transfer to [Name]": NAVIGATE 'transfer' -> FILL_INPUT 'recipient' [Name] -> FILL_INPUT 'amount'.
         - "Pay Electricity Bill" or "Pay Bill": NAVIGATE 'transfer' -> FILL_INPUT 'recipient' "Utility Co" -> FILL_INPUT 'note' "Electricity Bill".
         - "Invest in Gold" or "Buy Digital Gold": NAVIGATE 'transfer' -> FILL_INPUT 'recipient' "Gold Vault" -> FILL_INPUT 'note' "Investment".
         - "Download Tax Docs": NAVIGATE 'reports' -> CLICK "2024 Tax Documents".
      3. BROWSER TOOLS:
         - "NAVIGATE": Go to a page (overview, transfer, transactions, reports, agent-mode, profile).
         - "FILL_INPUT": key targets are 'recipient', 'amount', 'note'.
         - "CLICK": target buttons or links.
      4. SAFETY: If the user wants to move money (transfer, pay, invest), set safety to "REQUIRE_CONFIRMATION".
      5. CONFIDENCE: Score 0-100 based on ambiguity.
    `;

    if (config?.simpleMode) {
      prompt += `
      ADOPT PERSONA: Financial Translator. 
      - Simplify ALL financial jargon into plain English.
      - Keep sentences short.
      `;
    }

    prompt += `
      Return a JSON object:
      {
        "message": "Natural language response describing what you are doing",
        "thoughtProcess": ["Step 1: Identify intent...", "Step 2: Map to action..."],
        "safety": "SAFE" | "WARNING" | "REQUIRE_CONFIRMATION",
        "actions": [
          {
            "type": "NAVIGATE" | "FILL_INPUT" | "CLICK" | "ANALYZE_CHART" | "SCREENSHOT" | "READ_PAGE" | "SCROLL" | "WAIT" | "VERIFY" | "HOVER" | "GET_ELEMENT_VALUE",
            "page": "string",
            "target": "string",
            "value": "string",
            "description": "string",
            "confidence": number,
            "elementText": "string",
            "selector": "string"
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            thoughtProcess: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            safety: { type: Type.STRING },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  target: { type: Type.STRING },
                  page: { type: Type.STRING },
                  value: { type: Type.STRING },
                  description: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  elementText: { type: Type.STRING },
                  selector: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  direction: { type: Type.STRING },
                  duration: { type: Type.NUMBER },
                  expectedText: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      let parsed;
      try {
        parsed = JSON.parse(response.text);
      } catch (e) {
        console.error("Failed to parse JSON response", e);
        throw new Error("Invalid JSON response");
      }

      if (!parsed || typeof parsed !== 'object') {
        parsed = {};
      }

      return {
        message: parsed.message || "I have processed your request.",
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        safety: parsed.safety || SafetyStatus.SAFE,
        thoughtProcess: Array.isArray(parsed.thoughtProcess) ? parsed.thoughtProcess : []
      } as AgentResponse;
    }
    
    throw new Error("Empty response from Gemini");

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      message: "I encountered an error connecting to the neural core. Please try again.",
      actions: [],
      safety: SafetyStatus.SAFE,
      thoughtProcess: ["Error encountered during generation."]
    };
  }
};
