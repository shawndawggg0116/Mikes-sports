document.addEventListener('DOMContentLoaded', () => {
  fetch('https://mikes-sports.onrender.com/schedules/1') // Adjust "1" for dynamic week selection
    .then(response => response.json())
    .then(data => {
      const games = data.schedule.games;
      const teamContainer = document.getElementById('team-selection');

      games.forEach(game => {
        // Create buttons for home and away teams
        const homeTeamButton = document.createElement('button');
        const awayTeamButton = document.createElement('button');

        homeTeamButton.innerText = game.homeTeam;
        awayTeamButton.innerText = game.awayTeam;

        // Apply styles based on game status
        if (game.status === 'Scheduled') {
          homeTeamButton.style.backgroundColor = 'green';
          awayTeamButton.style.backgroundColor = 'green';
        } else if (game.status === 'Played') {
          homeTeamButton.style.backgroundColor = 'gray';
          awayTeamButton.style.backgroundColor = 'gray';
        }

        // Add click event listeners
        homeTeamButton.addEventListener('click', () => selectTeam(game.homeTeam));
        awayTeamButton.addEventListener('click', () => selectTeam(game.awayTeam));

        // Append buttons to the container
        teamContainer.appendChild(homeTeamButton);
        teamContainer.appendChild(awayTeamButton);
      });
    })
    .catch(err => console.error('Error fetching schedule:', err));
});

let username = '';

fetch('/get-logged-in-user')
  .then(response => response.json())
  .then(data => {
    if (data.username) {
      username = data.username;
    } else {
      alert('Error: User not logged in.');
    }
  })
  .catch(err => console.error('Error fetching logged-in user:', err));

  function selectTeam(team) {
    fetch('https://mikes-sports.onrender.com/select-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, team })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert(`You successfully picked ${team}`);
        } else {
          alert(data.message);
        }
      })
      .catch(err => console.error('Error selecting team:', err));
  }
  

// Function to handle team selection
function selectTeam(team) {
  fetch('https://mikes-sports.onrender.com/select-team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'exampleUser', team }) // Replace 'exampleUser' with dynamic username if needed
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert(`You successfully picked ${team}`);
      } else {
        alert(data.message);
      }
    })
    .catch(err => console.error('Error selecting team:', err));
}
