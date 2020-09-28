const i2cBus = require('i2c-bus');
const Pca9685Driver = require("pca9685").Pca9685Driver;

class LedDriver {
	pwm = null;
	options = { i2c: i2cBus.openSync(1), address: 0x40, frequency: 800, debug: false };

	constructor() {
		return new Promise((resolve) => {
			this.pwm = new Pca9685Driver(this.options, (err) => {
				if (err) {
					console.error("Error initializing PCA9685");
					process.exit(-1);
				}
				console.log("Initialization done");
				resolve(this);
			});
		});
	}

	set(channel, red, green, blue) {
		const start = channel * 3;
		const redVal = parseInt(((red / 100) * 4095).toFixed(0));
		const greenVal = parseInt(((green / 100) * 4095).toFixed(0));
		const blueVal = parseInt(((blue / 100) * 4095).toFixed(0));

		this.pwm.setPulseRange(start, 0, redVal, (err) => {
				if (err) console.error("Error setting pulse range.");
		});
		this.pwm.setPulseRange(start+1, 0, greenVal, (err) => {
				if (err) console.error("Error setting pulse range.");
		});
		this.pwm.setPulseRange(start+2, 0, blueVal, (err) => {
				if (err) console.error("Error setting pulse range.");
		});
	}
}

module.exports = LedDriver;
