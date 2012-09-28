/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    io = require('socket.io'),
    mongoose = require('mongoose'),
    db = mongoose.createConnection('localhost', 'test');


var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 1337);
  app.set('views', __dirname + '/views');
  app.engine('.html', require('ejs').renderFile);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

// setup database
db.on('error', console.error.bind(console, 'connection error:'));

var userSchema, User, gameSchema, Game, turnSchema, Turn;
db.once('open', function () {
  console.log('mongoose connection open!');

  userSchema = new mongoose.Schema({
    userName: String,
    currentSocketId: String
  });
  User = db.model('User', userSchema);

  gameSchema = new mongoose.Schema({
    startDate: { type: Date },
    lastTurnDate: { type: Date },
    accepted: Boolean,
    challengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'userSchema' },
    opponentId: { type: mongoose.Schema.Types.ObjectId, ref: 'userSchema' }
  });
  Game = db.model('Game', gameSchema);

  turnSchema = new mongoose.Schema({
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'gameSchema' },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'userSchema' },
    results: [],
    startDate: { type: Date }
  });
  Turn = db.model('Turn', turnSchema);
});


//setup sockets
var sio = io.listen(server);
sio.set('log level', 0);

sio.sockets.on('connection', function (socket) {
  socket.emit('connectionSuccess');

  socket.on('userLoggedIn', function (userData) {
    //check db for any games already stored for this user
    User.find({ userName: userData.userName }, function (err, userMatches) {
      if (err) {
        console.log(err); //handle the error
      } else {
        if (userMatches.length > 0) {
          //
          User.find({
            currentSocketId: socket.id
          }, function(err, matches) {
            if (matches.length > 0) {
              var matched = matches[0];
              matched.currentSocketId = null;
              matched.save(function(err) {
                if (err) console.log(err); //handle the error
              });
            }
          });

          //user already exists -> grab game list and emit action
          var matchedUser = userMatches[0];
          matchedUser.currentSocketId = socket.id;
          matchedUser.save(function (err) {
            if (err) console.log(err); //handle the error
          });

          Game.find({ challengerId: matchedUser._id }, function(err, gameMatches) {
            if (err) {
              console.log(err); //handle the error
            } else {
                socket.emit('gamesFetched', {
                  userId: matchedUser._id,
                  userName: userData.userName,
                  games: gameMatches });
            }
          });
        } else {
          //user doesn't exist yet -> create new user
          var currentUser = new User({ 
            userName: userData.userName,
            currentSocketId: userData.socketId
          });
          currentUser.save(function (err) {
            if (err) console.log(err); //handle the error
          });

          socket.emit('newUserCreated', {
            userId: currentUser._id
          });
        }
      }
    });
  });

  socket.on('newGameRequest', function(gameData) {
    //check for existence of challenge username
    User.find({ userName: gameData.opponent }, function(err, userMatches) {
      if (err) {
        console.log(err); //handle the error
      } else {
        if (userMatches.length > 0) {
          socket.emit('challengerChecked', {
            exists: true,
            opponentId: userMatches[0]._id
          });
        } else {
          socket.emit('challengerChecked', {
            exists: false,
            opponentId: null
          });
        }
      }
    });
  });

  socket.on('finishedTurn', function(gameData) {
    //check if a game exists yet for these two
    Game.find({
      challengerId: gameData.challengerId,
      opponentId: gameData.opponentId
    }, function(err, gameMatches) {
      if (gameMatches.length > 0) {
        //game already exists, so add turn to db and notify other player
        var matchedGame = gameMatches[0];

        var newTurn = new Turn({
          gameId: newGame._id,
          playerId: gameData.challengerId,
          results: gameData.results,
          startDate: new Date()
        });
        newTurn.save(function (err) {
          if (err) console.log(err); //handle the error
        });

        User.find({
          _id: gameData.opponentId
        }, function(err, userMatches) {
          if (userMatches.length > 0) {
            var matchedUser = userMatches[0];
            sio.sockets.socket(matchedUser.currentSocketId).emit('yourTurn', {
              gameId: newGame._id
            });
          }
        });
      } else {
        //new game needs to be created with this as the first turn, and other player needs notification
        var newGame = new Game({ 
          startDate: new Date(),
          lastTurnDate: new Date(),
          accepted: false,
          challengerId: gameData.challengerId,
          opponentId: gameData.opponentId
        });
        newGame.save(function (err) {
          if (err) console.log(err); //handle the error
        });

        var newTurn = new Turn({
          gameId: newGame._id,
          playerId: gameData.challengerId,
          results: gameData.results,
          startDate: new Date()
        });
        newTurn.save(function (err) {
          if (err) console.log(err); //handle the error
        });

        User.find({
          _id: gameData.opponentId
        }, function(err, userMatches) {
          if (userMatches.length > 0) {
            var challengerUserName;
            User.find({
              _id: gameData.challengerId
            }, function(err, matches) {
              challengerUserName = matches[0].userName;
            });

            var matchedUser = userMatches[0];
            sio.sockets.socket(matchedUser.currentSocketId).emit('newGameOffered', {
              gameId: newGame._id,
              challengerName: challengerUserName
            });
          }
        });
      }
    });
  });

  socket.on('disconnect', function() {
    User.find({
      currentSocketId: socket.id
    }, function(err, userMatches) {
      if (userMatches.length > 0) {
        var matchedUser = userMatches[0];
        matchedUser.currentSocketId = null;
        matchedUser.save(function(err) {
          if (err) console.log(err); //handle the error
        });
      }
    });
  });
});