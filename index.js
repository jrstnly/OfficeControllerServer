const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const display = require('./display');
const ledDriver = require('./led');

app.get('/', function(req, res){
	res.send('<h1>Office Controller Server</h1>');
});
http.listen(3000, function(){
	console.log('Listening on *:3000');
});

io.on('connection', function(clientSocket){
	console.log('a user connected');

	clientSocket.on('disconnect', function(){
		console.log('user disconnected');
	});
});

const calibrate = async () => {
	await display.calibrateTop();
	await display.calibrateBottom();
	console.log("Calibration complete");
};

const pwmDriver = ledDriver();

//calibrate();
