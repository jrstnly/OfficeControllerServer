const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const display = require('./display');
const LedDriver = require('./led');

(async () => {
	const settings = {
		led: [
			{red: 0, green: 0, blue: 0},
			{red: 0, green: 0, blue: 0},
			{red: 0, green: 0, blue: 0},
			{red: 0, green: 0, blue: 0}
		]
	}
	const led = await new LedDriver;
	const updateLED = () => {
		settings.led.forEach((item, i) => {
			led.set(i, item.red, item.green, item.blue);
		});
	}

	app.get('/', function(req, res){
		res.send('<h1>Office Controller Server</h1>');
	});
	http.listen(3000, function(){
		console.log('Listening on *:3000');
	});

	io.on('connection', function(socket){
		console.log('a user connected');
		socket.emit('update', settings);

		socket.on('control led', (data) => {
			settings.led[data.channel] = data.color;
			socket.broadcast.emit('update', settings);
			updateLED();
		})

		socket.on('disconnect', () => {
			console.log('user disconnected');
		});
	});

	const calibrate = async () => {
		await display.calibrateTop();
		await display.calibrateBottom();
		console.log("Calibration complete");
	};

	//calibrate();
})();
