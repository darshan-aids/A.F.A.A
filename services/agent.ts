
import { v4 as uuidv4 } from "uuid";
import { SubAgent as Agent, AgentMessage, AgentAction } from "../types";
import { GoogleGenAI } from "@google/genai";
import { BrowserAutomationEngine, AutomationAction } from "../automationEngine";

// Initialize Gemini client for client-side execution
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type Subscriber = { unsubscribe: () => void };

export class AgentManager {
  private agents: Record<string, Agent> = {};
  private subs: ((agents: Agent[]) => void)[] = [];
  private engine: BrowserAutomationEngine | null = null;

  constructor() {
    // load from localStorage
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

    AVAILABLE ACTIONS (JSON):
    - { "type": "NAVIGATE", "page": "overview|transactions|transfer" }
    - { "type": "CLICK", "selector": "css_selector" }
    - { "type": "FILL_INPUT", "selector": "css_selector", "value": "text" }
    - { "type": "READ_PAGE" }
    - { "type": "SCREENSHOT" }
    - { "type": "WAIT_FOR_SELECTOR", "selector": "css_selector", "duration": 5000 }
    - { "type": "SCROLL", "direction": "down", "amount": 300 }

    INSTRUCTIONS:
    - Return a JSON object with an "actions" array and a "summary" string.
    - Do NOT output markdown or code blocks. Just raw JSON.
    - If you are done, return empty actions.
    
    Example Response:
    {
      "summary": "I will navigate to transactions and search for 'Uber'.",
      "actions": [
        { "type": "NAVIGATE", "page": "transactions" },
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
      // Clean up potential markdown blocks
      const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        // Fallback if parsing fails - just treat as text response
        this.replaceLastAgentMessage(agentId, rawText);
        return;
      }

      const { summary, actions } = parsed;

      // Update the "Thinking..." message with the summary
      this.replaceLastAgentMessage(agentId, summary || "Executing actions...");

      // Execute actions if engine is available
      if (actions && actions.length > 0 && this.engine) {
        const report = await this.engine.executeActions(actions as AutomationAction[]);
        
        // Log results
        const resultSummary = report.results.map(r => 
          `[${r.type}] ${r.success ? '✅' : '❌'} ${r.message} ${r.data ? JSON.stringify(r.data) : ''}`
        ).join('\n');

        this.appendAgentMessage(agentId, "system", `Execution Report:\n${resultSummary}`);

        // Handle screenshots specifically
        const screenshots = report.results.filter(r => r.screenshot).map(r => r.screenshot);
        if (screenshots.length > 0) {
           // We could attach this to the system message meta
           agent.messages[agent.messages.length - 1].meta = { screenshots };
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
    // replace last agent message
    for (let i = agent.messages.length - 1; i >= 0; i--) {
      if (agent.messages[i].role === "agent") {
        agent.messages[i] = { ...agent.messages[i], content, timestamp: new Date().toISOString() };
        break;
      }
    }
    this.notify();
  }
}
