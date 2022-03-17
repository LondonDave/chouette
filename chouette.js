var express = require('express');
var SSE = require('express-sse');
var path = require('path');

var app = express();
var sse = new SSE();

app.use('/scripts', express.static("scripts"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/chouette.html'));
})

app.get('/stream',sse.init)

var server = app.listen(8081, function () {
    var port = server.address().port;
    console.log("Bot console listening at http://127.0.0.1:%s", port);
})

sendGame = function(game){
    sse.updateInit([game]);
    sse.send(game);
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function compare(a, b) {
    if (a>b) return -1;
    if (a<b) return 1;
    return 0;
}

// board: [0,-2,0,0,0,0,5,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2,0],
// board: [0,-1,-1,-1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0],

initgame = {
    board: [0,-2,0,0,0,0,5,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2,0],
    turn: "",
    dice: null,
    lowDiceFirst: 0,
    clicks: [],
}

startgame = initgame;
currentgame = initgame;
sendGame(currentgame);

app.post('/roll',function (req, res) {
    if (currentgame.turn == "") {

        if (getRandomInt(2)) startgame.turn = 'box';
        else  startgame.turn = 'captain';
        startgame.dice = [0,0];
        while (startgame.dice[0] == startgame.dice[1]){
            startgame.dice[0] = getRandomInt(6) + 1;
            startgame.dice[1] = getRandomInt(6) + 1;
        }
        startgame.dice.sort(compare);
        currentgame = JSON.parse(JSON.stringify(startgame));       
    }
    else {
        startgame.dice = [0,0];
        startgame.dice[0] = getRandomInt(6) + 1;
        startgame.dice[1] = getRandomInt(6) + 1;
        startgame.dice.sort(compare);
        currentgame = JSON.parse(JSON.stringify(startgame));
    }
    sendGame(currentgame);    
    res.send('OK');
});

app.post('/pickup',function (req, res) {

    if (req.body.view == startgame.turn){
        startgame = currentgame;
        startgame.dice = null;
        startgame.lowDiceFirst = 0;
        startgame.clicks = [];
        if (startgame.turn == "box") startgame.turn = "captain"; 
        else if (startgame.turn == "captain") startgame.turn = "box"; 
        currentgame = JSON.parse(JSON.stringify(startgame));
    }

    sendGame(currentgame);
    res.send('OK');
});

app.post('/reset',function (req, res) {
    console.log('reset');
    currentgame = JSON.parse(JSON.stringify(startgame));
    sendGame(currentgame);
    res.send('OK');
});

app.post('/move',function (req, res) {
    var board;
    if (currentgame.turn == "box") {
        board = currentgame.board.slice();
        board = board.reverse().map(x => -x);   
    }
    else if (currentgame.turn == "captain") {
        board = currentgame.board.slice();        
    }

    console.log(JSON.stringify(board));
    console.log(JSON.stringify(currentgame));
    console.log(req.body.view,req.body.pos,req.body.lowDiceFirst);

    var pos = parseInt(req.body.pos);
    var lowDiceFirst = parseInt(req.body.lowDiceFirst);

    maxmoves = currentgame.dice[0] == currentgame.dice[1] ? 4 : 2;

    var validplayer = (req.body.view == currentgame.turn) || ((req.body.view == 'crew') && (currentgame.turn == 'captain'));

    if (validplayer && board[pos] > 0 && currentgame.clicks.length < maxmoves){

        if (board[25] == 0 || pos == 25) { // if piece on bar move first
            var diceindex = 0;
            if (currentgame.dice[0] != currentgame.dice[1]){
                if (currentgame.clicks.length == 0){
                    diceindex = lowDiceFirst;
                }
                else {
                    if (currentgame.lowDiceFirst == 1) diceindex = 0;
                    else diceindex = 1;
                }
            }
            move = currentgame.dice[diceindex];
    
            if (pos > move) {
                if (board[pos - move] >= 0){
                    board[pos]--;
                    board[pos - move]++;
        
                    if (currentgame.clicks.length == 0 && lowDiceFirst) currentgame.lowDiceFirst = 1;
                    currentgame.clicks.push([pos, pos - move, false]);
                }
                else if (board[pos - move] == -1){
                    board[pos]--;
                    board[pos - move] = 1;
                    board[0]--;
        
                    if (currentgame.clicks.length == 0 && lowDiceFirst) currentgame.lowDiceFirst = 1;
                    currentgame.clicks.push([pos, pos - move, true]);
                } 
            }
            else if (pos <= move) {  // Bearing off
                if (pos == move && Math.max(...board.slice(7)) == 0) {
                    board[pos]--;
                    if (currentgame.clicks.length == 0 && lowDiceFirst) currentgame.lowDiceFirst = 1;
                    currentgame.clicks.push([pos, 0, false]);
                }
                else if (pos < move && Math.max(...board.slice(pos + 1)) == 0){
                    board[pos]--;
                    if (currentgame.clicks.length == 0 && lowDiceFirst) currentgame.lowDiceFirst = 1;
                    currentgame.clicks.push([pos, 0, false]);
                }
            }
    
            if (currentgame.turn == "box") {
                board = board.reverse().map(x => -x); 
                currentgame.board = board;   
            }
            else if (currentgame.turn == "captain") {
                currentgame.board = board;       
            }
    
            console.log(currentgame);
        } 
    }

    sendGame(currentgame);
    res.send('OK');
})  




