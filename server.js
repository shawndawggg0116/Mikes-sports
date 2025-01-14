app.get('/scrape-schedule', async (req, res) => {
    try {
      console.log('Launching Puppeteer...');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: 'C:/Users/shawn/Downloads/chrome-win/chrome.exe', // Your Chromium path
      });
      const page = await browser.newPage();
      console.log('Navigating to NFL schedules...');
      await page.goto('https://www.nfl.com/schedules/', {
        waitUntil: 'domcontentloaded',
      });
      console.log('Extracting schedule data...');
      const schedule = await page.evaluate(() => {
        const scheduleData = [];
        document.querySelectorAll('.nfl-o-matchup-group').forEach((group) => {
          const week = group.querySelector('.d3-o-section-title')?.innerText.trim() || 'Unknown Week';
          group.querySelectorAll('.nfl-c-matchup-strip').forEach((game) => {
            const homeTeam = game.querySelector('.nfl-c-matchup-strip_team--home .nfl-c-matchup-strip_team-fullname')?.innerText.trim();
            const awayTeam = game.querySelector('.nfl-c-matchup-strip_team--away .nfl-c-matchup-strip_team-fullname')?.innerText.trim();
            const gameDate = game.querySelector('.nfl-c-matchup-strip_gameDate .nfl-c-matchup-strip_date')?.innerText.trim();
            scheduleData.push({ week, homeTeam, awayTeam, gameDate });
          });
        });
        return scheduleData;
      });
      console.log('Schedule data extracted:', schedule);
      cachedSchedule = schedule;
      await browser.close();
      res.json({ success: true, schedule });
    } catch (error) {
      console.error('Error scraping schedule:', error.message);
      res.status(500).send('An error occurred while fetching the schedule.');
    }
  });
  