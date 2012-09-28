var socket;
$(function() {
  socket = io.connect('http://localhost');
  //TODO: show loader.gif until connection received
  socket.on('connectionSuccess', function () {
    //TODO: hide loader.gif
    
    //prompt for username
    var userName = prompt("What's your name?");
    socket.emit('userLoggedIn', { 
      userName: userName,
      socketId: socket.socket.sessionid
    });

    var userId;
    socket.on('newUserCreated', function(userData) {
      userId = userData.userId;
      //display "Create Game" button
      
      $("#app").html('<button id="btnCreate">Create Game</button>');
      $("#btnCreate").click(function() {
        var opponent = prompt("Enter opponent's username:");

        socket.emit('newGameRequest', {
          socketId: socket.socket.sessionid,
          opponent: opponent
        });
      });
      
      //no need to list games bc it's a new user
    });

    socket.on('gamesFetched', function(gamesData) {
      userId = gamesData.userId;
      //alert("Games fetched for: " + gamesData.userName);
      //display "Create Game" button
      
      $("#app").html('<button id="btnCreate">Create Game</button>');
      $("#btnCreate").click(function() {
        var opponent = prompt("Enter opponent's username:");

        socket.emit('newGameRequest', {
          socketId: socket.socket.sessionid,
          opponent: opponent
        });
      });
      
      //TODO: display retrieved game list
      
    });

    socket.on('challengerChecked', function(challengerData) {
      if (challengerData.exists) {
        //perform turn and send first turn data with "newGameCreated"
        $("#countdown").html('<a href="">Play Turn</a>');
        madworld.kyc.init(userId, challengerData.opponentId);
      } else {
        alert('no such user exists');
      }
    });

    socket.on('newGameOffered', function(gameData) {
      alert('new game offer from: ' + gameData.challengerName);
    });

    socket.on('yourTurn', function(gameData) {
      alert('your turn');
    });
  });

  // var board = new Board();
  // var boardView = new BoardView({
  //   model: board
  // });
  // boardView.render();
  // $("#app").html(boardView.el);
});