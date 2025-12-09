
import { v4 as uuidv4 } from "uuid";
import { SubAgent as Agent, AgentMessage, AgentAction } from "../types";
import { GoogleGenAI } from "@google/genai";
import { BrowserAutomationEngine, AutomationAction } from "../automationEngine";

// Initialize Gemini client for client-side execution
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type Subscriber = { unsubscribe: () => void };

function normalizeActions(actions: any[]): any[] {
  return (actions || []).map((a) => {
    const clone = { ...a };

    // Support planners that use "url" for SPA page keys or full URLs
    if (clone.url && !clone.page) {
      if (/^[a-z0-9-_]+$/i.test(String(clone.url))) {
        clone.page = String(clone.url);
      } else {
        clone.page = clone.page || null;
      }
    }

    // Normalize common synonyms
    if (!clone.selector && clone.elementSelector) clone.selector = clone.elementSelector;
    if (!clone.selector && clone.elementText && typeof clone.elementText === 'string') {
      clone.selector = clone.selector || undefined;
    }

    // Normalize target -> selector/target
    if (!clone.selector && clone.target && clone.target.includes('input')) {
      clone.selector = clone.selector || undefined;
    }

    // Ensure type is uppercase
    if (clone.type && typeof clone.type === 'string') clone.type = clone.type.toUpperCase();

    return clone;
  });
}

export class AgentManager {
  private agents: Record<string, Agent> = {};
  private subs: ((agents: Agent[]) => void)[] = [];
  private engine: BrowserAutomationEngine | null = null;

