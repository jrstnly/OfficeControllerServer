const gpio = require('pigpio').Gpio;

const MICROSECDONDS_PER_CM = 1e6/34321;
let common = {}

const displayUpGpio = new gpio(20, {mode: gpio.OUTPUT});
const displayDownGpio = new gpio(21, {mode: gpio.OUTPUT});
const displaySensorTrigger = new gpio(22, {mode: gpio.OUTPUT});
const displaySensorEcho = new gpio(23, {mode: gpio.INPUT, alert: true});

let displayMaxHeight = 0;
let displayMinHeight = 0;
let displayHeight = 0;
let displayHeightInterval;

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
const startMeasuringHeight = () => {
	displaySensorTrigger.trigger(10, 1); // Set trigger high for 10 microseconds
	displayHeightInterval = setInterval(() => {
		displaySensorTrigger.trigger(10, 1); // Set trigger high for 10 microseconds
	}, 750);
};
const stopMeasuringHeight = () => {
	clearInterval(displayHeightInterval);
};

common.stop = () => {
	displayUpGpio.digitalWrite(0);
	displayDownGpio.digitalWrite(0);
	stopMeasuringHeight();
};
common.move = (direction) => {
	startMeasuringHeight();
	if (direction === 'up') {
		displayUpGpio.digitalWrite(1);
		displayDownGpio.digitalWrite(0);
	}
	if (direction === 'down') {
		displayUpGpio.digitalWrite(0);
		displayDownGpio.digitalWrite(1);
	}
};

common.calibrateTop = () => {
	return new Promise((resolve) => {
		let limit = 0;
		let limitCount = 0;
		common.move('up');
		let counter = setInterval(() => {
			if (limit === displayHeight) {
				if (limitCount >= 4) {
					console.log("Top limit reached");
					displayMaxHeight = displayHeight - 2;
					clearInterval(counter);
					common.stop();
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
common.calibrateBottom = () => {
	return new Promise((resolve) => {
		let limit = 0;
		let limitCount = 0;
		common.move('down');
		let counter = setInterval(() => {
			if (limit === displayHeight) {
				if (limitCount >= 4) {
					console.log("Bottom limit reached");
					displayMinHeight = displayHeight + 2;
					clearInterval(counter);
					common.stop();
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

initDisplayControl();

module.exports = common;
