
var fs = require('fs');
var sty = require('sty');
var argv = require('optimist').argv;

var logger = require('./logger');

global.warranty = function() {
	process.stdout.write(fs.readFileSync('WARRANTY').toString());
};

global.copyright = function() {
	process.stdout.write(fs.readFileSync('LICENSE').toString());
};

var nesh = require('nesh');
nesh.log = logger;
nesh.config.load();
nesh.start({
	prompt: '> ',
	useGlobal: true,
	useColors: true,
	ignoreUndefined: true,
	historyFile: '.spacebots_history',
	historyMaxInputSize: 1024 * 1024,
	welcome: sty.b('SpaceBots')+' Copyright (C) 2013  Marek Rogalski\n' +
		'          Copyright (C) 2017  Krzysztof Haładyn\n' +
		'This program comes with ABSOLUTELY NO WARRANTY; for details type "warranty()".\n' +
		'This is free software, and you are welcome to redistribute it under certain\n' +
		'conditions; type "copyright()" for details.'
}, function(err, repl) {
	if(err) {
		logger.error(err);
		return;
	}

	repl.on('exit', function () {
		process.stdout.write(sty.u('(keyboard exit)\n'));
		process.exit();
	});
});

var listener = require('./listener');

var io = listener.io;

var app = listener.app;

logger.info('Listening on port ' + listener.port);

// Begin game logic

var common = require('./static/common'),
vectors = require('./static/vectors'),
resources = require('./static/resources'),
bp = require('./blueprints'),
check = require('validator').check,
sanitize = require('validator').sanitize;

var objects = global.objects = {};

var reg = function(obj) {
	objects[obj.id] = obj;
	return obj;
};

var place = function(host, guest, pos) {
	host.hub_slots[pos] = guest;
	guest.parent = host;
	return guest;
};

var asteroids = global.asteroids = [];

var make_asteroid = function() {
	return {
		id: common.uid(),
		features: {},
		composition: resources.make_resources(common.rnd_exp(5, 10), 14, 20),
		sprite: '/asteroid100.png',
		position: vectors.create(),
		velocity: vectors.create()
	};
};

var make_planet = function() {
	var planet = make_asteroid();
	planet.sprite = '/attractor151.png';
	delete planet.velocity;
	return planet;
};

for(var i = 0; i < 60; ++i) {
	var asteroid = reg(make_asteroid());
	asteroid.position = vectors.random2(3000);
	asteroid.velocity = vectors.random2(5);
	asteroids.push(asteroid);
}

for(var i = 0; i < 100; ++i) {
	var planet = reg(make_planet());
	planet.position = vectors.random2(3000);
	planet.planet_energy = 0;
}

var get_or_create_player = function(hash) {
	if(!(hash in objects)) {

		var hull = reg(bp.make('hub manipulator', 10));
		hull.position = vectors.random2(200);
		hull.velocity = vectors.random2(5);
		hull.hub_slots = [null, null, null, null, null, null];
		hull.sprite = '/hull.png';

		var avatar = place(hull, reg(bp.make('avatar radio', 10)), 0);
		avatar.radio_range = 1000;

		var drive = place(hull, reg(bp.make('impulse_drive store battery', 10)), 1);
		drive.store_stored[0] = drive.store_capacity*0.25;
		drive.battery_energy = drive.battery_capacity*0.5;
		place(hull, reg(bp.make('assembler refinery spectrometer', 10)), 2);
		place(hull, reg(bp.make('laboratory enriching_reactor burning_reactor', 10)), 3);

		var player = reg({
			id: hash,
			avatars: {}
		});

		player.avatars[avatar.id] = avatar;
	}
	return objects[hash];
};

var colors = 'red green yellow blue magenta cyan'.split(' ');

var random_color = function() {
	var i = Math.floor(Math.random() * colors.length);
	return colors[i];
};

var stub = function(obj) {
	if(obj) return { id: obj.id };
};
var stub2object = function(stub) {
	return objects[stub.id] || (objects[stub.id] = stub);
};

var save = global.save = function(filename) {
	var str = JSON.stringify(objects, function(key, obj) {
		if(!key || !obj) return obj;
		if(obj instanceof Array) return obj;
		if(typeof obj !== 'object') return obj;

		var saved_obj = {};
		for(var attr in obj) {
			if(!obj.hasOwnProperty(attr)) continue;
			if(obj[attr] instanceof Array) {
				saved_obj[attr] = [];
				for(var i = 0; i < obj[attr].length; i++) {
					if(obj[attr][i] && typeof obj[attr][i] === 'object' && 'id' in obj[attr][i]) {
						saved_obj[attr][i] = stub(obj[attr][i]);
					} else {
						saved_obj[attr][i] = obj[attr][i];
					}
				}
			} else if(obj[attr] && typeof obj[attr] === 'object' && 'id' in obj[attr]) {
				saved_obj[attr] = stub(obj[attr]);
			} else {
				saved_obj[attr] = obj[attr];
			}
		}
		return saved_obj;
	}, '    ');
	fs.writeFile(filename, str, function(err) {
		if(err) {
			logger.error(err);
			console.error(err);
		}

		logger.info("Saved game state to "+filename);
	});
};

