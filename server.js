const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to the NFL Schedule Scraper</h1>
    <p>Use the following routes:</p>
    <ul>
      <li><a href="/scrape-schedule">/scrape-schedule</a> - Scrape NFL schedule</li>
      <li><a href="/schedule">/schedule</a> - View cached schedule</li>
    </ul>
  `);
});

// In-memory cache for the scraped schedule
let scheduleCache = [];

app.get('/scrape-schedule', async (req, res) => {
  try {
    console.log('Starting to scrape NFL schedule...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: 'C:/Users/shawn/Downloads/chrome-win/chrome-win/chrome', // Corrected path
    });

    const page = await browser.newPage();
    await page.goto('https://www.pro-football-reference.com/years/2024/');

    const scheduleData = await page.evaluate(() => {
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

    scheduleCache = scheduleData;
    console.log('Scraped schedule successfully:', scheduleData);
    res.json({ success: true, schedule: scheduleData });
  } catch (error) {
    console.error('Error scraping schedule:', error.message);
    res.status(500).send('An error occurred while fetching the schedule.');
  }
});

app.get('/schedule', (req, res) => {
  if (scheduleCache.length === 0) {
    res.send('No schedule data available. Please try again later.');
  } else {
    res.json({ success: true, schedule: scheduleCache });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
