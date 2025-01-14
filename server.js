const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 5000;

let cachedSchedule = [];

// Middleware to serve static files
app.use(express.static('public'));

// Homepage Route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Scraper Route
app.get('/scrape-schedule', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    console.log('Navigating to NFL schedules page...');
    await page.goto('https://www.nfl.com/schedules/', { waitUntil: 'domcontentloaded' });

    console.log('Extracting schedule data...');
    const schedule = await page.evaluate(() => {
      const scheduleData = [];
      document.querySelectorAll('.nfl-o-matchup-group').forEach(group => {
        const week = group.querySelector('.d3-o-section-title')?.innerText.trim() || 'Unknown Week';
        group.querySelectorAll('.nfl-c-matchup-strip').forEach(game => {
          const homeTeam = game.querySelector('.nfl-c-matchup-strip__team-fullname--home')?.innerText.trim();
          const awayTeam = game.querySelector('.nfl-c-matchup-strip__team-fullname--away')?.innerText.trim();
          const status = game.querySelector('.nfl-c-matchup-strip__date')?.innerText.trim();

          if (homeTeam && awayTeam) {
            scheduleData.push({ week, homeTeam, awayTeam, status: status || 'Pending' });
          }
        });
      });
      return scheduleData;
    });

    console.log('Schedule scraped successfully:', schedule);
    cachedSchedule = schedule;

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
