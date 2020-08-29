const gpio = require('pigpio').Gpio;
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const MICROSECDONDS_PER_CM = 1e6/34321;

var displayMaxHeight = 0;
var displayMinHeight = 0;
var displayHeight = 0;
var displayHeightInterval;

const displayUpGpio = new gpio(20, {mode: gpio.OUTPUT});
const displayDownGpio = new gpio(21, {mode: gpio.OUTPUT});
const displaySensorTrigger = new gpio(22, {mode: gpio.OUTPUT});
const displaySensorEcho = new gpio(23, {mode: gpio.INPUT, alert: true});

const initDisplayControl = () => {
	displayUpGpio.digitalWrite(0);
	displayDownGpio.digitalWrite(0);
	displaySensorTrigger.digitalWrite(0);

	let startTick;
	displaySensorEcho.on('alert', (level, tick) => {
		if (level == 1) {
			startTick = tick;
		} else {
			const endTick = tick;
			const diff = (endTick >> 0) - (startTick >> 0); // Unsigned 32 bit arithmetic
			const distanceInCM = Math.floor(parseFloat(diff / 2 / MICROSECDONDS_PER_CM));
			if (Math.abs(distanceInCM - displayHeight) < 10 || displayHeight === 0) displayHeight = distanceInCM;
			console.log(displayHeight);
		}
	});
};
const startMeasuringDisplayHeight = () => {
	displaySensorTrigger.trigger(10, 1); // Set trigger high for 10 microseconds
	displayHeightInterval = setInterval(() => {
		displaySensorTrigger.trigger(10, 1); // Set trigger high for 10 microseconds
	}, 750);
};
const stopMeasuringDisplayHeight = () => {
	clearInterval(displayHeightInterval);
};

const displayStop = () => {
	displayUpGpio.digitalWrite(0);
	displayDownGpio.digitalWrite(0);
	stopMeasuringDisplayHeight();
};
const displayMove = (direction) => {
	startMeasuringDisplayHeight();
	if (direction === 'up') {
		displayUpGpio.digitalWrite(1);
		displayDownGpio.digitalWrite(0);
	}
	if (direction === 'down') {
		displayUpGpio.digitalWrite(0);
		displayDownGpio.digitalWrite(1);
	}
};

const calibrateDisplayTop = () => {
	return new Promise((resolve) => {
		let limit = 0;
		let limitCount = 0;
		displayMove('up');
		let counter = setInterval(() => {
			if (limit === displayHeight) {
				if (limitCount >= 4) {
					console.log("Top limit reached");
					displayMaxHeight = displayHeight - 2;
					clearInterval(counter);
					displayStop();
					resolve();
				} else {
					limitCount++;
				}
			} else {
				limit = displayHeight;
				limitCount = 0;
			}
		}, 500);
	});
};
const calibrateDisplayBottom = () => {
	return new Promise((resolve) => {
		let limit = 0;
		let limitCount = 0;
		displayMove('down');
		let counter = setInterval(() => {
			if (limit === displayHeight) {
				if (limitCount >= 4) {
					console.log("Bottom limit reached");
					displayMinHeight = displayHeight + 2;
					clearInterval(counter);
					displayStop();
					resolve();
				} else {
					limitCount++;
				}
			} else {
				limit = displayHeight;
				limitCount = 0;
			}
		}, 500);
	});
};

const calibrate = async () => {
	await calibrateDisplayTop();
	await calibrateDisplayBottom();
	console.log("Calibration complete");
};

initDisplayControl();
calibrate();
