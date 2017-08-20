
var grab = function(x, y, z) {
	var json = { target: manipulator.id };
	if(x || y || z) json.position = [x, y, z];
	return send('manipulator grab', json).then(function(data) {
		objects[data.id].manipulator_slot = stub2object(data.manipulator_slot);
	});
};

var release = function() {
	return send('manipulator release', { target: manipulator.id }).then(function(data) {
		delete objects[data.id].manipulator_slot.grabbed_by;
		delete objects[data.id].manipulator_slot;
	});
};

var attach = function(hub, slot) {
	hub = common.get(hub);
	return send('manipulator attach', { target: manipulator.id, hub: hub.id, hub_slot: slot }).then(function(data) {
		var hub = stub2object(data.hub);
		var object = stub2object(data.object);
		var manipulator = stub2object(data.manipulator);
		hub.hub_slots[data.slot] = object;
		object.parent = hub;
		delete object.position;
		delete object.velocity;
		delete object.grabbed_by;
		delete manipulator.manipulator_slot;
	});
};

var detach = function(hub, slot) {
	hub = common.get(hub);
	return send('manipulator detach', { target: manipulator.id, hub: hub.id, hub_slot: slot }).then(function(data) {
		var hub = stub2object(data.hub);
		var object = stub2object(data.object);
		var manipulator = stub2object(data.manipulator);

		manipulator.manipulator_slot = object;
		hub.hub_slots[data.slot] = null;
		delete object.parent;
		object.grabbed_by = hub;
		object.position = vectors.create(common.get_root(manipulator).position);
		object.velocity = vectors.create(common.get_root(manipulator).velocity);
		reporter.remove(object.id);
	});
};

var repulse = function(x, y, z, power) {
	power = power || manipulator.integrity;
	return send('manipulator repulse', {
		target: manipulator.id,
		energy_source: battery.id,
		power: power,
		direction: [x, y, z]
	});
};
