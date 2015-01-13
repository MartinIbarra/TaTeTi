'use strict';
var http = require('http');
var serveStatic = require('serve-static');
var serve = serveStatic('public');
var server = http.createServer(function(req, res) {
    serve(req, res, function() {
        res.end();
    });
});
var io = require('socket.io')(server);
var PORT = 8080;
var players = {}; // this represents a dictionary, each player id is a key of the object players
var games = {}; // this represents a dictionary, each game id is a key of the object games

server.listen(PORT, function() {
    console.log('Server is now listening at port: ' + PORT);
});

//cuando un usuario se conecta
io.on('connection', function(socket) {
    // add the player to the list of players
    players[socket.id] = socket;
    var idPlayers = Object.keys(players);

    console.log('esta es la lista de idPlayers: ' + idPlayers); //muestro los jugadores, incluyendome

    //enviamos la lista de usuarios, incluyendome

    io.emit('playerReady', {
        players: idPlayers
    });

    var gameRequested = false;
    var gameid;
    socket.game = {
        '0': [null, null, null],
        '1': [null, null, null],
        '2': [null, null, null],
        turn: null
    };

    console.log('New player connected. Player id: ' + socket.id);

    socket.on('chatMessage', function(msg) {
        io.emit('chatMessage', {
            msj: msg,
            player: socket.id
        });
    });

    socket.on('gameRequest', function(data) {
        // emit 'gameRequest' event to data.player with { player: socket.id }
        console.log(data.player);
        players[data.player].emit('gameRequest', {
            player: socket.id
        });
        // set gameRequested to true
        gameRequested = true;
    });

    socket.on('playerIsBusy', function() {
        // set gameRequested to false
        gameRequested = false;
    });

    socket.on('gameRequestAccepted', function(data) {
        //console.log(data);

        // the game can begin now, each player should have the board empty
        // and each one should have a gameid

        // generate a gameid and save it for later use
        gameid = data.player + socket.id;

        // emit 'gameRequestAccepted' to data.player with { game: game, gameid: gameid, playerType: 'O' }
        players[data.player].emit('gameRequestAccepted', {
            game: socket.game,
            gameid: gameid,
            playerType: 'O'
        });
        // emit 'gameStarted' to socket with { game: game, gameid: gameid, playerType: 'X' }
        socket.emit('gameStarted', {
            game: socket.game,
            gameID: gameid,
            playerType: 'X'
        });
        // set the opponent
        socket.opponent = players[data.player];

        //console.log(socket.opponent);

        // set the socket opponent's opponent
        socket.opponent.opponent = socket;

        // the one who receives the invitation starts
        socket.game.turn = socket.id;
        socket.playerType = 'X';
        socket.opponent.playerType = 'O';

        // copy the reference to my opponent's game
        socket.opponent.game = socket.game;
    });

    socket.on('gameRequestDenied', function(data) {
        // emit 'gameRequestDenied' to data.player with {}
        // it's time to move on...
        players[data.player].emit('gameRequestDenied', {});
    });

    socket.on('move', function(data) {
        //validate it's his turn
        if (socket.game.turn === socket.opponent) {
            // return because it's not your turn
            return;
        }

        // check if it's not cheating

        //console.log(data);
        if (isWinner(data.game, socket.playerType)) {
            // emit 'gameWon' to socket and to socket.opponent with { game: data.game , winner: socket.id }
            socket.emit('gameWon', {
                game: data.game,
                winner: socket.id
            });

            socket.opponent.emit('gameWon', {
                game: data.game
            });

            console.log('Player ' + socket.id + ' won against ' + socket.opponent.id);
        } else {
            // emit 'move' event to opponent with { game: data.game }
            socket.opponent.emit('move', {
                game: data.game
            });

            socket.game.turn = socket.opponent.id;
            console.log(data.game);
        }
    });

    socket.on('disconnect', function() {
        console.log(socket.id + ' disconnected.');
        var userD = socket.id;
        io.emit('userDisconnected', { //avisamos que un jugador se desconecto
            user: userD
        });
        delete players[userD]; //borramos el jugador de la lista
        console.log('esto se emitio cuando el usuario: ' + userD + ' se desconecto');
        console.log('test del array idPlayers: ' + idPlayers);
    });
});

//logica del tablero
function isWinner(game, player) {
    // P P P
    // - - - 
    // - - -
    if (game[0][0] === game[0][1] && game[0][1] === game[0][2]) {
        return game[0][0] === player;
    }

    // - - -
    // P P P
    // - - -
    if (game[1][0] === game[1][1] && game[1][1] === game[1][2]) {
        return game[1][1] === player;
    }

    // - - -
    // - - -
    // P P P
    if (game[2][0] === game[2][1] && game[2][1] === game[2][2]) {
        return game[2][2] === player;
    }

    // P - -
    // P - -
    // P - -
    if (game[0][0] === game[1][0] && game[1][0] === game[2][0]) {
        return game[0][0] === player;
    }

    // - P -
    // - P -
    // - P -
    if (game[0][1] === game[1][1] && game[1][1] === game[2][1]) {
        return game[0][1] === player;
    }
    // - - P
    // - - P
    // - - P
    if (game[0][2] === game[1][2] && game[1][2] === game[2][2]) {
        return game[0][2] === player;
    }

    // P - -
    // - P -
    // - - P
    if (game[0][0] === game[1][1] && game[1][1] === game[2][2]) {
        return game[0][0] === player;
    }

    // - - P
    // - P -
    // P - -
    if (game[0][2] === game[1][1] && game[1][1] === game[2][0]) {
        return game[0][2] === player;
    }

    //no winner
    return false;
}