// Import necessary modules
const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 5000;

// Route to scrape schedule data
app.get("/scrape-schedule", async (req, res) => {
  try {
    console.log("Launching Puppeteer...");

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Navigate to Pro-Football-Reference
    await page.goto("https://www.pro-football-reference.com", {
      waitUntil: "domcontentloaded",
    });

    console.log("Extracting schedule data...");

    // Example: Modify this selector to target the correct data
    const data = await page.evaluate(() => {
      const result = [];
      document.querySelectorAll(".some-selector").forEach((el) => {
        result.push(el.innerText);
      });
      return result;
    });

    console.log("Schedule scraped successfully:", data);

    await browser.close();

    res.json({ success: true, schedule: data });
  } catch (error) {
    console.error("Error scraping schedule:", error);
    res.status(500).send("An error occurred while fetching the schedule.");
  }
});

// Route to serve cached schedule (if needed)
app.get("/schedule", (req, res) => {
  res.status(503).send("No schedule data available. Please try again later.");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
