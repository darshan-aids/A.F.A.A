
import html2canvas from 'html2canvas';

export type ActionType = 
  | 'SCREENSHOT'
  | 'NAVIGATE'
  | 'CLICK'
  | 'FILL_INPUT'
  | 'READ_PAGE'
  | 'EXTRACT_TEXT'
  | 'SCROLL'
  | 'WAIT'
  | 'VERIFY'
  | 'HOVER'
  | 'GET_ELEMENT_VALUE';

export interface AutomationAction {
  type: ActionType;
  page?: string;
  url?: string;
  selector?: string;
  elementText?: string;
  value?: string;
  amount?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  expectedText?: string;
}

export interface ActionResult {
  type: ActionType;
  success: boolean;
  timestamp: string;
  message: string;
  data?: any;
  screenshot?: string;
  error?: string;
}

export interface ExecutionReport {
  results: ActionResult[];
  summary: string;
}

export class BrowserAutomationEngine {
  private actionResults: ActionResult[] = [];

  async executeActions(actions: AutomationAction[]): Promise<ExecutionReport> {
    this.actionResults = [];
    console.log(`[AUTOMATION] Starting execution of ${actions.length} actions`);

    for (const action of actions) {
      const result = await this.executeAction(action);
      this.actionResults.push(result);
    }

    return {
      results: this.actionResults,
      summary: `Executed ${this.actionResults.length} actions. ${this.actionResults.filter(r => r.success).length} successful.`
    };
  }

  private async executeAction(action: AutomationAction): Promise<ActionResult> {
    const timestamp = new Date().toISOString();
    try {
      switch (action.type) {
        case 'SCREENSHOT': return await this.screenshot();
        case 'NAVIGATE': return await this.navigate(action);
        case 'CLICK': return await this.click(action);
        case 'FILL_INPUT': return await this.fillInput(action);
        case 'READ_PAGE': return await this.readPage(action);
        case 'WAIT': return await this.wait(action);
        case 'SCROLL': return await this.scroll(action);
        case 'VERIFY': return await this.verify(action);
        case 'HOVER': return await this.hover(action);
        case 'GET_ELEMENT_VALUE': return await this.getElementValue(action);
        default: return { type: action.type, success: false, timestamp, message: `Unknown action: ${action.type}` };
      }
    } catch (error) {
      console.error(error);
      return { type: action.type, success: false, timestamp, message: `Execution error`, error: String(error) };
    }
  }

  private async screenshot(): Promise<ActionResult> {
    try {
      const canvas = await html2canvas(document.body, { useCORS: true, logging: false });
      const screenshot = canvas.toDataURL('image/png');
      return { type: 'SCREENSHOT', success: true, timestamp: new Date().toISOString(), message: 'Screenshot captured', screenshot };
    } catch (e) {
      return { type: 'SCREENSHOT', success: false, timestamp: new Date().toISOString(), message: 'Screenshot failed', error: String(e) };
    }
  }

  private async navigate(action: AutomationAction): Promise<ActionResult> {
    if (action.page) {
      // Dispatch event for App.tsx to handle state change
      window.dispatchEvent(new CustomEvent('agent-navigate', { detail: { page: action.page } }));
      return { type: 'NAVIGATE', success: true, timestamp: new Date().toISOString(), message: `Navigated to ${action.page}` };
    }
    return { type: 'NAVIGATE', success: false, timestamp: new Date().toISOString(), message: 'No page specified' };
  }

  private async click(action: AutomationAction): Promise<ActionResult> {
    const el = this.findElement(action);
    if (el) {
      el.click();
      return { type: 'CLICK', success: true, timestamp: new Date().toISOString(), message: `Clicked element` };
    }
    return { type: 'CLICK', success: false, timestamp: new Date().toISOString(), message: 'Element not found' };
  }