  constructor() {
    const raw = localStorage.getItem("agents_v1");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Agent[];
        parsed.forEach((a) => (this.agents[a.id] = a));
      } catch {}
    }
  }

  public setAutomationEngine(engine: BrowserAutomationEngine) {
    this.engine = engine;
  }

  subscribe(cb: (agents: Agent[]) => void): Subscriber {
    this.subs.push(cb);
    cb(this.listAgents());
    return {
      unsubscribe: () => {
        this.subs = this.subs.filter((s) => s !== cb);
      },
    };
  }

  private notify() {
    const list = this.listAgents();
    localStorage.setItem("agents_v1", JSON.stringify(list));
    this.subs.forEach((s) => s(list));
  }

  listAgents(): Agent[] {
    return Object.values(this.agents);
  }

  getAgent(id: string): Agent | undefined {
    return this.agents[id];
  }

  async create(partial: Partial<Agent>): Promise<Agent> {
    const id = uuidv4();
    const newAgent: Agent = {
      id,
      name: partial.name || `Agent ${Object.keys(this.agents).length + 1}`,
      goals: partial.goals || [],
      messages: [],
      memory: [],
      running: false,
      createdAt: new Date().toISOString(),
    };
    this.agents[id] = newAgent;
    this.notify();
    return newAgent;
  }

  // Handle actions injected manually from the UI
  async enqueueAction(agentId: string, action: AgentAction) {
    const agent = this.agents[agentId];
    if (!agent) return;

    if (action.type === 'browse' || action.type === 'BROWSE') {
      const url = action.payload?.url || action.url;
      if (url && this.engine) {
        this.appendAgentMessage(agentId, 'system', `Browsing ${url}...`);
        try {
           // Execute BROWSE via the engine to maintain consistency
           const report = await this.engine.executeActions([{ type: 'BROWSE', url: url } as AutomationAction]);
           const result = report.results[0];
           
           if (result && result.success && result.data) {
             const content = `[BROWSER RESULT for ${url}]\n${(result.data.text || '').substring(0, 1000)}...\n\nLinks: ${(result.data.links || []).join(', ')}`;
             this.appendAgentMessage(agentId, 'system', content, { url });
             // Trigger agent thought process after receiving content
             this.runAgentStep(agentId);
           } else {
             this.appendAgentMessage(agentId, 'system', `Failed to browse ${url}: ${result.message}`);
           }
        } catch (e) {
           this.appendAgentMessage(agentId, 'system', `Error browsing: ${(e as Error).message}`);
        }
      }
    }
  }

  async sendUserMessage(agentId: string, content: string) {
    const agent = this.agents[agentId];
    if (!agent) throw new Error("agent not found");
    const msg: AgentMessage = { role: "user", content, timestamp: new Date().toISOString() };
    agent.messages = [...(agent.messages || []), msg];
    this.notify();
    // Kick off agent thinking
    this.runAgentStep(agentId);
  }

  private async runAgentStep(agentId: string) {
    const agent = this.agents[agentId];
    if (!agent) return;
    
    // Construct Prompt for Gemini to return structured JSON Actions
    const prompt = `You are an autonomous browser agent named "${agent.name}".
    
    GOALS:
    ${agent.goals.map(g => `- ${g}`).join('\n')}

    CONVERSATION HISTORY:
    ${(agent.messages || []).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

    AVAILABLE ACTIONS (Strict JSON format):
    1. Navigation: { "type": "NAVIGATE", "url": "overview|transactions|transfer" }
    2. Click: { "type": "CLICK", "selector": "css_selector", "elementText": "text_on_button" }
    3. Input: { "type": "FILL_INPUT", "selector": "css_selector", "value": "text_to_type" }
    4. Wait: { "type": "WAIT_FOR_SELECTOR", "selector": "css_selector" }
    5. Scroll: { "type": "SCROLL", "direction": "down" }
    6. Read: { "type": "READ_PAGE" }
    7. Browse External: { "type": "BROWSE", "url": "https://example.com" }

    INSTRUCTIONS:
    - Return a JSON object with an "actions" array and a "summary" string.
    - Do NOT output markdown or code blocks. Just raw JSON.
    - If you are done, return empty actions.
    - If you want to read an external link found in history, use BROWSE.
    
    Example Response:
    {
      "summary": "I will navigate to transactions and search for 'Uber'.",
      "actions": [
        { "type": "NAVIGATE", "url": "transactions" },
        { "type": "WAIT_FOR_SELECTOR", "selector": "input[placeholder*='Search']" },
        { "type": "FILL_INPUT", "selector": "input[placeholder*='Search']", "value": "Uber" }
      ]
    }
    `;

    this.appendAgentMessage(agentId, "agent", "Thinking...");
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      
      const rawText = response.text || "{}";
      const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        this.replaceLastAgentMessage(agentId, rawText);
        return;
      }

      const { summary, actions: rawActions } = parsed;
      const actions = normalizeActions(rawActions);

      this.replaceLastAgentMessage(agentId, summary || "Executing actions...");

      if (actions && actions.length > 0 && this.engine) {
        const report = await this.engine.executeActions(actions as AutomationAction[]);
        
        // Enhance reporting to show BROWSE data content in the system log
        const resultSummary = report.results.map(r => {
           let details = r.message;
           if (r.type === 'BROWSE' && r.success && r.data) {
               details += `\n[Content Preview]: ${r.data.text.substring(0, 100)}...`;
               // Feed content back to agent context
               this.appendAgentMessage(agentId, "system", `[BROWSER CONTENT for ${r.data.url || 'url'}]\n${r.data.text}`);
           }
           return `[${r.type}] ${r.success ? '✅' : '❌'} ${details}`;
        }).join('\n');

        this.appendAgentMessage(agentId, "system", `Execution Report:\n${resultSummary}`);

        const screenshots = report.results.filter(r => r.screenshot).map(r => r.screenshot);
        if (screenshots.length > 0) {
           agent.messages[agent.messages.length - 1].meta = { ...agent.messages[agent.messages.length - 1].meta, screenshots };
        }
      }

    } catch (err) {
      this.replaceLastAgentMessage(agentId, `Error: ${(err as Error).message}`);
    }
    this.notify();
  }

  private appendAgentMessage(agentId: string, role: AgentMessage["role"], content: string, meta?: any) {
    const agent = this.agents[agentId];
    if (!agent) return;
    const msg: AgentMessage = { role, content, meta, timestamp: new Date().toISOString() };
    agent.messages = [...(agent.messages || []), msg];
    this.notify();
  }

  private replaceLastAgentMessage(agentId: string, content: string) {
    const agent = this.agents[agentId];
    if (!agent || !agent.messages) return;
    for (let i = agent.messages.length - 1; i >= 0; i--) {
      if (agent.messages[i].role === "agent") {
        agent.messages[i] = { ...agent.messages[i], content, timestamp: new Date().toISOString() };
        break;
      }
    }
    this.notify();
  }
}
