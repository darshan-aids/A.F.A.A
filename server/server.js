const express = require('express');
const { chromium } = require('playwright');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Increase payload limit for base64 screenshots
app.use(express.json({ limit: '50mb' }));
app.use(cors());

app.post('/api/fetch-page', async (req, res) => {
    let { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }

    console.log(`[Browser Server] Navigating to: ${url}`);

    let browser = null;
    try {
        browser = await chromium.launch({ 
            headless: true 
        });
        
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        const page = await context.newPage();
        
        // Timeout after 15s to prevent hanging
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('Navigation timeout/partial load:', e.message));
        
        // Wait a bit for dynamic content
        await page.waitForTimeout(2000);

        const title = await page.title();
        
        // Extract main text content
        const text = await page.evaluate(() => {
            // Simple heuristics to get readable text
            const body = document.body;
            return body.innerText.substring(0, 5000).replace(/\s+/g, ' ').trim();
        });

        // Extract links
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
                .map(a => a.href)
                .filter(href => href.startsWith('http'))
                .slice(0, 50); // Limit to 50 links
        });

        // Capture screenshot
        const buffer = await page.screenshot({ type: 'jpeg', quality: 60 });
        const screenshot = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        await browser.close();

        res.json({
            url,
            title,
            text,
            links,
            screenshot
        });

    } catch (error) {
        console.error('[Browser Server] Error:', error);
        if (browser) await browser.close();
        res.status(500).json({ 
            error: 'Failed to fetch page', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`
    🚀 Browser Agent Server running at http://localhost:${PORT}
    
    Prerequisites:
    1. npm install express playwright cors
    2. npx playwright install chromium
    `);
});