const puppeteer = require('puppeteer');

async function scrapeNFLStandings() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: 'C:/Users/shawn/Downloads/chrome-win/chrome-win/chrome.exe', // Update the path if necessary
    });

    const page = await browser.newPage();
    await page.goto('https://www.pro-football-reference.com/years/2024/', { waitUntil: 'networkidle2' });

    // Extract table data
    const standings = await page.evaluate(() => {
        const data = [];
        const tables = document.querySelectorAll('.sortable.stats_table tbody');
        
        tables.forEach((table) => {
            const rows = table.querySelectorAll('tr[data-row]');
            rows.forEach((row) => {
                const team = row.querySelector('th[data-stat="team"] a')?.textContent || 'N/A';
                const wins = row.querySelector('td[data-stat="wins"]')?.textContent || '0';
                const losses = row.querySelector('td[data-stat="losses"]')?.textContent || '0';
                const pct = row.querySelector('td[data-stat="win_loss_pct"]')?.textContent || '0.000';

                data.push({ team, wins, losses, pct });
            });
        });

        return data;
    });

    await browser.close();
    return standings;
}

// Use the scraper function
scrapeNFLStandings().then(data => console.log(data)).catch(err => console.error(err));