  private async fillInput(action: AutomationAction): Promise<ActionResult> {
    const el = this.findElement(action) as HTMLInputElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      // React Hack to trigger onChange
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, action.value || '');
      } else {
        el.value = action.value || '';
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      
      return { type: 'FILL_INPUT', success: true, timestamp: new Date().toISOString(), message: `Filled input with "${action.value}"` };
    }
    return { type: 'FILL_INPUT', success: false, timestamp: new Date().toISOString(), message: 'Input not found' };
  }

  private async readPage(action: AutomationAction): Promise<ActionResult> {
    const structure = this.getPageStructure();
    return { type: 'READ_PAGE', success: true, timestamp: new Date().toISOString(), message: 'Page structure read', data: structure };
  }

  private async wait(action: AutomationAction): Promise<ActionResult> {
    await new Promise(res => setTimeout(res, action.duration || 1000));
    return { type: 'WAIT', success: true, timestamp: new Date().toISOString(), message: `Waited ${action.duration || 1000}ms` };
  }

  private async scroll(action: AutomationAction): Promise<ActionResult> {
    try {
      const el = this.findElement(action);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return { type: 'SCROLL', success: true, timestamp: new Date().toISOString(), message: 'Scrolled element into view' };
      }
      
      const amount = action.amount || 300;
      const direction = action.direction || 'down';
      
      let top = 0;
      let left = 0;
      
      if (direction === 'down') top = amount;
      if (direction === 'up') top = -amount;
      if (direction === 'right') left = amount;
      if (direction === 'left') left = -amount;
      
      // Try scrolling the dashboard container first if it exists, otherwise window
      const dashboardContainer = document.querySelector('[role="main"]');
      if (dashboardContainer) {
        dashboardContainer.scrollBy({ top, left, behavior: 'smooth' });
      } else {
        window.scrollBy({ top, left, behavior: 'smooth' });
      }
      
      return { type: 'SCROLL', success: true, timestamp: new Date().toISOString(), message: `Scrolled ${direction} ${amount}px` };
    } catch (e) {
      return { type: 'SCROLL', success: false, timestamp: new Date().toISOString(), message: 'Scroll failed', error: String(e) };
    }
  }

  private async verify(action: AutomationAction): Promise<ActionResult> {
    if (!action.expectedText) {
      return { type: 'VERIFY', success: false, timestamp: new Date().toISOString(), message: 'No expected text provided' };
    }

    const bodyText = document.body.innerText;
    const found = bodyText.includes(action.expectedText);
    
    return { 
      type: 'VERIFY', 
      success: found, 
      timestamp: new Date().toISOString(), 
      message: found ? `Verified text "${action.expectedText}" found` : `Verification failed: "${action.expectedText}" not found`
    };
  }

  private async hover(action: AutomationAction): Promise<ActionResult> {
    const el = this.findElement(action);
    if (el) {
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      return { type: 'HOVER', success: true, timestamp: new Date().toISOString(), message: 'Hovered over element' };
    }
    return { type: 'HOVER', success: false, timestamp: new Date().toISOString(), message: 'Element to hover not found' };
  }

  private async getElementValue(action: AutomationAction): Promise<ActionResult> {
    const el = this.findElement(action);
    if (!el) {
      return { type: 'GET_ELEMENT_VALUE', success: false, timestamp: new Date().toISOString(), message: 'Element not found' };
    }
    
    let value = '';
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      value = el.value;
    } else {
      value = el.innerText || el.textContent || '';
    }
    
    return { 
      type: 'GET_ELEMENT_VALUE', 
      success: true, 
      timestamp: new Date().toISOString(), 
      message: 'Value retrieved', 
      data: value 
    };
  }

  // --- Helpers ---

  private findElement(action: AutomationAction): HTMLElement | null {
    if (action.selector) return document.querySelector(action.selector) as HTMLElement;
    if (action.elementText) return this.findElementByText(action.elementText);
    return null;
  }

  private findElementByText(text: string): HTMLElement | null {
    // Simple robust text finder using XPath
    const xpath = `//*[contains(text(), '${text}')]`;
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue as HTMLElement;
    } catch (e) {
      console.warn("XPath evaluation failed", e);
      return null;
    }
  }

  private getPageStructure(): any {
    // Simplified accessibility tree
    const interactables = Array.from(document.querySelectorAll('button, a, input, [role="button"], h1, h2, h3'));
    return interactables.map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim().substring(0, 50),
      label: el.getAttribute('aria-label'),
      id: el.id
    }));
  }
}
