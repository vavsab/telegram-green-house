var socket = io('/');

$(function () {
    function onWaterChanged(isOn) {
        $('#water-state').text(isOn ? 'On' : 'Off');
    }

    function onLightsChanged(isOn) {
        $('#lights-state').text(isOn ? 'On' : 'Off');
    }

    socket.on('water-changed', onWaterChanged);
    socket.on('lights-changed', onLightsChanged);

    $.get('/api/config', function (data) {
        if (data.linkToRepository) {
            $('#forkMeLink').attr('href', data.linkToRepository).css('display', 'block');
        }

        if (data.linkToPanel) {
            $('#panelLink').attr('href', data.linkToPanel).css('display', 'block');
        }

        if (data.linkToBot) {
            $('#botLink').attr('href', data.linkToBot).css('display', 'block');
        }
    });

    $.get('/api/data', function (data) {
        onWaterChanged(data.isWaterOn);
        onLightsChanged(data.isLightsOn);

        var temperatureHandle = $('#handle-temperature');
        var humidityHandle = $('#handle-humidity');

        $('#slider-temperature').slider({
            value: data.temperature,
            create: function () {
                temperatureHandle.text($(this).slider('value') + '°C');
            },
            slide: function (event, ui) {
                var value = ui.value;
                temperatureHandle.text(value + '°C');
                socket.emit('temperature', value);
            }
        });

        $('#slider-humidity').slider({
            value: data.humidity,
            create: function () {
                humidityHandle.text($(this).slider('value') + '%');
            },
            slide: function (event, ui) {
                var value = ui.value;
                humidityHandle.text(value + '%');
                socket.emit('humidity', value);
            }
        });
    });
} );