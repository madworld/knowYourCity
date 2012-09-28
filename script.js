var madworld = {};
$(function() {
    madworld.kyc = {
        map: null,
        currentPOIIndex: 0,
        time: 10, //Countdown time in seconds
        gameOn: false,
        userAnswers: [],
        mapOptions: {
            center: new google.maps.LatLng(33.745211,-84.390965),
            zoom: 13,
            scrollwheel: false,
            navigationControl: false,
            mapTypeControl: false,
            scaleControl: false,
            zoomControl: false,
            streetViewControl: false,
            disableDoubleClickZoom: true,
            draggable: false,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        },
        init: function(){
            this.buildMap();
            this.setupCountdown();
            this.setupPOIClick();
        },
        buildMap: function(){
            this.map = new google.maps.Map(document.getElementById("map_canvas"), this.mapOptions);
        },
        getNextPOI: function(){
            var self = this;
            try{
                $('#poi').text(atlanta.poi[this.currentPOIIndex++].name);
            }catch(err){
                self.gameOver();
            }
        },
        setupPOIClick: function(){
            var self = this;
            google.maps.event.addListener(self.map, 'click', function(event) {
                if(self.gameOn){
                    self.poiPlace(event);
                }
            });
        },
        poiPlace: function (event) {
            this.userAnswers.push({index:this.currentPOIIndex -1, answer: event.latLng});
            console.log(this.userAnswers);
            this.getNextPOI();
        },
        setupCountdown: function(){
            var self = this;

            $('#countdown a').click(function(e){
                e.preventDefault();
                self.startGame();
            });
        },
        startGame: function(){
            //Setup the timer
            $('#countdown').countdown({until: this.time, format:'S', onExpiry: this.gameOver});
            var t = new Date();
            t.setSeconds(t.getSeconds() + this.time);
            $('#countdown').countdown('option',{until: t});

            //Put the first POI up
            this.getNextPOI();
            this.gameOn = true;
        },
        gameOver: function(){
            $('#poi').text('game over');
            $('#countdown').countdown('pause');
            this.gameOn = false;
            this.showResults();
        },
        showResults: function() {
            var self,userAnswer,realAnswer,distance;
            self = this;
            console.log('RESULTS');
            for (var i = 0; i < self.userAnswers.length; i++) {
                userAnswer = self.userAnswers[i].answer;
                realAnswer = new google.maps.LatLng(atlanta.poi[i].lat,atlanta.poi[i].long);
                console.log(atlanta.poi[i].name);
                distance =  google.maps.geometry.spherical.computeDistanceBetween(userAnswer,realAnswer);
                console.log(distance);

                // console.log(self.userAnswers[i].answer);
            };
        }
    }
    madworld.kyc.init();
});