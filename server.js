import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 5000;

// Route to scrape the schedule
app.get('/scrape-schedule', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/usr/bin/google-chrome-stable', // Adjust to your Render environment's Chrome path
    });

    const page = await browser.newPage();
    await page.goto('https://www.nfl.com/schedules/', { waitUntil: 'load', timeout: 0 });

    // Scrape schedule data
    const schedule = await page.evaluate(() => {
      const data = [];
      document.querySelectorAll('.schedule-list').forEach((item) => {
        data.push(item.innerText);
      });
      return data;
    });

    console.log('Schedule scraped successfully:', schedule);
    await browser.close();

    res.json({ success: true, schedule });
  } catch (error) {
    console.error('Error scraping schedule:', error);
    res.status(500).send('An error occurred while fetching the schedule.');
  }
});

// Route to get cached schedule (if you have caching logic)
app.get('/schedule', (req, res) => {
  res.status(503).send('No schedule data available. Please try again later.');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