var load = global.load = function(filename) {
	var str = fs.readFileSync(filename);
	global.objects = objects = JSON.parse(str);
	for(var id in objects) {
		var obj = objects[id];
		for(var attr in obj) {
			if(!obj.hasOwnProperty(attr)) continue;
			if(attr == 'position' || attr == 'velocity') {
				obj[attr] = vectors.create(obj[attr]);
			} else if(obj[attr] instanceof Array) {
				for(var i = 0; i < obj[attr].length; i++) {
					if(obj[attr][i] && typeof obj[attr][i] === 'object' && 'id' in obj[attr][i]) {
						obj[attr][i] = stub2object(obj[attr][i]);
					}
				}
			} else if(obj[attr] && typeof obj[attr] === 'object' && 'id' in obj[attr]) {
				obj[attr] = stub2object(obj[attr]);
			}
		}
	}
	logger.info("Loaded game state from "+filename);
};

if(fs.existsSync("autosave.json")) {
	console.log("Resume from autosave");
	load("autosave.json");
}

var do_save = global.do_save = function() {
	if(fs.existsSync("autosave30.json"))
		fs.unlinkSync("autosave30.json");
	for(var i = 29; i > 0; i--) {
		if(fs.existsSync("autosave"+i+".json"))
			fs.renameSync("autosave"+i+".json", "autosave"+(i+1)+".json");
	}
	if(fs.existsSync("autosave.json"))
		fs.renameSync("autosave.json", "autosave1.json");
	save("autosave.json");
};
setInterval(do_save, 10000);
//process.on('exit', do_save);

apply_secret_force = function(object) {
	for(var i = 0; i < 3; ++i) {
		var v = object.position[i];
		if(v < -2000) {
			object.position[i] = - v - 4000;
			object.velocity[i] = - object.velocity[i];
		}
		if(v > 2000) {
			object.position[i] = - v + 4000;
			object.velocity[i] = - object.velocity[i];
		}
	}
};

attract = function() {
	for(var hash in objects) {
		var object = objects[hash];
		if(object.position && object.velocity) {
			object.position.add(object.velocity, 0.01);
			apply_secret_force(object);
		}
		if(object.manipulator_slot) {
			var pos_a = common.get_position(object.manipulator_slot);
			var pos_b = common.get_position(object);
			if(pos_a && pos_b && pos_a.dist(pos_b) > object.manipulator_range) {
				delete object.manipulator_slot.grabbed_by;
				delete object.manipulator_slot;
			}
		}
	}
	setTimeout(attract, 10);
};

attract();

var damage_object = function(obj, dmg) {
	logger.info('damaging ' + obj.id + ' with ' + dmg);
	if(obj.integrity && dmg > obj.integrity) {
		destroy(obj);
	}
};

var damage_ship = function(root, dmg) {
	logger.info('hit at ' + root.id + ' with ' + dmg);
	var cc = common.walk(root);
	var arr = common.dict_to_array(cc);
	var total = 0;
	var i;
	for(i = 0; i < arr.length; ++i) {
		total += resources.get_mass(arr[i]);
	}
	var here = Math.random() * total;
	total = 0;
	for(i = 0; i < arr.length; ++i) {
		total += resources.get_mass(arr[i]);
		if(total > here) break;
	}
	damage_object(arr[i], dmg);
};

var destroy = global.destroy = function(object) {
	logger.info(object.id + ' destroyed');
	var pos = common.get_root(object).position;
	var vel = common.get_root(object).velocity;

	var cc = common.walk(object);
	for(var k in cc) {
		var o = cc[k];
		if('avatar' in o.features) {
			io.sockets.in(k).emit('destroyed', stub(object)); // TODO: This will be sent multiple times if there are multiple avatars on the ship
		}
	}
	if('avatar' in object.features) {
		io.sockets.in(object.id).emit('avatar removed', object.id);
		for (var pid in objects) {
			if ('avatars' in objects[pid] && object.id in objects[pid].avatars) {
				delete objects[pid].avatars[object.id];
			}
		}
	}

	if(object.hub_slots) {
		for(var i = 0; i < object.hub_slots.length; ++i) {
			var orphan = object.hub_slots[i];
			if(orphan) {
				orphan.parent = undefined;
				orphan.velocity = vectors.create(vel);
				orphan.position = vectors.create(pos);
				object.hub_slots[i] = undefined;
			}
		}
	}

	if(object.parent) {
		var me = object.parent.hub_slots.indexOf(object);
		object.parent.hub_slots[me] = undefined;
		object.parent = undefined;
	}

	delete objects[object.id];
};

