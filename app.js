
var API_KEY = "6841e5450643e5d4ff59981dbf58944e";

// -- On load --
$(document).ready(function(){
    // If geolocation is not supported, hide the geolocaion icon
    if (!navigator.geolocation){
        $('#geolocation').hide();
    }
    // Get default city
    var city;
    if (document.location.hash){
        // Get city from hash
        city = document.location.hash.substr(1);
    }
    else {
        // Default city
        city = "London";
    }
    // Get and display current date
    date = moment();
    for (var i = 0; i < 3; i++){
        // Display date
        day = $("#meteo-day-" + (i+1));
        day.find(".name").text(date.format("dddd"));
        day.find(".date").text(date.format("DD/MM"));
        // Go to the next day
        date = date.add(1, 'days')
    }
    // Loading...
    loading = $('#search-loading');
    loading.attr('class', 'loading inload');
    // Get and update meteo
    getMeteoByCity(city, function (data, error) {
        if (error == null) {
            displayMeteo(data);
        }
        else {
            meteoTitle = $('#meteo-title span');
            meteoTitle.html('City <span class="text-muted">' + city + '</span> not found');
        }
        // Stop loader
        setTimeout(function () {
            loading.attr('class', 'loading')
        }, 500);
    });
});


// -- Core --
$("#meteo-form").submit(function (event) {
    // Loading...
    loading = $('#search-loading');
    loading.attr('class', 'loading inload');
    // Get and update meteo
    var city = event.currentTarget[0].value;
    getMeteoByCity(city, function (data, error){
        if (error == null) {
            displayMeteo(data);
        }
        else {
            meteoTitle = $('#meteo-title span');
            meteoTitle.html('City <span class="text-muted">' + city + '</span> not found');
        }
        // Stop loader
        setTimeout(function () {
            loading.attr('class', 'loading')
        }, 500);
    });
    // Don't refresh the page
    return false;
});

$("#geolocation").click(function (event) {
    navigator.geolocation.getCurrentPosition(function (position) {
        // Loading...
        loading = $('#search-loading');
        loading.attr('class', 'loading inload');
        // Get latitude and longitude
        var lat = position.coords.latitude
        var lon = position.coords.longitude
        // Get and update meteo
        getMeteoByCoordinates(lat, lon, function (data, error) {
            if (error == null) {
                displayMeteo(data);
            }
            else {
                meteoTitle = $('#meteo-title span');
                meteoTitle.html('Can\'t  get meteo for your position');
            }
            // Stop loader
            setTimeout(function () {
                loading.attr('class', 'loading')
            }, 500);
        });
    });
});

function getMeteoByCity(city, callback){
    $.ajax({
        url: "https://api.openweathermap.org/data/2.5/forecast?q=" + city + "&APPID=" + API_KEY,
        success: function(data){
            callback(data, null);
        },
        error: function(req, status, error){
            callback(null, error);
        }
    });
}

function getMeteoByCoordinates(lat, lon, callback){
    $.ajax({
        url: "https://api.openweathermap.org/data/2.5/forecast?lat=" + lat + "&lon=" + lon + "&APPID=" + API_KEY,
        success: function(data){
            callback(data, null);
        },
        error: function(req, status, error){
            callback(null, error);
        }
    });
}

function displaySunriseSunset(lat, long){
    date = moment();
    for (var i = 0; i < 3; i++) {
        // Get sunrise and sunset
        var times = SunCalc.getTimes(date, lat, long);
        var sunrise = pad(times.sunrise.getHours(), 2) + ':' + pad(times.sunrise.getMinutes(), 2);
        var sunset = pad(times.sunset.getHours(), 2) + ':' + pad(times.sunset.getMinutes(), 2);
        // Display sunrise and sunset
        day = $("#meteo-day-" + (i + 1));
        day.find('.meteo-sunrise .meteo-block-data').text(sunrise);
        day.find('.meteo-sunset .meteo-block-data').text(sunset);
        // Go to the next day
        date = date.add(1, 'days')
    }

}
function displayAlerts(data) {
    const alertsContainer = $('#weather-alerts');
    alertsContainer.empty();

    if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach(alert => {
            const alertElement = $('<div class="alert alert-warning" role="alert"></div>');
            alertElement.html(`<strong>${alert.event}</strong>: ${alert.description}`);
            alertsContainer.append(alertElement);
        });
    } else {
        const noAlertElement = $('<div class="alert alert-info" role="alert">No current weather alerts.</div>');
        alertsContainer.append(noAlertElement);
    }
    alertsContainer.show();
}


