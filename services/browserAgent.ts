
// Frontend helper - delegates to server to fetch page content.
// In this mock environment, we simulate the fetch since we don't have a backend proxy.

export async function fetchPageText(url: string) {
  // NOTE: In a production app, this would fetch('/api/fetch-page', ...)
  // Here we simulate a successful fetch for demonstration.
  
  console.log(`[BrowserAgent] Fetching content for: ${url}`);
  
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

  // Basic mock responses based on URL for demo purposes
  if (url.includes('wikipedia')) {
    return {
      text: "Wikipedia is a free online encyclopedia, created and edited by volunteers around the world and hosted by the Wikimedia Foundation. [Mock Content]",
      links: ['https://en.wikipedia.org/wiki/Portal:Contents', 'https://en.wikipedia.org/wiki/Special:Random']
    };
  }
  
  if (url.includes('finance') || url.includes('stock')) {
    return {
      text: "Market Summary > S&P 500: 4,783.45 (+0.5%) | Nasdaq: 15,055.65 (+0.8%) | Dow Jones: 37,440.34 (+0.1%). Top Gainers: NVDA, AMD, MSFT. [Mock Content]",
      links: ['/quote/AAPL', '/quote/GOOGL', '/markets/news']
    };
  }

  return {
    text: `Content successfully retrieved from ${url}. The page contains various navigation links and main article content. This is a simulated response for the A.F.A.A. Agent Mode demo.`,
    links: ['#about', '#contact', '#services']
  };
}
