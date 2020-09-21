const i2cBus = require('i2c-bus');
const Pca9685Driver = require("pca9685").Pca9685Driver;

var options = {
    i2c: i2cBus.openSync(1),
    address: 0x40,
    frequency: 50,
    debug: false
};

const ledDriver = () => {
	const init = async () => {
		pwm = new Pca9685Driver(options, function(err) {
			if (err) {
				console.error("Error initializing PCA9685");
				process.exit(-1);
			}
			console.log("Initialization done");

			// Set channel 0 to turn on on step 42 and off on step 255
			// (with optional callback)
			pwm.setPulseRange(0, 42, 255, function() {
				if (err) {
					console.error("Error setting pulse range.");
				} else {
					console.log("Pulse range set.");
				}
			});
		});
	}
}

module.exports = ledDriver