function displayMeteo(data){
    // Update Google Map URL
    googleMapCity = "https://www.google.fr/maps/place/" + data.city.coord.lat + "," + data.city.coord.lon;
    $('#meteo-title span').html('Weather in <a href="' + googleMapCity + '" class="text-muted meteo-city" target="_blank">' + data.city.name + ', ' + data.city.country + '</a>');
    // Update meteo for each day
    var tempMoyenne = 0;
    $('#historical-weather').remove();
    displayAlerts(data);
    integrateHistoricalWeather(data.city);
    for (var i = 0; i < 3; i++){
        // Get meteo
        meteo = data.list[i*8];
        // Get DOM elements
        day = $("#meteo-day-" + (i + 1));
        icon = day.find(".meteo-temperature .wi");
        temperature = day.find(".meteo-temperature .data");
        humidity = day.find(".meteo-humidity .meteo-block-data");
        wind = day.find(".meteo-wind .meteo-block-data");
        sunrise = day.find(".meteo-sunrise .meteo-block-data");
        sunset = day.find(".meteo-sunset .meteo-block-data");
        // Update DOM
        code = meteo.weather[0].id;
        icon.attr('class', 'wi wi-owm-' + code);
        temperature.text(toCelsius(meteo.main.temp) + "°C");
        humidity.text(meteo.main.humidity + "%");
        wind.text(meteo.wind.speed + " km/h");
        tempMoyenne += meteo.main.temp;
        displayAlerts(data);

    }
    function getHistoricalWeather(city, callback) {
        const endDate = Math.floor(Date.now() / 1000); // Current time in Unix timestamp
        const oneDay = 24 * 60 * 60; // Number of seconds in a day
        let historicalData = [];
        let requestsCompleted = 0;
    
        for (let i = 1; i <= 5; i++) {
            const date = endDate - (i * oneDay);
            
            $.ajax({
                url: `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${city.coord.lat}&lon=${city.coord.lon}&dt=${date}&appid=${API_KEY}`,
                success: function(data) {
                    historicalData.push(data);
                    requestsCompleted++;
                    
                    if (requestsCompleted === 5) {
                        console.log("All historical data received:", historicalData);
                        callback(historicalData, null);
                    }
                },
                error: function(req, status, error) {
                    console.error(`Error fetching historical data for day ${i}:`, status, error);
                    requestsCompleted++;
                    
                    if (requestsCompleted === 5) {
                        if (historicalData.length > 0) {
                            console.log("Partial historical data received:", historicalData);
                            callback(historicalData, null);
                        } else {
                            callback(null, "Failed to fetch any historical data");
                        }
                    }
                }
            });
        }
    }
    
    function integrateHistoricalWeather(city) {
        console.log("Integrating historical weather for:", city.name);
        getHistoricalWeather(city, function(data, error) {
            if (error === null) {
                displayHistoricalWeather(data);
            } else {
                console.error("Error fetching historical weather data:", error);
                displayHistoricalWeather(null);
            }
        });
    }
    
    function displayHistoricalWeather(data) {
        console.log("Displaying historical data:", data);
    
        // Remove any existing historical weather container
        $('#historical-weather').remove();
    
        const historicalContainer = $('<div id="historical-weather" class="mt-4"></div>');
        $('#meteo-title').after(historicalContainer);
    
        const header = $('<h3>Historical Weather (Past 5 Days)</h3>');
        historicalContainer.append(header);
    
        if (!data || data.length === 0) {
            historicalContainer.append('<p>No historical data available.</p>');
            return;
        }
    
        const table = $('<table class="table table-striped"></table>');
        const tableHeader = $('<thead><tr><th>Date</th><th>Temperature</th><th>Humidity</th><th>Wind Speed</th></tr></thead>');
        const tableBody = $('<tbody></tbody>');
    
        table.append(tableHeader);
        table.append(tableBody);
    
        // Sort the data chronologically (most recent first)
        data.sort((a, b) => b.current.dt - a.current.dt);
    
        data.forEach(day => {
            const date = new Date(day.current.dt * 1000);
            const row = $('<tr></tr>');
            row.append(`<td>${date.toLocaleDateString()}</td>`);
            row.append(`<td>${toCelsius(day.current.temp)}°C</td>`);
            row.append(`<td>${day.current.humidity}%</td>`);
            row.append(`<td>${day.current.wind_speed} km/h</td>`);
            tableBody.append(row);
        });
    
        historicalContainer.append(table);
    }
    displaySunriseSunset(data.city.coord.lat, data.city.coord.lon);
    // Get custom gradient according to the temperature
    tempMoyenne = toCelsius(tempMoyenne / 3);
    var hue1 = 30 + 240 * (30 - tempMoyenne) / 60;
    var hue2 = hue1 + 30;
    rgb1 = 'rgb(' + hslToRgb(hue1 / 400, 0.7, 0.5).join(',') + ')';
    rgb2 = 'rgb(' + hslToRgb(hue2 / 400, 0.7, 0.5).join(',') + ')';
    $('body').css('background', 'linear-gradient(' + rgb1 + ',' + rgb2 + ')');

    
}