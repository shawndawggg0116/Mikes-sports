const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 5000;

let cachedSchedule = [];

// Middleware to serve static files
app.use(express.static('public'));

// Homepage route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Scraper route
app.get('/scrape-schedule', async (req, res) => {
  try {
    console.log('Navigating to NFL schedules page...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.CHROME_BIN || 'C:/Users/shawn/Downloads/chrome-win/chrome.exe', // Adjust path for Render or local
    });

    const page = await browser.newPage();
    await page.goto('https://www.nfl.com/schedules/', { waitUntil: 'domcontentloaded' });

    console.log('Extracting schedule data...');
    const schedule = await page.evaluate(() => {
      const scheduleData = [];
      document.querySelectorAll('.nfl-o-matchup-group').forEach((group) => {
        const week = group.querySelector('.d3-o-section-title')?.innerText || 'Unknown Week';
        group.querySelectorAll('.nfl-c-matchup-strip').forEach((game) => {
          const home = game.querySelector('.nfl-c-matchup-strip__team--home')?.innerText.trim();
          const away = game.querySelector('.nfl-c-matchup-strip__team--away')?.innerText.trim();
          const date = game.querySelector('.nfl-c-matchup-strip__date')?.innerText.trim();
          scheduleData.push({ week, home, away, date });
        });
      });
      return scheduleData;
    });

    cachedSchedule = schedule; // Cache the schedule data
    console.log('Schedule scraped successfully:', schedule);

    await browser.close();
    res.json({ success: true, schedule });
  } catch (error) {
    console.error('Error scraping schedule:', error);
    res.status(500).send('An error occurred while fetching the schedule.');
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
