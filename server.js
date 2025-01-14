const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 5000;

// Default landing page
app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to the NFL Schedule Scraper</h1>
    <p>Use the following routes:</p>
    <ul>
      <li><a href="/scrape-schedule">/scrape-schedule</a> - Scrape NFL standings</li>
      <li><a href="/schedule">/schedule</a> - View cached standings</li>
    </ul>
  `);
});

// Cache for storing scraped standings
let standingsCache = [];

// Scrape schedule route
app.get('/scrape-schedule', async (req, res) => {
  try {
    console.log('Starting to scrape NFL standings...');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: 'C:/Users/shawn/Downloads/chrome-win/chrome-win/chrome', // Update to your correct path
    });

    const page = await browser.newPage();
    await page.goto('https://www.pro-football-reference.com/years/2024/');

    const standingsData = await page.evaluate(() => {
      const standings = [];
      const rows = document.querySelectorAll('table.stats_table tbody tr');

      rows.forEach((row) => {
        const team = row.querySelector('th[data-stat="team"] a')?.innerText || '';
        const wins = row.querySelector('td[data-stat="wins"]')?.innerText || '';
        const losses = row.querySelector('td[data-stat="losses"]')?.innerText || '';

        if (team) {
          standings.push({ team, wins, losses });
        }
      });

      return standings;
    });

    await browser.close();

    standingsCache = standingsData; // Cache the scraped standings
    console.log('Scraped standings successfully:', standingsData);

    res.json({ success: true, standings: standingsData });
  } catch (error) {
    console.error('Error scraping standings:', error.message);
    res.status(500).send('An error occurred while fetching the standings.');
  }
});

// View cached schedule route
app.get('/schedule', (req, res) => {
  if (standingsCache.length === 0) {
    res.send('No standings data available. Please try again later.');
  } else {
    res.json({ success: true, standings: standingsCache });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
