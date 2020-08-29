const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const display = require('./display')

const calibrate = async () => {
	await display.calibrateTop();
	await display.calibrateBottom();
	console.log("Calibration complete");
};

calibrate();
