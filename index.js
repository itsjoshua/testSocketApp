var app = require('express')();
var http = require('http').createServer(app);
const redisAdapter = require('socket.io-redis');
var io = require('socket.io')(http);
io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', socket => {
    console.log('user connected');
    var roomName;
    var teamPlayers = [];
    socket.on('chat message', (msg) => {
        console.log('message: ' + msg);
        io.emit('ServerChat message', msg);
    });

    socket.on('gameName', (room) => {
        roomName = room;
        console.log('joining room: ' + room);
        socket.join(roomName);
        io.in(roomName).clients((err, clients) => {
            if(clients.length == 5) {
                console.log('Player capacity reached');
                io.of('/').adapter.remoteLeave(clients[4], roomName, (err) => {
                    if(err) {
                        /* handle error*/
                    }
                    console.log('no. of players : ' + clients.length);
                    return;
                });
                return;
            }else if(clients.length == 4) {
                console.log('we have four players');
                io.to(clients[0]).emit('readyToStart', "ready to start");
                return;
            }
            console.log('no. of players: ' + clients.length);
            console.log('joined room ' + roomName);
        });
        
    });

    socket.on('startGame', (msg) => {
        io.in(roomName).clients((err, clients) => {
            if(clients.length < 4) {
                console.log('cannot begin without 4 players');
                return;
            }

            for(var i=0; i<clients.length; i++) {
                io.to(clients[i % clients.length]).emit('nextPlayer', clients[(i + 1) % clients.length]);
            }
            io.to(clients[0]).emit('publishBidEnable', "ready to start");
            
        });
        
    });

    socket.on('finishBid', (temp) => {
        console.log('recd ' + roomName + '_finshBid');
        console.log('id is : ' + socket.id);
        io.in(roomName).clients((err, clients) => {
            console.log(clients);
        });
        io.in(roomName).emit('bid complete', "the bid has been completed");
    });

    socket.on('publishBid', (bidMessage) => {
        console.log('bid published : ' + bidMessage);
        var bidArray = bidMessage.split('==_==*==@==');
        io.in(roomName).emit('bidPublished', bidArray[1]);
        io.in(roomName).emit('disableAll', 'disable');
        io.to(bidArray[0]).emit('publishBidEnable', 'enable button');
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
      });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});