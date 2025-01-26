$(document).ready(function() {
    $('.team-container').click(function() {
        var selectedTeam = $(this).find('p').text();

        $.ajax({
            type: 'POST',
            url: '/select-team', // Replace with your actual endpoint
            data: { team: selectedTeam },
            success: function(response) {
                // Handle successful team selection (e.g., display a success message)
                alert('Team selected successfully!'); 
            },
            error: function(error) {
                // Handle errors (e.g., display an error message)
                alert('Error selecting team. Please try again.');
            }
        });
    });
});