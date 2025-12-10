
// Frontend helper - Simulation Mode
// Generates realistic mock data so the Agent Mode UI works without a backend server.

export async function fetchPageText(url: string) {
  console.log(`[BrowserAgent] (Simulation) Navigating to: ${url}`);
  
  // Simulate network latency (between 0.8s and 1.5s)
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

  const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const domain = cleanUrl.split('/')[0];
  
  let title = domain;
  let content = `Welcome to ${domain}. This is a simulated environment.`;
  let links = ['/about', '/contact', '/login', '/pricing'];

  // 1. Dynamic Content Generation based on URL keywords
  if (cleanUrl.includes('google')) {
    title = "Google Search";
    content = "Google\n\n[Search Box]\n\nGoogle Search   I'm Feeling Lucky\n\nTrending searches:\n1. AI Agents in Finance\n2. A.F.A.A. Project\n3. Accessibility Standards 2024";
    links = ['about', 'store', 'gmail', 'images'];
  } 
  else if (cleanUrl.includes('wikipedia')) {
    title = "Wikipedia - The Free Encyclopedia";
    content = "Wikipedia is a free online encyclopedia, created and edited by volunteers around the world.\n\nToday's Featured Article: Autonomous Agents.\n\nIn computer science, an autonomous agent is a software agent that performs tasks or services for an individual or other program in an autonomous fashion.";
    links = ['/wiki/Portal:Contents', '/wiki/Special:Random', '/wiki/Help:Contents'];
  }
  else if (cleanUrl.includes('news') || cleanUrl.includes('cnn') || cleanUrl.includes('bbc')) {
    title = "Breaking News - World";
    content = "TOP STORY: Tech Markets Rally as AI Adoption Soars.\n\nFinancial sector sees 15% growth in accessibility tools. Experts predict a shift towards agentic workflows in Q4 2024.\n\n[Read More]";
    links = ['/world', '/business', '/tech', '/science'];
  }
  else if (cleanUrl.includes('stock') || cleanUrl.includes('finance')) {
    title = "Market Watch";
    content = "S&P 500: 4,783.45 (+0.5%) ▲\nNasdaq: 15,055.65 (+0.8%) ▲\nDow Jones: 37,440.34 (+0.1%) ▲\n\nTop Gainers: NVDA, AMD, MSFT.\n\nMarket Summary: Tech stocks lead the charge as earnings reports exceed expectations.";
    links = ['/markets', '/portfolio', '/watchlist'];
  }

  // 2. Generate a visual placeholder for the "Mini Browser"
  // We use placehold.co to generate a nice looking image with the site title
  // Theme: Dark background (#1C1C21) with Lime text (#D2F159) to match the app
  const encodedTitle = encodeURIComponent(title.length > 20 ? title.substring(0, 20) + '...' : title);
  const screenshot = `https://placehold.co/1200x800/1C1C21/D2F159.png?text=${encodedTitle}&font=montserrat`;

  return {
    text: content,
    links: links.map(l => l.startsWith('http') ? l : `https://${domain}${l.startsWith('/') ? '' : '/'}${l}`),
    screenshot: screenshot,
    title: title
  };
}
