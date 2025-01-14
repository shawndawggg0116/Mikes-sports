const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to scrape NFL schedules
app.get('/scrape-schedule', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    console.log("Navigating to NFL schedules page...");
    await page.goto('https://www.nfl.com/schedules/', { waitUntil: 'domcontentloaded' });

    console.log("Extracting schedule data...");
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

    console.log("Schedule data extracted:", schedule);
    await browser.close();

    res.json(schedule);
  } catch (error) {
    console.error("Error occurred while scraping NFL schedules:", error);
    res.status(500).send('An error occurred while fetching the schedule.');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
