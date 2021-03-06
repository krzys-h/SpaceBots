
var radio_scanner = {
	interval: 500,
	timeout_id: undefined,
	callbacks: [],
	status: function() {
		if(radio_scanner.timeout_id) return 'running';
		else return 'stopped';
	},
	has_callback: function(cb) {
		return radio_scanner.callbacks.indexOf(cb) >= 0;
	},
	add_callback: function(cb) {
		if(radio_scanner.callbacks.indexOf(cb) < 0) {
			radio_scanner.callbacks.push(cb);
		}
	},
	remove_callback: function(cb) {
		var i = radio_scanner.callbacks.indexOf(cb);
		if(i >= 0) {
			radio_scanner.callbacks.splice(i, 1);
		}
	},
	loop: function radio_loop() {
		radio_scanner.timeout_id = undefined;

		socket.emit('radio scan', {
			target: radio.id
		}, radio_scanner.result);

		radio_scanner.schedule();
	},
	schedule: function radio_scanner_schedule() {
		if(!radio_scanner.timeout_id) {
			var t = radio_scanner.interval;
			radio_scanner.timeout_id = setTimeout(radio_scanner.loop, t);
		}
	},
	stop: function radio_scanner_schedule() {
		if(radio_scanner.timeout_id) {
			clearTimeout(radio_scanner.timeout_id);
			radio_scanner.timeout_id = undefined;
		}
	},
	run: function radio_scanner_run() {
		radio_scanner.loop();
	},
	result: function radio_scanner_result(status, result) {

		if(status !== 'success') {
			console.error('Error in radio scan: ' + JSON.stringify(result));
			return;
		}

		// When radio scanning is done, we get the array containing all items
		// found within the `radio_range`. Each object found will have only
		// most basic fields - id, position, velocity and sprite.
		
		// Let's integrate new information into our own structures. We
		// will do it the same way as in 'report' handler.

		result.forEach(function(x) {
			var obj = report2object(x);

			// We should record the moment we got our report.

			obj.fetch_time = current_time;
		});

		// After each radio update, we are up-to date with all objects
		// positions and we are able to execute some additional action that is
		// guaranteed to operate on correct values. We will store this action
		// in `radio_scanner.callbacks`.

		radio_scanner.callbacks.forEach(function(f) { f() });

	}
};

var messages = {};
var broadcast = function(msg, receiver) {
	receiver = receiver || null;
	if(receiver) receiver = common.get(receiver);
	return send('radio broadcast', { target: radio.id, message: msg, receiver: receiver ? receiver.id : null }).then(function() {
		onscreen_console.log("Sent broadcast from " + radio.id + ": " + JSON.stringify(msg));
	});
};

socket.on('broadcast', function(data) {
	var id = data.source.id;
	if(!messages[id]) messages[id] = [];
	messages[id].unshift({ text: JSON.stringify(data.message), time: current_time });
	onscreen_console.log("Broadcast from " + data.source.id + ": " + JSON.stringify(data.message));
});
