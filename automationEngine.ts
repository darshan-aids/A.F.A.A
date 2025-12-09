
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
  | 'GET_ELEMENT_VALUE'
  | 'WAIT_FOR_SELECTOR';

export interface AutomationAction {
  type: ActionType;
  page?: string;
  url?: string;
  target?: string;
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
      // Dispatch start event for UI visualization
      this.dispatchLifecycleEvent('agent-action-start', action);
      
      const result = await this.executeAction(action);
      this.actionResults.push(result);
      
      // Dispatch result event
      this.dispatchLifecycleEvent(result.success ? 'agent-action-success' : 'agent-action-fail', { action, result });

      if (!result.success && action.type !== 'VERIFY') {
        // Stop chain on critical failure (except verification)
        break; 
      }
      
      // Small delay for visual continuity
      await new Promise(r => setTimeout(r, 500));
    }

    return {
      results: this.actionResults,
      summary: `Executed ${this.actionResults.length} actions. ${this.actionResults.filter(r => r.success).length} successful.`
    };
  }

  private dispatchLifecycleEvent(eventName: string, detail: any) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
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
        case 'WAIT_FOR_SELECTOR': return await this.waitForSelector(action);
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
    const target = action.page || action.url || action.target;
    if (target) {
      // Normalize target to ID for mock SPA navigation
      const pageId = target.toLowerCase().replace('/', '').trim();
      
      // Dispatch event for App.tsx to handle state change
      window.dispatchEvent(new CustomEvent('agent-navigate', { detail: { page: pageId } }));
      return { type: 'NAVIGATE', success: true, timestamp: new Date().toISOString(), message: `Navigated to ${pageId}` };
    }
    return { type: 'NAVIGATE', success: false, timestamp: new Date().toISOString(), message: 'No page specified' };
  }

  private async click(action: AutomationAction): Promise<ActionResult> {
    const el = this.findElementBestEffort(action);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 200)); // wait for scroll
      el.click();
      return { type: 'CLICK', success: true, timestamp: new Date().toISOString(), message: `Clicked element` };
    }
    return { type: 'CLICK', success: false, timestamp: new Date().toISOString(), message: `Element not found: ${action.selector || action.elementText}` };
  }

  private async fillInput(action: AutomationAction): Promise<ActionResult> {
    const el = this.findElementBestEffort(action) as HTMLInputElement | HTMLTextAreaElement;
    
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      el.focus();
      const valueToSet = action.value || '';
      
      // React Hack: React overrides the native setter, so we have to call the prototype setter
      const prototype = el.tagName === 'TEXTAREA' 
          ? window.HTMLTextAreaElement.prototype 
          : window.HTMLInputElement.prototype;
          
      const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      
      if (nativeSetter) {
        nativeSetter.call(el, valueToSet);
      } else {
        el.value = valueToSet;
      }
      
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      
      return { type: 'FILL_INPUT', success: true, timestamp: new Date().toISOString(), message: `Filled input with "${valueToSet}"` };
    }
    return { type: 'FILL_INPUT', success: false, timestamp: new Date().toISOString(), message: `Input not found: ${action.selector}` };
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
      const el = this.findElementBestEffort(action);
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
    const el = this.findElementBestEffort(action);
    if (el) {
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      return { type: 'HOVER', success: true, timestamp: new Date().toISOString(), message: 'Hovered over element' };
    }
    return { type: 'HOVER', success: false, timestamp: new Date().toISOString(), message: 'Element to hover not found' };
  }

  private async getElementValue(action: AutomationAction): Promise<ActionResult> {
    const el = this.findElementBestEffort(action);
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

  private async waitForSelector(action: AutomationAction): Promise<ActionResult> {
    const timeout = action.duration || 5000;
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      const el = this.findElementBestEffort(action);
      if (el) {
         return { type: 'WAIT_FOR_SELECTOR', success: true, timestamp: new Date().toISOString(), message: 'Element appeared' };
      }
      await new Promise(r => setTimeout(r, 200));
    }
    
    return { type: 'WAIT_FOR_SELECTOR', success: false, timestamp: new Date().toISOString(), message: 'Timeout waiting for element' };
  }

  // --- Helpers ---

  // Strategy: Selector -> ID -> Text (XPath) -> Aria Label
  private findElementBestEffort(action: AutomationAction): HTMLElement | null {
    // 1. Explicit Selector
    if (action.selector) {
      try {
        const el = document.querySelector(action.selector);
        if (el) return el as HTMLElement;
      } catch (e) {
        console.warn(`Invalid selector: ${action.selector}`);
      }
    }

    // 2. Text Search (Fuzzy or XPath)
    if (action.elementText) {
      // Try XPath first (Case insensitive attempt)
      const cleanText = action.elementText.replace(/'/g, "\\'"); // Basic escape
      const xpath = `//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${cleanText.toLowerCase()}')]`;
      
      try {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue) return result.singleNodeValue as HTMLElement;
      } catch (e) {
        console.warn("XPath evaluation failed", e);
      }
      
      // Fallback: Scan buttons and inputs for value/label match
      const interactables = Array.from(document.querySelectorAll('button, a, input, [role="button"]'));
      const match = interactables.find(el => {
         const content = (el.textContent || '').toLowerCase();
         const val = ((el as HTMLInputElement).value || '').toLowerCase();
         const label = (el.getAttribute('aria-label') || '').toLowerCase();
         const search = action.elementText!.toLowerCase();
         return content.includes(search) || val.includes(search) || label.includes(search);
      });
      if (match) return match as HTMLElement;
    }

    // 3. Last Resort: Target Property used as ID or Placeholder
    if (action.target) {
       // Try as ID
       const elById = document.getElementById(action.target);
       if (elById) return elById;
       
       // Try as Placeholder (for inputs)
       const elByPlaceholder = document.querySelector(`input[placeholder*="${action.target}"]`);
       if (elByPlaceholder) return elByPlaceholder as HTMLElement;
    }

    return null;
  }

  private getPageStructure(): any {
    // Simplified accessibility tree
    const interactables = Array.from(document.querySelectorAll('button, a, input, [role="button"], h1, h2, h3'));
    return interactables.map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim().substring(0, 50),
      label: el.getAttribute('aria-label'),
      id: el.id,
      className: el.className
    }));
  }
}
