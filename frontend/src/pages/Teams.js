import React, { useEffect, useState } from "react";

const Teams = () => {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetch("https://your-app.up.railway.app/api/teams")  // Update this once deployed
      .then(res => res.json())
      .then(data => setTeams(data));
  }, []);

  return (
    <div>
      <h1>Select Your Team</h1>
      {teams.map(team => (
        <button key={team.name}>{team.name}</button>
      ))}
    </div>
  );
};

export default Teams;
