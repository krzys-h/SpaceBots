
// The game is operated through a live connection with its
// server. Here is the line that uses socket.io library to create
// this connection.

var socket;

var connect = function() {
	return new Promise(function(resolve, reject) {

		socket = io.connect();

		// We use the 'connect' event to execute action right after
		// connection is created.

		socket.on('connect', resolve());

		socket.on('fail', function(err) {
			console.error(err);
		});
		
	});
};

var send = function(command, argument) {
	if(!command) throw "error: Add command to `send(command, argument)`";
	if(!argument) throw "error: Add argument object to `send(command, argument)`";

	return new Promise(function(resolve, reject) {
		socket.emit(command, argument, function(status, reply) {
			if(status === 'success')
				resolve(reply);
			else
				reject(reply);
		});
	}).catch(function(error) {
		console.error('Error while handling \''+command+'\': ', error);
		throw error;
	});
};


// We won't use socket.io directly anymore. All communication with
// server will be done by sending and receiving messages using just
// created socket.

// After connection we should log in. Here we have a function to
// log in to the game

var log_in = function() {
	// We don't have an account yet. A player is identified by a long
	// (32 characters) hexadecimal number called id. SpaceBots uses
	// such identifiers for most of the stuff found in the game. We
	// can create new id with `uid` function from `common` module.

	localStorage.player_id = localStorage.player_id || common.uid();

	// We store id in localStorage. This way you will log into the
	// same account each time you visit the page.

	// Excercise: calculate, how big is the probability that this
	// newly generated number could collide with random id of other
	// player. You can do it now.

	// Tip: find a calculator that can handle very small numbers.

	// As number of players is much higher than one (offline players
	// also count) the probability of id collision raises.

	// Excercise: calculate how much players should there be to raise
	// the probability of collision to 1%?

	// Tip: google for birthday paradox

	// Now that we have an id, we can send it to the server.

	console.log("Logging in...");

	return send('log in', { player_id: localStorage.player_id });
};

var logged_in = connect().then(function () {
	if(localStorage.tutorial_finished == "true") {
		return log_in();
	}
});

// Now continue to avatar_list.js
