const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/scrape-standings', async (req, res) => {
  try {
    console.log('Launching Puppeteer...');
    const browser = await puppeteer.launch({
      headless: false, // Use 'true' for deployment
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: 'C:/Users/shawn/Downloads/chrome-win/chrome', // Your Chromium path
    });

    const page = await browser.newPage();
    console.log('Navigating to Pro-Football-Reference...');
    await page.goto('https://www.pro-football-reference.com/years/2024/', { waitUntil: 'networkidle2' });

    console.log('Waiting for standings tables...');
    await page.waitForSelector('table.stats_table', { timeout: 10000 });

    console.log('Extracting standings...');
    const standings = await page.evaluate(() => {
      const extractTeamData = (tableSelector) => {
        const table = document.querySelector(tableSelector);
        if (!table) return null;

        const rows = table.querySelectorAll('tbody tr');
        const data = [];
        rows.forEach(row => {
          const teamName = row.querySelector('th[data-stat="team"] a')?.innerText || 'N/A';
          const wins = row.querySelector('td[data-stat="wins"]')?.innerText || '0';
          const losses = row.querySelector('td[data-stat="losses"]')?.innerText || '0';
          data.push({ team: teamName, wins, losses });
        });
        return data;
      };

      return {
        AFC: extractTeamData('table#AFC_standings'),
        NFC: extractTeamData('table#NFC_standings'),
      };
    });

    console.log('Closing browser...');
    await browser.close();

    if (!standings || !standings.AFC || !standings.NFC) {
      throw new Error('Failed to extract standings data.');
    }

    console.log('Standings successfully extracted:', standings);
    res.json({ success: true, standings });
  } catch (error) {
    console.error('Error scraping standings:', error.message);
    res.status(500).json({ success: false, message: 'Failed to scrape standings.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
