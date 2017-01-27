// Generates the chart to display the results of a poll
// @label: labels for the chart
// @votes: vote count for each option
function generateChart(labels, votes) {
    // Generate a random rgba color for the bar
    generateColor = function() {
        return "rgba(0," +
            Math.round(Math.random() * 255) + "," +
            Math.round(Math.random()) * 255 + ",1)";
    };

    var context = document.getElementById("pollChart");
    labels = labels.split(',');
    votes = votes.split(',');

    var myChart = new Chart(context, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '# of Votes',
                data: votes,
                backgroundColor: votes.map(function(option) {
                    return generateColor();
                }),
                borderWidth: 0
            }]
        },
        options: {
            scales: {
                xAxes: [{
                    gridLines: {
                        display: false
                    }
                }],
                yAxes: [{
                    ticks: {
                        beginAtZero:true
                    }
                }],
            }
        }
    });
}
