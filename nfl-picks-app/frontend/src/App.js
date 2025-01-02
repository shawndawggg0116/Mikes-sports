import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState(null);

  const teams = [
    "Arizona Cardinals",
    "Atlanta Falcons",
    "Baltimore Ravens",
    "Buffalo Bills",
    // Add the rest of the teams here...
  ];

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });
      setToken(response.data.token);
      setIsLoggedIn(true);
      setError("");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    }
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
  };

  const handleSubmit = () => {
    if (!selectedTeam) {
      alert("Please select a team.");
      return;
    }
    alert(`You selected: ${selectedTeam}`);
    // Here, you can make an API call to save the user's selection if needed
  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <div>
          <h1>Login</h1>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin}>Sign In</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      ) : (
        <div>
          <h1>Welcome!</h1>
          <h2>Select your favorite NFL team</h2>
          <div className="teams-grid">
            {teams.map((team) => (
              <button
                key={team}
                onClick={() => handleTeamSelect(team)}
                className={selectedTeam === team ? "selected" : ""}
              >
                {team}
              </button>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={!selectedTeam}>
            Submit
          </button>
        </div>
      )}
    </div>
  );
}

export default App;


