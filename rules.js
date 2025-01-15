document.addEventListener("DOMContentLoaded", () => {
  fetch("/current-schedule")
    .then((response) => response.json())
    .then((data) => {
      const scheduleDiv = document.getElementById("game-schedule");

      if (data && data.length > 0) {
        const week = data[0].week;
        const games = data.map(
          (game) => `
          <div>
            <strong>${game.homeTeam} vs. ${game.awayTeam}</strong>
            <p>${game.date} - ${game.time} at ${game.location}</p>
          </div>
        `
        ).join("");

        scheduleDiv.innerHTML = `
          <h3>Week ${week} Schedule</h3>
          ${games}
        `;
      } else {
        scheduleDiv.innerHTML = "<p>No games scheduled for this week.</p>";
      }
    })
    .catch((error) => {
      console.error("Error fetching the schedule:", error);
      document.getElementById("game-schedule").innerHTML =
        "<p>Unable to load schedule. Please try again later.</p>";
    });
});
