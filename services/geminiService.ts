
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

    // Inject accurate state data so the "Visual Interpreter" doesn't hallucinate
    const screenContext = {
      current_screen: dashboardState.currentPage,
      visible_data: {
        balance: dashboardState.balance,
        // Only show transfer form details if on that page to simulate visual visibility
        transfer_form: dashboardState.currentPage === 'transfer' ? dashboardState.transferForm : 'Not visible',
        // Only show transactions if on that page (or if explicitly requested to look at history, though usually requires nav)
        recent_transactions: dashboardState.currentPage === 'transactions' ? dashboardState.transactions : 'User must navigate to Transactions page to see details',
        transaction_status: dashboardState.lastTransactionStatus
      }
    };

    let prompt = `
      User Request: "${userMessage}"
      Current Visual Context (JSON): ${JSON.stringify(screenContext)}
      
      Instructions:
      1. Use the "visible_data" to answer questions accurately.
      2. If navigating, set target to one of the available pages: overview, transfer, transactions, reports, etc.
      3. If filling a form, use targets 'recipient', 'amount', 'note'.
      4. If user asks about spending history, NAVIGATE to 'transactions' first.
      5. If the user wants to transfer money, YOU MUST set safety to "REQUIRE_CONFIRMATION".
      6. Assign a confidence score (0-100) to actions.
    `;

    if (config?.simpleMode) {
      prompt += `
      ADOPT PERSONA: Financial Translator. 
      - Simplify ALL financial jargon into plain English (e.g., instead of "revenue", say "money coming in").
      - Keep sentences short, direct, and easy to read (max 15 words per sentence where possible).
      - Avoid technical banking terms.
      `;
    }

    prompt += `
      Return a JSON object with the following structure:
      {
        "message": "Natural language response to user",
        "thoughtProcess": ["Step 1: reason...", "Step 2: reason..."],
        "safety": "SAFE" | "WARNING" | "REQUIRE_CONFIRMATION",
        "actions": [
          {
            "type": "NAVIGATE" | "FILL_INPUT" | "CLICK" | "ANALYZE_CHART",
            "page": "overview" | "transactions" | "transfer" | "reports",
            "target": "field/button/page name",
            "value": "value to fill if applicable",
            "description": "Short description of action",
            "confidence": 95
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
                  confidence: { type: Type.NUMBER }
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

      // Handle null or invalid objects
      if (!parsed || typeof parsed !== 'object') {
        parsed = {};
      }

      // Ensure arrays are initialized even if model omits them to prevent iteration errors
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
