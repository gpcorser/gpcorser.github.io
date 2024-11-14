// Set new default font family and font color to mimic Bootstrap's default styling
Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
Chart.defaults.global.defaultFontColor = '#292b2c';

var myAmount = 9
// Bar Chart Example
var ctx = document.getElementById("myBarChart");
var myLineChart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ["Cute", "Sad", "FLUFFY", "Orange", "Sleepy", "Blanket"],
    datasets: [{
      label: "Number of Cats",
      // backgroundColor: "rgba(2,117,216,1)",
      backgroundColor: [
        "rgba(2,117,216,1)", // January
        "rgba(2,117,216,1)", // February
        "rgba(255,99,132,1)", // FLUFFY (custom color)
        "rgba(2,117,216,1)", // April
        "rgba(2,117,216,1)", // May
        "rgba(2,117,216,1)"  // June
      ],
      borderColor: "rgba(2,117,216,1)",
      data: [7, 10, myAmount, 12, 3, 6],
    }],
  },
  options: {
    scales: {
      xAxes: [{
        time: {
          unit: 'type'
        },
        gridLines: {
          display: false
        },
        ticks: {
          maxTicksLimit: 6
        }
      }],
      yAxes: [{
        ticks: {
          min: 0,
          max: 15,
          maxTicksLimit: 5
        },
        gridLines: {
          display: true
        }
      }],
    },
    legend: {
      display: false
    }
  }
});
