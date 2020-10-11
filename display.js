const { Accelerometer, Board } = require("johnny-five");
const gpio = require('pigpio').Gpio;
const i2cBus = require('i2c-bus');
const Pca9685Driver = require("pca9685").Pca9685Driver;
const Raspi = require('raspi-io').RaspiIO;
const board = new Board({
	io: new Raspi()
});

const MICROSECDONDS_PER_CM = 1e6/34321;

const displayUpGpio = new gpio(20, {mode: gpio.OUTPUT});
const displayDownGpio = new gpio(21, {mode: gpio.OUTPUT});
const displaySensorTrigger = new gpio(22, {mode: gpio.OUTPUT});
const displaySensorEcho = new gpio(23, {mode: gpio.INPUT, alert: true});

class DisplayController {
	displayMaxHeight = 0;
	displayMinHeight = 0;
	displayHeight = 0;
	displayHeightInterval;
	accelerometer;
	pwm = null;
	options = { i2c: i2cBus.openSync(1), address: 0x40, frequency: 800, debug: false };

	constructor() {
		return new Promise((resolve) => {
			displayUpGpio.digitalWrite(0);
			displayDownGpio.digitalWrite(0);
			displaySensorTrigger.digitalWrite(0);

			board.on('ready', async () => {
				await new Promise((resolve) => {
					this.pwm = new Pca9685Driver(this.options, (err) => {
						if (err) {
							console.error("Error initializing PCA9685");
							process.exit(-1);
						}
						console.log("Initialization done");
						resolve();
					});
				});
/*
				this.accelerometer = new Accelerometer({controller: "LIS3DH", range: 16});
				let oldX = 100;
				let oldY = 100;
				let oldZ = 100;
				this.accelerometer.on("change", () => {
					const {acceleration, inclination, orientation, pitch, roll, x, y, z} = this.accelerometer;

					if (Math.abs(x - oldX) >= 0.2 || Math.abs(y - oldY) >= 0.2 || Math.abs(z - oldZ) >= 0.2) {
						console.log("Accelerometer:");
						console.log("  x            : ", x);
						console.log("  y            : ", y);
						console.log("  z            : ", z);
						console.log("--------------------------------------");

						oldX = x;
						oldY = y;
						oldZ = z;
					}

				});
*/
				resolve(this);
			});

			let startTick;
			displaySensorEcho.on('alert', (level, tick) => {
				if (level == 1) {
					startTick = tick;
				} else {
					const endTick = tick;
					const diff = (endTick >> 0) - (startTick >> 0); // Unsigned 32 bit arithmetic
					const distanceInCM = Math.floor(parseFloat(diff / 2 / MICROSECDONDS_PER_CM));
					if (Math.abs(distanceInCM - this.displayHeight) < 10 || this.displayHeight === 0) this.displayHeight = distanceInCM;
					console.log(this.displayHeight);
				}
			});
		});
	}

	stop() {
		displayUpGpio.digitalWrite(0);
		displayDownGpio.digitalWrite(0);
		this.stopMeasuringHeight();
	};
	move(direction) {
		this.startMeasuringHeight();
		if (direction === 'up') {
			displayUpGpio.digitalWrite(1);
			displayDownGpio.digitalWrite(0);
		}
		if (direction === 'down') {
			displayUpGpio.digitalWrite(0);
			displayDownGpio.digitalWrite(1);
		}
	};
	tilt(direction) {
		if (direction === 'up') {
			this.pwm.setPulseRange(13, 0, 0, (err) => {
					if (err) console.error("Error setting pulse range.");
			});
			this.pwm.setPulseRange(12, 0, 4095, (err) => {
					if (err) console.error("Error setting pulse range.");
			});
		}
		if (direction === 'down') {
			this.pwm.setPulseRange(12, 0, 0, (err) => {
					if (err) console.error("Error setting pulse range.");
			});
			this.pwm.setPulseRange(13, 0, 4095, (err) => {
					if (err) console.error("Error setting pulse range.");
			});
		}
		if (direction === 'stop') {
			this.pwm.setPulseRange(12, 0, 0, (err) => {
					if (err) console.error("Error setting pulse range.");
			});
			this.pwm.setPulseRange(13, 0, 0, (err) => {
					if (err) console.error("Error setting pulse range.");
			});
		}
	};

	calibrateTop() {
		return new Promise((resolve) => {
			let limit = 0;
			let limitCount = 0;
			this.move('up');
			let counter = setInterval(() => {
				if (limit === this.displayHeight) {
					if (limitCount >= 4) {
						console.log("Top limit reached");
						this.displayMaxHeight = this.displayHeight - 2;
						clearInterval(counter);
						this.stop();
						resolve();
					} else {
						limitCount++;
					}
				} else {
					limit = this.displayHeight;
					limitCount = 0;
				}
			}, 500);
		});
	};
	calibrateBottom() {
		return new Promise((resolve) => {
			let limit = 0;
			let limitCount = 0;
			this.move('down');
			let counter = setInterval(() => {
				if (limit === this.displayHeight) {
					if (limitCount >= 4) {
						console.log("Bottom limit reached");
						this.displayMinHeight = this.displayHeight + 2;
						clearInterval(counter);
						this.stop();
						resolve();
					} else {
						limitCount++;
					}
				} else {
					limit = this.displayHeight;
					limitCount = 0;
				}
			}, 500);
		});
	};

	startMeasuringHeight() {
		displaySensorTrigger.trigger(10, 1); // Set trigger high for 10 microseconds
		this.displayHeightInterval = setInterval(() => {
			displaySensorTrigger.trigger(10, 1); // Set trigger high for 10 microseconds
		}, 750);
	};
	stopMeasuringHeight() {
		clearInterval(this.displayHeightInterval);
	};
}

module.exports = DisplayController;
