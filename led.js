const i2c = require('i2c-bus');
const NanoTimer = require('nanotimer');

const makePwmDriver = (options) => {
	// Registers/etc.
	const MODE1 = 0x00
	const MODE2 = 0x01
	const SUBADR1 = 0x02
	const SUBADR2 = 0x03
	const SUBADR3 = 0x04
	const PRESCALE = 0xFE
	const LED0_ON_L = 0x06
	const LED0_ON_H = 0x07
	const LED0_OFF_L = 0x08
	const LED0_OFF_H = 0x09
	const ALL_LED_ON_L = 0xFA
	const ALL_LED_ON_H = 0xFB
	const ALL_LED_OFF_L = 0xFC
	const ALL_LED_OFF_H = 0xFD

	// Bits:
	const RESTART = 0x80
	const SLEEP = 0x10
	const ALLCALL = 0x01
	const INVRT = 0x10
	const OUTDRV = 0x04
	const SWRST = 0x06

	const defaults = {
		address: 0x40,
		device: 1,
		debug: true
	}
	const {address, device, debug} = Object.assign({}, defaults, options)
	let prescale

	const init = async () => {
		try {
			if (debug) {
				console.log(`Device:${device}, Address:${address}, Debug:${debug}`);
				console.log(`Resetting PCA9685, MODE1: ${MODE1}`);
			}
			//await setAllPWM(0, 0);
			const i2c1 = await i2c.openPromisified(1)
			await i2c1.i2cWrite(address, 1, Buffer.from([SWRST]));
			await i2c1.writeI2cBlock(address, MODE1, 1, Buffer.from([MODE1]));

			await i2c1.writeI2cBlock(address, MODE2, 1, Buffer.from([OUTDRV]));
			await i2c1.writeI2cBlock(address, MODE1, 1, Buffer.from([ALLCALL]));
			await usleep(5000);
			const rbuf = Buffer.alloc(1);
			await i2c1.readI2cBlock(address, MODE1, rbuf.length, rbuf)
			let mode1 = rbuf.toString('hex');
			mode1 = mode1 & ~SLEEP // wake up (reset sleep)
			await i2c1.writeI2cBlock(address, MODE1, 1, Buffer.from([mode1]));
			await usleep(5000);
			if (debug) console.log('Init complete');
			await i2c1.close();
		} catch (e) {
			console.error('Error in init', e);
		}

		await setAllPWM(4095, 4095);
	}

	const setPWMFreq = freq => {
		/*
		// "Sets the PWM frequency"
		let prescaleval = 25000000.0 // 25MHz
		prescaleval /= 4096.0 // 12-bit
		prescaleval /= freq
		prescaleval -= 1.0

		if (debug) {
			console.log(`Setting PWM frequency to ${freq} Hz`)
			console.log(`Estimated pre-scale: ${prescaleval}`)
		}
		prescale = Math.floor(prescaleval + 0.5)
		if (debug) {
			console.log(`Final pre-scale: ${prescale}`)
		}

		return new Promise((resolve) => {
			i2c.openPromisified(1).then((i2c1) => {
				const rbuf = Buffer.alloc(1);
				i2c1.readI2cBlock(address, MODE1, rbuf.length, rbuf)
				.then(_ => {
					const oldmode = data[0]
					let newmode = (oldmode & 0x7F) | 0x10 // sleep
					if (debug) {
						console.log(`prescale ${Math.floor(prescale)}, newMode: newmode.toString(16)`)
					}
					i2c1.writeI2cBlock(address, MODE1, 1, Buffer.from([newmode]))
					.then(_ => i2c1.writeI2cBlock(address, PRESCALE, 1, Buffer.from([prescale])))
					.then(_ => i2c1.writeI2cBlock(address, MODE1, 1, Buffer.from([oldmode])))
				})

				i2c1.writeI2cBlock(address, ALL_LED_ON_L, 1, Buffer.from([(on & 0xFF)]))
				.then(_ => i2c1.writeI2cBlock(address, ALL_LED_ON_H, 1, Buffer.from([(on >> 8)])))
				.then(_ => i2c1.writeI2cBlock(address, ALL_LED_OFF_L, 1, Buffer.from([(off & 0xFF)])))
				.then(_ => i2c1.writeI2cBlock(address, ALL_LED_OFF_H, 1, Buffer.from([(off >> 8)])))
				.then(_ => i2c1.close())
				.then(_ => {
					resolve();
					console.log("setAllPWM", on, off);
				})
				.catch(console.log);
			});
		});

	    return i2c.readBytes(MODE1, 1)
	      .then(function (data) {
	        const oldmode = data[0]
	        let newmode = (oldmode & 0x7F) | 0x10 // sleep
	        if (debug) {
	          console.log(`prescale ${Math.floor(prescale)}, newMode: newmode.toString(16)`)
	        }
	        i2c.writeBytes(MODE1, newmode) // go to sleep
	        i2c.writeBytes(PRESCALE, Math.floor(prescale))
	        i2c.writeBytes(MODE1, oldmode)
	        usleep(5000)
	          .then(x => i2c.writeBytes(MODE1, oldmode | 0x80))
	      })
		  */
	  }

	// Sets a single PWM channel
	const setPWM = (channel, on, off) => {
		if (debug) {
			console.log(`Setting PWM channel, channel: ${channel}, on : ${on} off ${off}`)
		}
		i2c.writeWordSync(address, LED0_ON_L + 4 * channel, on & 0xFF)
		i2c.writeWordSync(address, LED0_ON_H + 4 * channel, on >> 8)
		i2c.writeWordSync(address, LED0_OFF_L + 4 * channel, off & 0xFF)
		i2c.writeWordSync(address, LED0_OFF_H + 4 * channel, off >> 8)
	  }

	const setAllPWM = (on, off) => {
		return new Promise(async (resolve, reject) => {
			try {
				const i2c1 = await i2c.openPromisified(1);
				await i2c1.writeI2cBlock(address, ALL_LED_ON_L, 1, Buffer.from([(on & 0xFF)]));
				await i2c1.writeI2cBlock(address, ALL_LED_ON_H, 1, Buffer.from([(on >> 8)]));
				await i2c1.writeI2cBlock(address, ALL_LED_OFF_L, 1, Buffer.from([(off & 0xFF)]));
				await i2c1.writeI2cBlock(address, ALL_LED_OFF_H, 1, Buffer.from([(off >> 8)]));
				await i2c1.close();
				resolve();
			} catch(e) {
				console.log(e);
				reject();
			}
		});
	}

	const stop = () => i2c.writeWordSync(address, ALL_LED_OFF_H, 0x01);

	init()

	return { setPWM, setAllPWM, setPWMFreq, stop };
}



const sleep = (seconds) => {
	return new Promise((resolve, reject) => {
		const timer = new NanoTimer();
		timer.setTimeout(x => resolve(seconds), '', `${seconds}s`);
		timer.clearInterval();
	})
}

const usleep = (micros) => {
	return new Promise((resolve, reject) => {
		const timer = new NanoTimer();
		timer.setTimeout(x => resolve(micros), '', `${micros}u`);
		timer.clearInterval();
	});
}

module.exports = makePwmDriver
