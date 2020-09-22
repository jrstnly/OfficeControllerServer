const i2cBus = require('i2c-bus');
const Pca9685Driver = require("pca9685").Pca9685Driver;

const ledDriver = () => {
	const options = { i2c: i2cBus.openSync(1), address: 0x40, frequency: 500, debug: true };

	const init = async () => {
		new Promise((resolve) => {
			const pwm = new Pca9685Driver(options, (err) => {
				if (err) {
					console.error("Error initializing PCA9685");
					process.exit(-1);
				}
				console.log("Initialization done");
				resolve();
			});
		}).then(() => {
			pwm.setPulseRange(0, 0, 4095, (err) => {
				if (err) {
					console.error("Error setting pulse range.");
				} else {
					console.log("Pulse range set.");
				}
			});
		});
	}

	init();
}

module.exports = ledDriver
