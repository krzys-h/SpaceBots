
var reporter = {
	queue: [],
	interval: 500,
	timeout_id: undefined,
	scan_complete_cb: undefined,
	loop: function reporter_loop() {
		reporter.timeout_id = undefined;
		var id = reporter.queue.shift();
		if(id) {
			socket.emit('report', { target: id }, reporter.callback);
		}
		reporter.schedule();
	},
	callback: function reporter_callback(status, obj) {
		if(status !== 'success') {
			console.error("Couldn't get report: " + status + ", " + JSON.stringify(obj));
			return;
		}
		
		reporter.add(obj.id);

		// We can save it to our `objects` collection:

		obj = report2object(obj);

		// We should record the moment we got our report.

		obj.component_fetch_time = current_time;

		// Now, we could check features of this object and check whether
		// it deserves special attention

		// If it is our avatar, we'll save it in the global `avatar`
		// variable.
		if(obj.id == avatar_id) {
			avatar = obj;
		}

		// If it is a radio, we'll save it into global `radio` variable...
		if(obj.features.radio && !radio) {
			radio = obj;
			// ... and schedule a radio scan right away.
			radio_scanner.run();
		}

		// If this object is capable of hauling mass with high velocities,
		// we'll save it into impulse_drive variable for later use.
		if(('impulse_drive_payload' in obj) && (impulse_drive === undefined)) {
			impulse_drive = obj;
		}

		// We could alse remember our resource and energy stores:
		if(('store_stored' in obj) && (store === undefined)) {
			store = obj;
		}
		if(('battery_energy' in obj) && (battery === undefined)) {
			battery = obj;
		}

		// We can use any object with manipulator_range to manipulate
		// other objects
		if('manipulator_range' in obj) {
			manipulator = obj;
		}

		if('laboratory_tech_level' in obj) {
			laboratory = obj;
		}

		if(obj.features && obj.features.refinery) {
			refinery = obj;
		}

		if(obj.features && obj.features.assembler) {
			assembler = obj;
		}

		if(obj.features && obj.features.spectrometer) {
			spectrometer = obj;
		}

		if(obj.features && obj.features.burning_reactor) {
			burning_reactor = obj;
		}

		if(obj.features && obj.features.enriching_reactor) {
			enriching_reactor = obj;
		}

		// Check if all components are scanned already, and resolve the "ready" promise if so
		if(reporter.everything_scanned() && reporter.scan_complete_cb) {
			reporter.scan_complete_cb();
		}
	},
	everything_scanned: function () {
		return Object.values(common.walk(avatar)).reduce(function(val, obj) {
			if(!obj.component_fetch_time)
				return false;
			return val;
		}, true);
	},
	schedule: function reporter_schedule() {
		var t = reporter.interval * (Math.random() + 1);
		if(!reporter.everything_scanned()) {
			// During the initial scanning phase, run the reporter more often
			// After log in, we need to load data about the whole ship
			t = 0.25*t;
		}
		reporter.timeout_id = setTimeout(reporter.loop, t);
	},
	unschedule: function reporter_schedule() {
		clearTimeout(reporter.timeout_id);
		reporter.timeout_id = undefined;
	},
	add: function reporter_add(id) {
		if(reporter.queue.indexOf(id) < 0) {
			reporter.queue.push(id);
		}
	},
	remove: function reporter_remove(id) {
		var idx = reporter.queue.indexOf(id);
		if(idx >= 0) {
			reporter.queue.splice(idx, 1);
		}
	}
};

reporter.schedule();

// "ready" promise triggers once the initial scan of all ship components has finished
// This is a good point to inject your own logic, e.g. a bot
var ready = logged_in.then(function () {
	return new Promise(function(resolve, reject) {
		reporter.scan_complete_cb = resolve;
	});
}).then(function() {
	onscreen_console.log("Initial scan complete");
});