var apply_thrust_dmg = function(object, source, v, reduce_dmg) {
	var mass = 0;
	if(object.mass) {
		mass += object.mass;
	} else if(object.composition) {
		mass += resources.get_mass(object.composition);
	}
	if(object.parent && object.parent !== source) {
		mass += apply_thrust_dmg(object.parent, object, v, true);
	}
	if(object.hub_slots) {
		for(var i = 0; i < object.hub_slots.length; ++i) {
			if(object.hub_slots[i] && object.hub_slots[i] !== source) {
				mass += apply_thrust_dmg(object.hub_slots[i], object, v, true);
			}
		}
	}
	var energy = mass * v;
	if(reduce_dmg) {
		energy /= 5;
	}
	if(energy > object.integrity) {
		destroy(object);
		mass = 0;
	}
	return mass;
};

var apply_thrust = function(object, direction, momentum, reduce_dmg) {
	logger.info('thrust on ' + object.id.slice(0,4) + ' : ' + momentum);
	var root = common.get_root(object);
	if(typeof root.velocity === 'undefined') return;
	var mass = resources.get_connected_mass(object);
	var dv = momentum / mass;
	apply_thrust_dmg(object, object, dv, reduce_dmg);
	root.velocity.add( direction.scaleTo(dv) );
};

var last_commands_db = {};
var last_accounts = {};

