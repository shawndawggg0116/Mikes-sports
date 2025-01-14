const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 5000;

// Route to scrape and display the schedule
app.get('/', async (req, res) => {
    try {
        // Launch Puppeteer
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        // Navigate to the NFL schedules page
        await page.goto('https://www.nfl.com/schedules/', { waitUntil: 'domcontentloaded' });

        // Scrape the schedule data
        const schedule = await page.evaluate(() => {
            const scheduleData = [];
            document.querySelectorAll('.nfl-o-matchup-group').forEach(group => {
                const week = group.querySelector('.d3-o-section-title')?.innerText.trim();
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

        // Generate the HTML response
        const header = `<tr><th>Week</th><th>Home Team</th><th>Away Team</th><th>Status</th></tr>`;
        const rows = schedule.map(
            game => `<tr><td>${game.week}</td><td>${game.homeTeam}</td><td>${game.awayTeam}</td><td>${game.status}</td></tr>`
        ).join('');

        const scheduleHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>NFL Schedule</title>
                <style>
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f4f4f4;
                    }
                </style>
            </head>
            <body>
                <h1>NFL Schedule</h1>
                <table>
                    ${header}
                    ${rows}
                </table>
            </body>
            </html>
        `;

        res.send(scheduleHTML);
    } catch (error) {
        console.error('Error scraping schedule:', error);
        res.status(500).send('An error occurred while fetching the schedule.');
    }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
