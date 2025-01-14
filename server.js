// Import necessary modules
const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 5000;
let cachedSchedule = [];

// Route to scrape the NFL schedule
app.get('/scrape-schedule', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: 'C:/Users/shawn/Downloads/chrome-win/chrome.exe' // Update with your Chrome path
    });

    const page = await browser.newPage();
    await page.goto('https://www.espn.com/nfl/schedule', { waitUntil: 'domcontentloaded' });

    const schedule = await page.evaluate(() => {
      const games = [];
      document.querySelectorAll('.Table__TR--sm').forEach((row) => {
        const teams = row.querySelector('.Table__TD')?.innerText;
        const time = row.querySelector('.nfl-cp-schedule__time')?.innerText;
        if (teams && time) {
          games.push({ teams, time });
        }
      });
      return games;
    });

    cachedSchedule = schedule;
    await browser.close();

    res.json({ success: true, schedule });
  } catch (error) {
    console.error('Error scraping schedule:', error);
    res.status(500).send('Failed to scrape schedule.');
  }
});

// Route to get the cached schedule
app.get('/schedule', (req, res) => {
  if (cachedSchedule.length === 0) {
    return res.status(503).send('No schedule data available. Please try again later.');
  }
  res.json(cachedSchedule);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
