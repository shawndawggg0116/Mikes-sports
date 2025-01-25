async function loadGameStatusesAndPicks() {
    try {
        const username = 'exampleUser'; // Replace with dynamic value
        const response = await fetch(`/api/game-status?username=${username}`);
        const data = await response.json();

        if (data.success) {
            const { games, pickedTeams } = data;

            // Update game statuses and user picks
            games.forEach(game => {
                const homeTeamElement = document.getElementById(game.homeTeam);
                const awayTeamElement = document.getElementById(game.awayTeam);

                if (homeTeamElement) {
                    homeTeamElement.classList.remove('flashing', 'disabled', 'upcoming', 'selected');
                    homeTeamElement.classList.add(game.status.toLowerCase()); // Apply game status
                    if (pickedTeams.includes(game.homeTeam)) {
                        homeTeamElement.classList.add('selected'); // Highlight user's pick
                    }
                }

                if (awayTeamElement) {
                    awayTeamElement.classList.remove('flashing', 'disabled', 'upcoming', 'selected');
                    awayTeamElement.classList.add(game.status.toLowerCase()); // Apply game status
                    if (pickedTeams.includes(game.awayTeam)) {
                        awayTeamElement.classList.add('selected'); // Highlight user's pick
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading game statuses and picks:', error);
        alert('Unable to load game statuses.');
    }
}

// Initial load and periodic refresh
loadGameStatusesAndPicks();
setInterval(loadGameStatusesAndPicks, 30000); // Refresh every 30 seconds

// Render all teams dynamically
const teams = [
  'Cardinals', 'Falcons', 'Ravens', 'Bills', 'Panthers', 'Bears', 'Bengals', 
  'Browns', 'Cowboys', 'Broncos', 'Lions', 'Packers', 'Texans', 'Colts', 
  'Jaguars', 'Chiefs', 'Raiders', 'Chargers', 'Rams', 'Dolphins', 'Vikings', 
  'Patriots', 'Saints', 'Giants', 'Jets', 'Eagles', 'Steelers', '49ers', 
  'Seahawks', 'Buccaneers', 'Titans', 'Commanders'
];

const teamList = document.querySelector('.team-list');
teams.forEach(team => {
    const teamDiv = document.createElement('div');
    teamDiv.textContent = team;
    teamDiv.id = team; // Use team name as ID
    teamDiv.classList.add('team');
    teamList.appendChild(teamDiv);
});
