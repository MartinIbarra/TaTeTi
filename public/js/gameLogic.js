'use strict';
var playerHTMLTemplate = '<li class="list-group-item"><button type="button" class="btn btn-default badge" style="color:black">Play!</button></li>';
var lobbyElement = $('#lobby');
var boardElement = $('#board');
var waiting = $('#waiting');
var socket = io('http://localhost:8080');
var playing = false;
var gameID;
var playerListElement = $('.list-group');
var boardButtons = boardElement.find('button');
var playerID;
var playerType;

//cuando el usuario se conecta guardamos su id en playerID
socket.on('connect', function(data) {
    playerID = socket.io.engine.id;
    console.log('Connected to the server. Player ID: ' + playerID);
});

//usuario desconectado
socket.on('userDisconnected', function(data) {
    console.log('se desconecto el usuario ' + data.user);
    $('li').each(function(index, elem) {
        if ($('li').html(elem) === data.user) {
            $('li').remove();
        }
    });
});

//mostramos al jugador que recien entro en el lobby
socket.on('playerReady', function(data) {
    console.log('esto se envio con playerReady: ' + data.players);
    data.players.forEach(function(elem) {
        if (elem !== playerID) {
            playerListElement.append($(playerHTMLTemplate).html(elem));
        } else {
            //mostramos al jugador su numero de id (falta hacer!!!!)
        }
    });
});

//enviamos el mensaje en el chat
$('#msg').on('click', function() {
    socket.emit('chatMessage', $('#m').val());
    $('#m').val('');
    return false;
});

//una vez enviado el mjs, limpiamos la caja de texto
socket.on('chatMessage', function(data) {
    $('.chat').append($('<li>').text(data.player + ' dice: ' + data.msj));
});

//un usuario envio peticion para jugar
socket.on('gameRequest', function(data) {
    //si playng es true, emitimos 'playerIsBusy' y return
    if (playing) {
        socket.emit('playerIsBusy');
        return;
    }
    //si no esta jugando, emito 'gameRequestAccepted' {player: data.player}, seteo playng true, y muestro el tablero
    else {
        playing = true;
        // muestro ventana de aceptar o no 
        var saidYes = confirm('el jugador ' + data.player + ' desea jugar con vos\n' + 'aceptar?');
        if (saidYes) {
            boardElement.removeClass('hide');
            socket.emit('gameRequestAccepted', {
                player: data.player
            });

            lobbyElement.addClass('hide');
            waiting.addClass('hide');
        }
        //si no, emito 'gameRequestDenied' con {player: data.player}
        else {
            socket.emit('gameRequestDenied', {
                player: data.player
            });
        }
    }
});

//el usuario acepto la peticion
socket.on('gameRequestAccepted', function(data) {
    // hide waiting
    $(waiting).addClass('hide');
    // guardamos data.gameID para usarlo mas tarde
    gameID = data.gameID;
    playerType = data.playerType;
});

//empezo el juego
socket.on('gameStarted', function(data) {
    playerType = data.playerType;
    gameID = data.gameID;
    disableBoard();
});

//el usuario rechazo la peticion
socket.on('gameRequestDenied', function() {
    // hide board and show lobby
    boardElement.addClass('hide');
    lobbyElement.removeClass('hide');
});

//un usuario gano
socket.on('gameWon', function(data) {
    // if playerID === data.winner I won, show winner popup
    if (playerID === data.winner) {
        alert('you win!');
        boardElement.addClass('hide');
        lobbyElement.removeClass('hide');
    }
    // otherwise I lost therefore show loser popup
    else {
        updateBoard(data.game);
        alert('you lost');
        boardElement.addClass('hide');
        lobbyElement.removeClass('hide');
    }
});

//el oponente ya hizo su movimiento
socket.on('move', function(data) {
    updateBoard(data.game);

    // it's your turn now, choose wisely
    enableBoard();
});

/////// UI events /////////
playerListElement.on('click', 'button', function() {
    console.log('Requesting to play with \'' + $(this)[0].nextSibling.data + '\'');
    // emit 'gameRequest' event with { player: $(this)[0].nextSibling.data }
    socket.emit('gameRequest', {
        player: $(this).nextSibling.data
    });
    // hide lobby and show board
    lobbyElement.addClass('hide');
    boardElement.removeClass('hide');
});

//hiciste un movimiento
boardButtons.on('click', function() {
    // emit 'move' event with { gameID: gameID, game: game }
    $(this).html(playerType);
    var game = getGame();
    socket.emit('move', {
        gameID: gameID,
        game: game
    });
    console.log({
        gameID: gameID,
        game: game
    });
    // not your turn anymore
    disableBoard();
});

//obtener el tablero
function getGame() {
    return {
        '0': [$('#0-0').html(), $('#0-1').html(), $('#0-2').html()],
        '1': [$('#1-0').html(), $('#1-1').html(), $('#1-2').html()],
        '2': [$('#2-0').html(), $('#2-1').html(), $('#2-2').html()]
    };
}

//refrescar el tablero
function updateBoard(game) {
    $('#0-0').html(game[0][0] || '-');
    $('#0-1').html(game[0][1] || '-');
    $('#0-2').html(game[0][2] || '-');
    $('#1-0').html(game[1][0] || '-');
    $('#1-1').html(game[1][1] || '-');
    $('#1-2').html(game[1][2] || '-');
    $('#2-0').html(game[2][0] || '-');
    $('#2-1').html(game[2][1] || '-');
    $('#2-2').html(game[2][2] || '-');
}

//activar tablero
function enableBoard() {
    boardButtons.removeAttr('disabled');
}

//desactivar tablero
function disableBoard() {
    boardButtons.attr('disabled', 'disabled');
}