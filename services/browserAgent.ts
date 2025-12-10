
// Frontend helper - delegates to the local Playwright server to fetch real page content.

export async function fetchPageText(url: string) {
  try {
    console.log(`[BrowserAgent] Requesting real browser navigation: ${url}`);
    
    // Check if we are in a browser environment before calling fetch
    if (typeof window === 'undefined') {
        return {
            text: "Browser Agent is client-side only.",
            links: [],
            screenshot: undefined
        };
    }

    const response = await fetch('/api/fetch-page', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    return {
      text: data.text || "No readable text content found.",
      links: data.links || [],
      screenshot: data.screenshot, // base64 string
      title: data.title
    };

  } catch (error) {
    console.error("[BrowserAgent] Fetch failed:", error);
    
    return {
      text: `CONNECTION ERROR: Could not connect to the Browser Server.\n\nPlease ensure you have started the backend server:\n1. 'npm install express playwright cors'\n2. 'node server/server.js'`,
      links: [],
      screenshot: undefined
    };
  }
}
