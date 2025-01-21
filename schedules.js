const schedules = [
    {
        gameId: "1",
        teamA: "Buffalo Bills",
        teamB: "Kansas City Chiefs",
        startTime: new Date(new Date().getTime() - 2 * 60 * 60 * 1000), // Started 2 hours ago
        endTime: new Date(new Date().getTime() + 1 * 60 * 60 * 1000), // Ends in 1 hour
    },
    {
        gameId: "2",
        teamA: "Dallas Cowboys",
        teamB: "San Francisco 49ers",
        startTime: new Date(new Date().getTime() - 5 * 60 * 60 * 1000), // Started 5 hours ago
        endTime: new Date(new Date().getTime() - 3 * 60 * 60 * 1000), // Ended 3 hours ago
    },
    {
        gameId: "3",
        teamA: "Green Bay Packers",
        teamB: "Chicago Bears",
        startTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // Starts in 2 hours
        endTime: new Date(new Date().getTime() + 5 * 60 * 60 * 1000), // Ends in 5 hours
    },
    {
        gameId: "4",
        teamA: "Miami Dolphins",
        teamB: "New York Jets",
        startTime: new Date(new Date().getTime() - 4 * 60 * 60 * 1000), // Started 4 hours ago
        endTime: new Date(new Date().getTime() - 1 * 60 * 60 * 1000), // Ended 1 hour ago
    },
    {
        gameId: "5",
        teamA: "Seattle Seahawks",
        teamB: "Arizona Cardinals",
        startTime: new Date(new Date().getTime() + 4 * 60 * 60 * 1000), // Starts in 4 hours
        endTime: new Date(new Date().getTime() + 7 * 60 * 60 * 1000), // Ends in 7 hours
    },
];

module.exports = schedules;
