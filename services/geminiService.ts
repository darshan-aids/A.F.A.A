
import { GoogleGenAI, Type, FunctionDeclaration, Schema, LiveServerMessage, Modality } from "@google/genai";
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
  useThinking?: boolean; // Uses gemini-3-pro-preview with thinking budget
  useSearch?: boolean; // Uses googleSearch tool
  useLite?: boolean; // Uses gemini-2.5-flash-lite
}

// --- CORE AGENT FUNCTIONALITY ---

export const processUserRequest = async (
  userMessage: string,
  dashboardState: DashboardState,
  config?: RequestConfig
): Promise<AgentResponse> => {
  try {
    // Model Selection based on requirements
    let model = 'gemini-2.5-flash'; // Default for general tasks
    let requestConfig: any = {
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
                expectedText: { type: Type.STRING },
                url: { type: Type.STRING }
              }
            }
          }
        }
      }
    };

    // Feature: Fast AI responses
    if (config?.useLite) {
      model = 'gemini-2.5-flash-lite-latest';
    }

    // Feature: Think more when needed
    if (config?.useThinking) {
      model = 'gemini-3-pro-preview';
      requestConfig.thinkingConfig = { thinkingBudget: 32768 }; // Max for 3 Pro
      // Note: responseMimeType/responseSchema might conflict with thinking in some previews, 
      // but guidelines say it's supported. If conflicts arise, we would remove schema and parse raw text.
    }

    // Feature: Use Google Search data
    // We add this tool if specifically requested or if the model is standard flash (to enhance it)
    if (config?.useSearch) {
      model = 'gemini-2.5-flash'; // Ensure we use a model that supports it well, though 2.5 Flash is great.
      requestConfig.tools = [{ googleSearch: {} }];
      // Google Search tool is not compatible with responseMimeType: application/json usually in strict mode, 
      // but we will try. If it fails, we handle text parsing.
      delete requestConfig.responseMimeType;
      delete requestConfig.responseSchema;
    }

    // AI Chatbot Feature (High Intelligence)
    // If not specifically lite/thinking/search, but just "Chatbot", we can default to 3-pro if implied complex.
    // However, the prompt says "AI powered chatbot... using gemini-3-pro-preview". 
    // We will assume the AgentMode uses this function, so we default to Pro if not Lite.
    if (!config?.useLite && !config?.useSearch && !config?.useThinking) {
       // Defaulting to Flash for speed as per "Gemini intelligence" generally, 
       // but we can switch to 3-pro if the user prompt looks complex.
       // For now, let's keep Flash as the driver for the "Agent" unless "Chat" mode is invoked specifically.
    }


    const screenContext = {
      current_screen: dashboardState.currentPage,
      visible_data: {
        balance: dashboardState.balance,
        transfer_form: dashboardState.currentPage === 'transfer' ? dashboardState.transferForm : 'Not visible',
        recent_transactions: dashboardState.transactions.slice(0, 5),
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
         - "Pay Bill": NAVIGATE 'transfer' -> FILL_INPUT 'recipient' "Utility Co" -> FILL_INPUT 'note' "Electricity Bill".
         - "Invest": NAVIGATE 'transfer' -> FILL_INPUT 'recipient' "Gold Vault" -> FILL_INPUT 'note' "Investment".
         - "Tax Docs": NAVIGATE 'reports' -> CLICK "2024 Tax Documents".
         - "Browse [URL]": BROWSE [URL].
      3. SAFETY: If the user wants to move money, set safety to "REQUIRE_CONFIRMATION".
      
      Output JSON format with 'message', 'thoughtProcess', 'safety', and 'actions'.
    `;

    if (config?.simpleMode) {
      prompt += `\nSimplify all financial terms to plain English.`;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: requestConfig
    });

    // Handle Google Search Grounding response which might not be JSON
    if (config?.useSearch) {
      // For search, we just return the text as the message and no actions usually, or parse heuristically
      const text = response.text || "";
      const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      let groundingText = "";
      if (grounding) {
        groundingText = "\n\nSources:\n" + grounding.map((c: any) => c.web?.uri ? `- ${c.web.title}: ${c.web.uri}` : '').join('\n');
      }
      
      return {
        message: text + groundingText,
        actions: [],
        safety: SafetyStatus.SAFE,
        thoughtProcess: ["Used Google Search to find information."]
      };
    }

    if (response.text) {
      let parsed;
      try {
        let cleanText = response.text.trim();
        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
        }
        parsed = JSON.parse(cleanText);
      } catch (e) {
        // Fallback for non-JSON responses (e.g. Thinking mode sometimes allows prose before JSON)
        console.warn("JSON Parse failed, attempting fallback or returning raw text");
        return {
           message: response.text,
           actions: [],
           safety: SafetyStatus.SAFE,
           thoughtProcess: ["Response was not strict JSON."]
        };
      }

      return {
        message: parsed.message || "Processed.",
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        safety: parsed.safety || SafetyStatus.SAFE,
        thoughtProcess: Array.isArray(parsed.thoughtProcess) ? parsed.thoughtProcess : []
      } as AgentResponse;
    }
    
    throw new Error("Empty response");

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      message: "I encountered an error. Please try again.",
      actions: [],
      safety: SafetyStatus.SAFE,
      thoughtProcess: ["Error encountered."]
    };
  }
};

// --- FEATURE: AUDIO TRANSCRIPTION ---
export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/wav', data: base64Audio } }, // Assuming WAV or similar compatible type
          { text: "Transcribe this audio exactly." }
        ]
      }
    });
    return response.text || "";
  } catch (e) {
    console.error("Transcription failed", e);
    return "";
  }
};

// --- FEATURE: IMAGE GENERATION ---
export const generateImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
           aspectRatio: aspectRatio as any // "1:1", "16:9", etc.
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
       if (part.inlineData) {
         return `data:image/png;base64,${part.inlineData.data}`;
       }
    }
    return null;
  } catch (e) {
    console.error("Image generation failed", e);
    return null;
  }
};

// --- FEATURE: IMAGE ANALYSIS ---
export const analyzeImage = async (file: File): Promise<string> => {
   return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
         const base64Data = (reader.result as string).split(',')[1];
         try {
            const response = await ai.models.generateContent({
               model: 'gemini-3-pro-preview',
               contents: {
                  parts: [
                     { inlineData: { mimeType: file.type, data: base64Data } },
                     { text: "Analyze this image in the context of a financial dashboard. What data or insights does it contain?" }
                  ]
               }
            });
            resolve(response.text || "No analysis generated.");
         } catch (e) {
            reject(e);
         }
      };
      reader.readAsDataURL(file);
   });
};

// --- FEATURE: CHATBOT (General conversation) ---
export const chatWithBot = async (history: {role: string, content: string}[], message: string) => {
   // Use Gemini 3 Pro for high quality chat
   const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history.map(h => ({ role: h.role, parts: [{ text: h.content }] }))
   });
   
   const result = await chat.sendMessage({ message });
   return result.text;
}

// --- FEATURE: LIVE API HELPERS ---
// We export the client creation for the Live component to use directly if needed, 
// or helper functions to handle PCM.

export const createPcmBlob = (data: Float32Array): { data: string, mimeType: string } => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
  }
  const buffer = new Uint8Array(int16.buffer);
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
};

export const getGeminiClient = () => ai;
