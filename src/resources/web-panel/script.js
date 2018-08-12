app = angular.module('angularModule', []);

app.controller('mainController', ['$scope', '$http', function ($scope, $http) {
    var self = this;

    self.config = null;

    var updateSensors = function(data) {
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
        // if (data.linkToRepository) {
        //     $('#forkMeLink').attr('href', data.linkToRepository).css('display', 'block');
        // }

        // if (data.linkToPanel) {
        //     $('#panelLink').attr('href', data.linkToPanel).css('display', 'block');
        // }

        // if (data.linkToBot) {
        //     $('#botLink').attr('href', data.linkToBot).css('display', 'block');
        // }
    });
}]);