// server.js
import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 5000;

let cachedSchedule = [];

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

app.get('/scrape-schedule', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Example of a smaller, simpler site to scrape
    await page.goto('https://example.com'); // Replace with a simple site URL

    const schedule = await page.evaluate(() => {
      // Adjust selectors to match the new site's structure
      return Array.from(document.querySelectorAll('p')).map(el => el.textContent);
    });

    cachedSchedule = schedule;

    await browser.close();

    res.json({ success: true, schedule });
  } catch (error) {
    console.error('Error scraping schedule:', error);
    res.status(500).send('An error occurred while fetching the schedule.');
  }
});

app.get('/schedule', (req, res) => {
  if (cachedSchedule.length === 0) {
    return res.status(503).send('No schedule data available. Please try again later.');
  }
  res.json(cachedSchedule);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
