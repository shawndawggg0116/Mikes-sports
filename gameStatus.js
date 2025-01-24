
async function loadGameStatuses() {
    try {
        const response = await fetch('/api/game-status');
        const games = await response.json();

        games.forEach(game => {
            const homeTeamButton = document.querySelector(`#${game.homeTeam}`);
            const awayTeamButton = document.querySelector(`#${game.awayTeam}`);

            [homeTeamButton, awayTeamButton].forEach(button => {
                if (button) {
                    console.log(`Updating ${button.id}: ${game.status}`); // Debugging log
                    button.classList.remove('flashing', 'disabled', 'upcoming');
                    button.classList.add(game.status);
                }
            });
        });
    } catch (error) {
        console.error('Error loading game statuses:', error);
    }
}

loadGameStatuses();
setInterval(loadGameStatuses, 30000);