io.sockets.on('connection', function (socket) {
	var player = undefined;
	var address = socket.handshake.address;
	var last_commands;

	if(argv.throttle === 'player') {
		last_commands = [0,0,0,0,0,0,0,0,0,0];
	} else {
		if(address in last_commands_db) {
			last_commands = last_commands_db[address];
		} else {
			last_commands_db[address] = last_commands = [0,0,0,0,0,0,0,0,0,0];
		}
	}

	var name = sty.b(sty[random_color()](address.address));
	var current_handler = 'unknown';

	(function() {
		var old_emit = socket.emit;
		socket.emit = function() {
			logger.info(name + ' < ' + arguments[0]);
			old_emit.apply(socket, arguments);
		};
	})();

	var log_in = function(message) {
		current_handler = message;
		logger.info(name + ' > ' + message);
	};

	var log = function(message) {
		logger.info(name + ' : ' + message);
	};

	log('connected');

	// true if limit exceeded, false if ok
	var test_command_limit = function() {
		return false; // DISABLED

		var now = (new Date).getTime() / 1000;
		var ten_before = last_commands.shift();
		last_commands.push(now);
		return now - ten_before < 1;
	};

	socket.on('log in', function(data, callback) {
		log_in('log in');
		if(!('' + data.player_id).match(/[0-9A-F]{32}/i)) {
			return callback('fail', { code: 2, message: 'Hash used to log in does not match regular' +
											' expression /[0-9A-F]{32}/i .'});
		}

		if(!(data.player_id in objects)) {
			var now = (new Date).getTime() / 1000;
			if(address in last_accounts) {
				if(now - last_accounts[address] < 20) {
					player = undefined;
					return callback('fail', { code: 18, message: 'Only one account per 20 seconds per ip allowed.'});
				}
			}
			last_accounts[address] = now;
		}

		player = get_or_create_player('' + data.player_id);

		if(argv.throttle === 'player') {
			if(data.player_id in last_commands_db) {
				last_commands = last_commands_db[data.player_id];
			} else {
				last_commands_db[data.player_id] = last_commands;
			}
		}


		if(!('avatars' in player)) {
			player = undefined;
			return callback('fail', { code: 3, message: 'Corrputed account - no avatar list.'});
		}
		for(var k in player.avatars) {
			socket.join(k);
		}

		return callback('success', { avatar_list: Object.keys(player.avatars) });
	});

	var find_player_object = function(objid) {
		if(!('' + objid).match(/[0-9A-F]{32}/i)) {
			throw { code: 6, message: 'Target hash is not a valid identifier (should match /[0-9A-F]{32}/i).' };
		}

		var visited = {};
		var queue = [];
		for(var id in player.avatars) {
			queue.push(id);
		}
		var count = 0;
		while(queue.length) {
			id = queue.pop();
			if(id in visited) continue;
			visited[id] = objects[id];
			count += 1;
			var current = objects[id];
			if(typeof current === 'undefined') continue;
			if(id == objid) return current;
			if(current.parent) {
				queue.push(current.parent.id);
			}
			if(current.hub_slots) {
				for(var i = 0; i < current.hub_slots.length; ++i) {
					if(current.hub_slots[i]) {
						queue.push(current.hub_slots[i].id);
					}
				}
			}
		}
		throw { code: 7, message: 'Command target not found connected to any avatar (searched ' + count + ' objects).' };
	};

	var find_target = function(command) {
		if(!command) {
			throw { message: 'Command didn\'t have parameters defined.' };
		}
		if(!command.target) {
			throw { code: 5, message: 'Command didn\'t have `target` defined.' };
		}

		return find_player_object(command.target);
	};

	var check_feature = function(object, feature) {
		if(!object.features[feature]) {
			throw { code: 8, message: 'Specified component doesn\'t	 have ' + feature + ' capabilities' };
		}
	};

	var battery_check = function(battery, energy) {
		check_feature(battery, 'battery');
		check(energy, "Energy must be a number").isFloat();
		check(energy, "Energy can't be nagative").min(0);
		check(energy, "Required energy exceeds available in battery").max(battery.battery_energy);
	};

	var on = function on(name, handler) {
		socket.on(name, function on_handler(command, cb) {
			log_in(name);
			if(!player) {
				return cb('fail', { code: 18, message: 'You have to log in first!' });
			}
			if(test_command_limit()) {
				return cb('fail', { code: 9, message: 'Exceeded limit of ' + last_commands.length + ' commands per second.' });
			}

			try {
				var target = find_target(command);

				if(cb) {
					cb('success', handler(target, command));
				} else {
					handler(target, command);
				}
			} catch(e) {
				if(cb) {
					cb('fail', { source: current_handler, message: e.message, stack: e.stack ? e.stack.split("\n") : undefined });
				} else {
					socket.emit('fail', { source: current_handler, message: e.message, stack: e.stack ? e.stack.split("\n") : undefined });
				}
			}
		});
	};

	on('sprite', function(target, data) {
		if('user_sprite' in target) {
			throw { message: "Specified target already has 'user_sprite' defined." };
		}
		var spr = "" + data.user_sprite;
		if(spr.length > 127) {
			throw { message: "Requested sprite url has length " + data.length + " but should be no more than 127." };
		}
		target.user_sprite = spr;
		return { id: target.id, user_sprite: spr };
	});

	on('report', function(target, data) {
		var report = {};
		if('parent' in target) {
			report.parent = stub(target.parent);
		}
		if('hub_slots' in target) {
			report.hub_slots = target.hub_slots.map(stub);
		}
		if('manipulator_slot' in target) {
			report.manipulator_slot = stub(target.manipulator_slot);
		}
		report.features = {};
		for(var x in target.features) {
			report.features[x] = "/intro_pl/" + x + ".html";
		}
		var copy = 'id position velocity sprite user_sprite integrity radio_range impulse_drive_payload impulse_drive_impulse store_stored store_capacity battery_energy battery_capacity manipulator_range laboratory_slots laboratory_tech_level'.split(' ');
		copy.forEach(function(key) {
			report[key] = target[key];
		});
		if(target.composition) {
			report.mass = resources.get_mass(target.composition);
		}
		return report;
	});

	on('radio broadcast', function(target, data) {
		check_feature(target, 'radio');
		var str = JSON.stringify(data.message);
		if(str.length > 140) {
			throw { code: 1, message: 'JSON.stringify(message) should have at most 140 characters' };
		}
		socket.broadcast.emit('broadcast', { source: stub(common.get_root(target)), message: data.message });
	});


	var radio_copy_fields = 'id sprite user_sprite position velocity planet_energy'.split(' ');
	on('radio scan', function(target, data) {
		check_feature(target, 'radio');
		var results = [];
		var radio_position = common.get_position(target);

		for(var hash in objects) {
			var object = objects[hash];
			if(!('position' in object)) continue;
			var d = radio_position.dist(object.position);
			if(d <= target.radio_range) {
				var report = {};
				radio_copy_fields.forEach(function(key) { if(key in object) report[key] = object[key]; });
				if(object.owner)
					report.friendly = (object.owner == player.id);
				results.push(report);
			}
		}
		return results;
	});


	on('manipulator grab', function(target, data) {
		check_feature(target, 'manipulator');

		if(target.manipulator_slot) {
			delete target.manipulator_slot.grabbed_by;
			delete target.manipulator_slot;
		}

		var manipulator_position = common.get_position(target);
		var grab_position = manipulator_position;
		if(Array.isArray(data.position)) {
			grab_position = vectors.create(data.position);
		}

		var total_range = target.manipulator_range;
		var left_range = total_range - grab_position.dist(manipulator_position);

		if(left_range < 0) {
			throw { message: 'Grab position outside manipulator range.' };
		}

		var cc = common.walk(target, {}, true);

		var closest = undefined;
		var closest_dist = 999999;

		for(var hash in objects) {
			var object = objects[hash];
			if(!('position' in object)) continue;
			if(object.id in cc) continue;
			var d = grab_position.dist(object.position);
			if(d < closest_dist) {
				closest_dist = d;
				closest = object;
			}
		}

		if(closest_dist > left_range) {
			throw { message: 'No valid object found around grab position.' };
		}

		if (closest.sprite == '/attractor151.png') {
			throw { message: 'Can\'t grab planets' }
		}

		closest.grabbed_by = target;
		target.manipulator_slot = closest;

		return {
			id: target.id,
			manipulator_slot: { id: closest.id }
		};
	});

	on('manipulator release', function(target, data) {
		check_feature(target, 'manipulator');

		if(!target.manipulator_slot) {
			throw { message: 'Manipulator empty.' };
		}

		delete target.manipulator_slot.grabbed_by;
		delete target.manipulator_slot;

		return { id: target.id };
	});

	on('manipulator attach', function(target, data) {
		check_feature(target, 'manipulator');

		if(typeof target.manipulator_slot === 'undefined')
			throw { message: 'Manipulator empty - nothing to be attached.' };
		var hub = find_co_component(target, data.hub, 'hub');
		if(typeof data.hub_slot !== 'number')
			throw { message: 'hub slot should be a number.' };
		var idx = Math.round(data.hub_slot);
		if(idx < 0)
			throw { message: 'Specified hub doesn\'t have negative slots.' };
		if(idx >= hub.hub_slots.length)
			throw { message: 'Specified hub doesn\'t have that many slots.' };
		if(hub.hub_slots[idx])
			throw { message: 'hub '+data.hub+' slot '+idx+' occupied by '+hub.hub_slots[idx].id+'.' };

		var o = target.manipulator_slot;
		hub.hub_slots[idx] = o;
		o.parent = hub;
		delete target.manipulator_slot.position;
		delete target.manipulator_slot.velocity;
		delete target.manipulator_slot.grabbed_by;
		delete target.manipulator_slot;
		return { manipulator: { id: target.id }, hub: { id: hub.id }, slot: idx, object: { id: o.id } };
	});

	on('manipulator detach', function(target, data) {
		check_feature(target, 'manipulator');

		if(typeof target.manipulator_slot !== 'undefined')
			throw { message: 'Manipulator not empty' };
		var hub = find_co_component(target, data.hub, 'hub');
		if(typeof data.hub_slot !== 'number')
			throw { message: 'Hub slot should be a number.' };
		var idx = Math.round(data.hub_slot);
		if(idx < 0)
			throw { message: 'Specified hub doesn\'t have negative slots.' };
		if(idx >= hub.hub_slots.length)
			throw { message: 'Specified hub doesn\'t have that many slots.' };
		if(!hub.hub_slots[idx])
			throw { message: 'Nothing in hub '+data.hub+' slot '+idx+'.' };

		target.manipulator_slot = hub.hub_slots[idx];
		hub.hub_slots[idx] = null;
		delete target.manipulator_slot.parent;
		target.manipulator_slot.grabbed_by = target;
		target.manipulator_slot.position = vectors.create(common.get_root(target).position);
		target.manipulator_slot.velocity = vectors.create(common.get_root(target).velocity);
		return { manipulator: stub(target), hub: stub(hub), slot: idx, object: stub(target.manipulator_slot) };
	});

	var find_co_component = function(source, id, feature) {
		var cc = common.walk(source);
		var name = feature ? feature.capitalize() : "Object";
		check(id, name + ' id (' + id + ') doesn\'t match /[0-9A-F]{32}/i').is(/[0-9A-F]{32}/i);
		check(cc[id], name + ' ' + id + ' is not reachable from ' + source.id).notNull();
		if(feature) check(cc[id].features[feature], 'Object ' + id + ' can\'t act as a ' + feature).notNull();
		return cc[id];
	};

	on('manipulator repulse', function(target, data) {
		check_feature(target, 'manipulator');

		if(typeof target.manipulator_slot === 'undefined')
			throw { message: 'Manipulator empty.' };
		if(!Array.isArray(data.direction))
			throw { message: 'Repulse direction should be an array.' };
		if(data.direction.length != 3)
			throw { message: 'Repulse direction should have length 3.' };
		var energy_source = find_co_component(target, data.energy_source, 'battery');

		battery_check(energy_source, data.energy);
		var energy = Number(data.energy);

		var direction = vectors.create(data.direction);
		var object = target.manipulator_slot;

		apply_thrust(object, direction, energy);
		apply_thrust(target, direction.neg(), energy);
		energy_source.battery_energy -= energy;

	});

	on('impulse_drive push', function(target, cmd) {
		check_feature(target, 'impulse_drive');

		var energy_source = find_co_component(target, cmd.energy_source, 'battery');
		var matter_store = find_co_component(target, cmd.matter_source, 'store');

		if(!resources.lte(cmd.composition, matter_store.store_stored)) {
			throw { code: 11, message: 'Ordered to grab more materials than available in store.' };
		}
		var reaction_mass = resources.get_mass(cmd.composition);
		if(reaction_mass > target.impulse_drive_payload) {
			throw { code: 12, message: 'Ordered payload exceeds drive capabilities.' };
		}
		if(reaction_mass <= 0) {
			throw { message: 'Reaction mass must be >= 0' };
		}
		if(cmd.impulse > target.impulse_drive_impulse) {
			throw { code: 13, message: 'Ordered impulse exceeds drive capabilities.' };
		}
		if(cmd.impulse <= 0) {
			throw { message: 'Impulse must be greather than 0.' };
		}
		var energy = reaction_mass * cmd.impulse;
		battery_check(energy_source, energy);

		var root = common.get_root(target);
		var d = root.position.dist(cmd.destination);
		var time = d / cmd.impulse;

		setTimeout(function() {
			socket.emit('explosion', {
				sprite: '/explosion45.png',
				duration: 1,
				position: cmd.destination
			});

			var r = d * reaction_mass * cmd.impulse / 100000 + 10;
			var hit_point = vectors.create(cmd.destination);
			var total = 0;
			var hit = [];
			var o, l, m;

			for(var hash in objects) {
				o = objects[hash];
				if(o.position) {
					l = o.position.dist(hit_point);
					if(l == 0) {
						hit = [o];
						break;
					}
					if(l < r) {
						m = resources.get_connected_mass(o);
						total += m / l;
						hit.push(o);
					}
				}
			}
			if(hit.length == 0) return;
			var here = Math.random() * total;
			var cumulative = 0;
			for(var i = 0; i < hit.length; ++i) {
				o = hit[i];
				l = o.position.dist(hit_point);
				m = resources.get_connected_mass(o);
				cumulative += m / l;
				if(cumulative > here) break;
			}
			var cc = common.walk(o); // TODO: more sophisticated
			// selection of hit location
			var arr = common.dict_to_array(cc);
			var i = Math.floor(Math.random() * arr.length);
			apply_thrust(arr[i], direction.neg(), energy, false);
		}, time * 1000);


		var direction = vectors.create(root.position).
			subtract(cmd.destination).
			normalize();

		apply_thrust(target, direction, energy, true);

		resources.subtract(matter_store.store_stored, cmd.composition);
		energy_source.battery_energy -= energy;

	});

	on('refinery refine', function(target, data) {
		check_feature(target, 'refinery');
		var store = find_co_component(target, data.store, 'store');
		var material = find_co_component(target, data.material);

		var stored = resources.get_mass(store.store_stored);
		var space_left = store.store_capacity - stored;

		var material_mass = resources.get_mass(material.composition);

		if(material_mass > space_left) {
			var ratio = space_left / material_mass;
			var move_arr = resources.make_copy(material.composition);
			resources.multiply(move_arr, ratio);
			resources.subtract(material.composition, move_arr);
			resources.add(store.store_stored, move_arr);
			if(material.features) {
				var farr = Object.keys(material.features);
				var remove_features = Math.ceil(ratio * farr.length);
				for(var i = 0; i < remove_features; ++i) {
					var desiredIndex = Math.floor(Math.random() * farr.length);
					delete material.features[farr[desiredIndex]];
					farr.splice(desiredIndex, 1);
				}
			}

		} else {
			resources.add(store.store_stored, material.composition);
			destroy(material);
		}

		return { id: target.id, refined: Math.min(material_mass, space_left) };
	});

	on('store move', function(target, data) {
		check_feature(target, 'store');
		var store = find_co_component(target, data.store, 'store');
		var composition = data.composition;

		if(!resources.lte(composition, store.store_stored)) {
			throw { message: 'Not enough resources in store.' };
		}

		var stored = resources.get_mass(target.store_stored);
		var space_left = target.store_capacity - stored;

		var material_mass = resources.get_mass(composition);

		if(material_mass > space_left)
			throw { message: 'Not enough space left in target store' };

		resources.subtract(store.store_stored, composition);
		resources.add(target.store_stored, composition);

		return { id: target.id, moved: composition };
	});

	on('battery move', function(target, data) {
		check_feature(target, 'battery');
		var battery = find_co_component(target, data.battery, 'battery');
		battery_check(battery, data.energy);
		var energy = data.energy;

		var space_left = target.battery_capacity - target.battery_energy;

		if(energy > space_left)
			throw { message: 'Not enough space left in target battery' };

		battery.battery_energy -= energy;
		target.battery_energy += energy;

		return { id: target.id, moved: energy };
	});

	on('laboratory invent', function(target, json) {
		check_feature(target, 'laboratory');
		var laboratory = target;
		check(json.slot, "Slot number must be an integer").isInt();
		check(json.slot, "Slot number must be >= 0").min(0);
		check(json.slot, "Slot number must not exceed laboratory capacity").max(laboratory.laboratory_slots.length - 1);
		var slot = sanitize(json.slot).toInt();
		check(laboratory.laboratory_slots[slot], "Laboratory slot taken").isNull();
		var battery = find_co_component(laboratory, json.battery, 'battery');
		battery_check(battery, json.energy);
		var energy = Number(json.energy);
		battery.battery_energy -= energy;
		var level = bp.mod(laboratory.laboratory_tech_level, energy);
		var features = bp.random_features(level);
		var blueprint = bp.randomize_blueprint(bp.make_blueprint(features, level));
		laboratory.laboratory_slots[slot] = blueprint;
		return { laboratory: stub(laboratory), slot: slot, blueprint: blueprint };
	});

	on('laboratory abandon', function(target, json) {
		check_feature(target, 'laboratory');
		var laboratory = target;
		check(json.slot, "Slot number must be an integer").isInt();
		check(json.slot, "Slot number must be >= 0").min(0);
		check(json.slot, "Slot number must not exceed laboratory capacity").max(laboratory.laboratory_slots.length - 1);
		var slot = sanitize(json.slot).toInt();
		check(laboratory.laboratory_slots[slot], "Laboratory slot already empty").notNull();
		laboratory.laboratory_slots[slot] = undefined;
		return { laboratory: stub(laboratory), slot: slot, blueprint: laboratory.laboratory_slots[slot] };
	});

	on('assembler estimate', function(target, json) {
		check_feature(target, 'assembler');
		var laboratory = find_co_component(target, json.laboratory, 'laboratory');
		check(json.slot, "Slot number must be an integer").isInt();
		check(json.slot, "Slot number must be >= 0").min(0);
		check(json.slot, "Slot number must not exceed laboratory capacity").max(laboratory.laboratory_slots.length - 1);
		var slot = sanitize(json.slot).toInt();
		check(laboratory.laboratory_slots[slot], "Laboratory slot can't be empty").notNull();
		var blueprint = laboratory.laboratory_slots[slot];
		var materials = bp.estimate_materials(blueprint);
		return { assembler: stub(target), laboratory: stub(laboratory), slot: slot, materials: materials };
	});

	on('assembler build', function(target, json) {
		check_feature(target, 'assembler');
		var laboratory = find_co_component(target, json.laboratory, 'laboratory');
		check(json.slot, "Slot number must be an integer").isInt();
		check(json.slot, "Slot number must be >= 0").min(0);
		check(json.slot, "Slot number must not exceed laboratory capacity").max(laboratory.laboratory_slots.length - 1);
		var slot = sanitize(json.slot).toInt();
		check(laboratory.laboratory_slots[slot], "Laboratory slot can't be empty").notNull();
		var blueprint = laboratory.laboratory_slots[slot];
		var materials = bp.estimate_materials(blueprint);
		var store = find_co_component(target, json.store, 'store');
		if(!resources.lte(materials, store.store_stored))
			throw { message: 'Not enough resources in store.' };
		resources.subtract(store.store_stored, materials);
		var object = bp.realize_blueprint(blueprint);
		var root = common.get_root(target);
		object.position = vectors.create(root.position);
		object.velocity = vectors.create(root.velocity);
		reg(object);
		if ('avatar' in object.features) {
			player.avatars[object.id] = object;
			socket.join(object.id);
			socket.emit('avatar added', object.id); // TODO: send to other connections for this player?
		}
		return { assembler: stub(target), laboratory: stub(laboratory), slot: slot, materials: materials, object: object };
	});

	on('spectrometer scan', function(target, json) {
		check_feature(target, 'spectrometer');
		var material = find_co_component(target, json.material);
		return { material: stub(material), composition: material.composition };
	});

	on('reactor burn', function(target, json) {
		check_feature(target, 'burning_reactor');
		var store = find_co_component(target, json.store, 'store');
		var battery = find_co_component(target, json.battery, 'battery');
		check(json.resource, "Resource number must be an integer").isInt();
		check(json.resource, "Resource number must be >= 0").min(0);
		check(json.resource, "Resource number must be < 100").max(99);
		var resource = sanitize(json.resource).toInt();
		check(json.target_resource, "Target resource number must be an integer").isInt();
		check(json.target_resource, "Target resource number must be >= 0").min(0);
		check(json.target_resource, "Target resource number must be < 100").max(99);
		var target_resource = sanitize(json.target_resource).toInt();
		check(json.amount, "Amount must be >= 0").min(0);
		var amount = sanitize(json.amount).toFloat();

		// 25 is iron (remember, starting at 0!)
		if (resource < 25) {
			if (target_resource < resource || target_resource > 25)
				throw { message: 'Reaction in wrong direction!' };
		}
		else if (resource > 25) {
			if (target_resource > resource || target_resource < 25)
				throw { message: 'Reaction in wrong direction!' };
		}
		else
			throw { message: 'Cannot generate energy from this resource' };

		var store_request = resources.make_empty();
		store_request[resource] = amount;
		if(!resources.lte(store_request, store.store_stored))
			throw { message: 'Not enough resources in store.' };

		if (amount > target.capacity) {
			throw { message: 'Ordered amount exceeds reactor capabilities.' };
		}

		var generated_energy = amount * 1000 * Math.abs(resource-target_resource);
		var generated_materials = resources.make_empty();
		generated_materials[target_resource] = amount;

		resources.subtract(store.store_stored, store_request);
		resources.add(store.store_stored, generated_materials);
		battery.battery_energy = Math.min(battery.battery_energy + generated_energy, battery.battery_capacity);

		return { 'generated_energy': generated_energy, 'generated_materials': generated_materials };
	});

	on('reactor enrich', function(target, json) {
		check_feature(target, 'enriching_reactor');
		var store = find_co_component(target, json.store, 'store');
		var battery = find_co_component(target, json.battery, 'battery');
		check(json.resource, "Resource number must be an integer").isInt();
		check(json.resource, "Resource number must be >= 0").min(0);
		check(json.resource, "Resource number must be < 100").max(99);
		var resource = sanitize(json.resource).toInt();
		check(json.target_resource, "Target resource number must be an integer").isInt();
		check(json.target_resource, "Target resource number must be >= 0").min(0);
		check(json.target_resource, "Target resource number must be < 100").max(99);
		var target_resource = sanitize(json.target_resource).toInt();
		check(json.amount, "Amount must be >= 0").min(0);
		var amount = sanitize(json.amount).toFloat();

		// 25 is iron (remember, starting at 0!)
		if (resource < 25) {
			if (target_resource > resource)
				throw { message: 'Reaction in wrong direction!' };
		}
		else if (resource > 25) {
			if (target_resource < resource)
				throw { message: 'Reaction in wrong direction!' };
		}

		var store_request = resources.make_empty();
		store_request[resource] = amount;
		if(!resources.lte(store_request, store.store_stored))
			throw { message: 'Not enough resources in store.' };

		if (amount > target.capacity) {
			throw { message: 'Ordered amount exceeds reactor capabilities.' };
		}

		var used_energy = amount * 1000 * Math.abs(resource-target_resource);
		var generated_materials = resources.make_empty();
		generated_materials[target_resource] = amount;

		if(used_energy > battery.battery_energy)
			throw { message: "Required energy exceeds available in battery" };

		resources.subtract(store.store_stored, store_request);
		resources.add(store.store_stored, generated_materials);
		battery.battery_energy -= used_energy;

		return { 'used_energy': used_energy, 'generated_materials': generated_materials };
	});

	// TODO: Less copy-paste
	socket.on('planet takeover', function(data, callback) {
		log_in('planet takeover');
		try {
			if(!data) {
				throw { message: 'Command didn\'t have parameters defined.' };
			}
			if(!data.target) {
				throw { code: 5, message: 'Command didn\'t have `target` defined.' };
			}
			if(!('' + data.target).match(/[0-9A-F]{32}/i)) {
				throw { code: 6, message: 'Target hash is not a valid identifier (should match /[0-9A-F]{32}/i).' };
			}
			var target = objects[data.target];
			if(!('planet_energy' in target))
				throw { code: 8, message: 'Target is not a planet' };
			var ok = false;
			for(var id in player.avatars) {
				if(common.get_position(player.avatars[id]).dist(common.get_position(target)) < 100)
					ok = true;
			}
			if(!ok)
				throw { code: 7, message: 'Command target is too far from avatar (max 100)' };

			var battery = find_player_object(data.energy_source);
			check(data.energy, "Energy must be a number").isFloat();
			check(data.energy, "Energy must be >= 0").min(0);
			var energy = data.energy;

			if(target.planet_energy > energy) {
				throw { message: 'Not enough energy to take over the planet (tried '+energy+', needs at least '+target.planet_energy+')' };
			}

			var used_energy = energy;
			if(target.owner == player.id)
				used_energy -= target.planet_energy;

			battery_check(battery, used_energy);

			target.owner = player.id;
			target.planet_energy = energy;
			battery.battery_energy -= used_energy;

			var r = { planet_energy: energy, used_energy: used_energy };
			if(callback) {
				callback('success', r);
			}
		} catch(e) {
			if(callback) {
				callback('fail', { source: 'planet takeover', message: e.message, stack: e.stack ? e.stack.split("\n") : undefined });
			} else {
				socket.emit('fail', { source: 'planet takeover', message: e.message, stack: e.stack ? e.stack.split("\n") : undefined });
			}
		}
	});

});
