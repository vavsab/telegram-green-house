app = angular.module('angularModule', []);

app.controller('mainController', ['$scope', '$http', function ($scope, $http) {
    var self = this;

    self.config = null;
    self.isOnline = false;

    var updateSensors = function(data) {
        if (data == null || data.temperature == null) 
            return;

        self.isOnline = true;
        self.sensors = data;
        self.lastUpdate = new Date();
        $scope.$applyAsync();
    }

    $http.get("/api/data")
    .then(function (result) {
        updateSensors(result.data);
    }).then(function () {
        var socket = io('/');

        socket.on('sensorData', function(data) {
            updateSensors(data);
        });
    });

    $http.get('/api/config')
    .then(function (result) {
        self.config = result.data;
        $scope.$applyAsync();
    });

    setInterval(() => {
        // Go offline after 10 seconds of idle
        if (self.isOnline && (new Date() - self.lastUpdate) > 1000 * 10) {
            self.isOnline = false;
            $scope.$applyAsync();
        }
    }, 1000);
}]);

app.controller('gaugeController', ['$scope', function ($scope) {
    var self = this;

    var currentValue = null;

    $scope.$watch('$gauge.type', function (newValue) {
        if (!newValue) 
            return;

        self.isHumidity = newValue == 'humidity';
        self.maxValue = self.isHumidity ? 100 : 40;
        self.minValue = self.isHumidity ? 0 : 5;

        if (self.isHumidity) {
            // Put from lowest to highest
            self.colors = [
                '#00f0ff',
                '#00e0ff',
                '#00d0ff',
                '#00c0ff',
                '#00bfff',
                '#00b0ff',
                '#00a0ff',
                '#0090ff',
                '#0080ff',
                '#0070ff',
                '#0060ff',
                '#0050ff',
                '#0048ff',
                '#0040ff',
                '#0038ff',
                '#0030ff',
                '#0028ff',
                '#0020ff',
                '#0010ff',
                '#0000ff',
            ];
        } else {
            // Put from lowest to highest
            self.colors = [
                '#0000ff',
                '#0010ff',
                '#0020ff',
                '#0030ff',
                '#0040ff',
                '#0050ff',
                '#0060ff',
                '#0070ff',
                '#0080ff',
                '#00bfff',
                '#ffbf00',
                '#ff8000',
                '#ff7000',
                '#ff6000',
                '#ff5000',
                '#ff4000',
                '#ff3000',
                '#ff2000',
                '#ff1000',
                '#ff0000'
            ];
        }

        // For rendering first should go the highest value
        self.colors.reverse();
    });

    $scope.$parent.$watch('$ctrl.sensors', function(newValue) {
        if (newValue == null)
            return;

        if (self.isHumidity == null)
            return;

        if (!self.isHumidity && newValue.temperature != null) {
            currentValue = newValue.temperature;
        } else if (self.isHumidity && newValue.humidity != null) {
            currentValue = newValue.humidity;
        }
    });

    self.isVisible = function (color) {
        if (currentValue == null)
            return false;

        if (self.maxValue == null || self.minValue == null)
            return false;

        var elementsToShow = ((currentValue - self.minValue) / (self.maxValue - self.minValue)) * self.colors.length;
        if (elementsToShow > self.colors.length) {
            elementsToShow = self.colors.length;
        }

        if (elementsToShow < 0) {
            elementsToShow = 0;
        }
        
        startToShowFromIndex = self.colors.length - elementsToShow - 1;

        return self.colors.indexOf(color) > startToShowFromIndex;
    }
}]);