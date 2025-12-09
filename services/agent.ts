
import { v4 as uuidv4 } from "uuid";
import { SubAgent as Agent, AgentMessage, AgentAction } from "../types";
import { fetchPageText } from "./browserAgent";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini client for client-side execution
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type Subscriber = { unsubscribe: () => void };

export class AgentManager {
  private agents: Record<string, Agent> = {};
  private subs: ((agents: Agent[]) => void)[] = [];

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

  async enqueueAction(agentId: string, action: AgentAction) {
    const agent = this.agents[agentId];
    if (!agent) throw new Error("agent not found");
    // for now, immediate run
    await this.handleAction(agentId, action);
    this.notify();
  }

  private async runAgentStep(agentId: string) {
    const agent = this.agents[agentId];
    if (!agent) return;
    
    // Construct Prompt for Gemini
    const prompt = `You are an autonomous sub-agent named "${agent.name}".
    
    GOALS:
    ${agent.goals.map(g => `- ${g}`).join('\n')}

    CONVERSATION HISTORY:
    ${(agent.messages || []).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

    INSTRUCTIONS:
    - Analyze the user request and history.
    - Make a single step decision.
    - If you need to browse the web to find information, output exactly: "BROWSE: <url>"
    - If you have an answer or need to ask a clarifying question, just output the text.
    - Keep responses concise.
    `;

    this.appendAgentMessage(agentId, "agent", "Thinking...");
    
    try {
      // Use Gemini Directly instead of backend proxy
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      
      const text = response.text || "I'm having trouble thinking right now.";

      // If Agent suggests browsing
      if (text.trim().toUpperCase().startsWith("BROWSE:")) {
        const url = text.replace(/^BROWSE:\s*/i, "").trim();
        // Remove the "Thinking..." message
        this.popLastAgentMessage(agentId);
        
        this.appendAgentMessage(agentId, "agent", `I need to browse: ${url}`);
        await this.enqueueAction(agentId, { type: "browse", payload: { url } } as AgentAction);
      } else {
        this.replaceLastAgentMessage(agentId, text);
      }
    } catch (err) {
      this.replaceLastAgentMessage(agentId, `Error: ${(err as Error).message}`);
    }
    this.notify();
  }

  private async handleAction(agentId: string, action: AgentAction) {
    if (action.type === "browse") {
      const url = action.payload?.url;
      if (!url) return;
      
      try {
        const data = await fetchPageText(url);
        const text = data?.text || "";
        
        this.appendAgentMessage(agentId, "system", `Fetched content from ${url}:\n\n${text.substring(0, 500)}...`, { url });
        
        // Follow up with analysis
        const prompt = `I have fetched content from ${url}. 
        CONTENT START:
        ${text.substring(0, 2000)}
        CONTENT END.
        
        Please summarize this for the user based on my goals.`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });
        
        this.appendAgentMessage(agentId, "agent", response.text || "I read the page but couldn't summarize it.");
        
      } catch (e) {
        this.appendAgentMessage(agentId, "system", `Failed to browse ${url}: ${String(e)}`);
      }
    }
  }

  private appendAgentMessage(agentId: string, role: AgentMessage["role"], content: string, meta?: any) {
    const agent = this.agents[agentId];
    if (!agent) return;
    const msg: AgentMessage = { role, content, meta, timestamp: new Date().toISOString() };
    agent.messages = [...(agent.messages || []), msg];
    this.notify();
  }

  private popLastAgentMessage(agentId: string) {
    const agent = this.agents[agentId];
    if (!agent || !agent.messages.length) return;
    agent.messages.pop();
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
