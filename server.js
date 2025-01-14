const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Cached schedule data
let cachedSchedule = [];

// Puppeteer scraper to fetch game schedules
async function scrapeSchedule() {
    try {
        const url = 'https://www.nfl.com/schedules/';
        console.log('Starting schedule scraper...');

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const schedule = await page.evaluate(() => {
            const scheduleData = [];
            document.querySelectorAll('.nfl-o-matchup-group').forEach(group => {
                const week = group.querySelector('.d3-o-section-title')?.innerText.trim() || 'Unknown Week';
                group.querySelectorAll('.nfl-c-matchup-strip').forEach(game => {
                    const homeTeam = game.querySelector('.nfl-c-matchup-strip__team-fullname--home')?.innerText.trim();
                    const awayTeam = game.querySelector('.nfl-c-matchup-strip__team-fullname--away')?.innerText.trim();
                    const status = game.querySelector('.nfl-c-matchup-strip__date')?.innerText.trim();

                    if (homeTeam && awayTeam) {
                        scheduleData.push({ week, homeTeam, awayTeam, status });
                    }
                });
            });
            return scheduleData;
        });

        await browser.close();

        console.log('Scraped schedule:', schedule);
        cachedSchedule = schedule;
    } catch (error) {
        console.error('Error scraping schedule:', error);
    }
}

// Route to display the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API route to get the schedule
app.get('/api/schedule', (req, res) => {
    if (cachedSchedule.length === 0) {
        return res.status(503).send({ message: 'Schedule data is not available yet. Please try again later.' });
    }
    res.json(cachedSchedule);
});

// Run the scraper periodically (every 6 hours)
const cron = require('node-cron');
cron.schedule('0 */6 * * *', scrapeSchedule);

// Start scraping when the server starts
scrapeSchedule();

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Create the public/index.html file
const fs = require('fs');
const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Schedule</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
        h1 { color: #333; }
        table { margin: 20px auto; border-collapse: collapse; width: 80%; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background-color: #f4f4f4; }
    </style>
</head>
<body>
    <h1>NFL Game Schedule</h1>
    <div id="schedule">Loading schedule...</div>
    <script>
        fetch('/api/schedule')
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    document.getElementById('schedule').innerText = data.message;
                } else {
                    const table = document.createElement('table');
                    const header = `<tr><th>Week</th><th>Home Team</th><th>Away Team</th><th>Status</th></tr>`;
                    table.innerHTML = header + data.map(game => `<tr><td>${game.week}</td><td>${game.homeTeam}</td><td>${game.awayTeam}</td><td>${game.status}</td></tr>`).join('');
                    document.getElementById('schedule').appendChild(table);
                }
            })
            .catch(err => {
                document.getElementById('schedule').innerText = 'Error fetching schedule.';
                console.error(err);
            });
    </script>
</body>
</html>`;

fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), indexContent);
