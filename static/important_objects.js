
var avatar_ids = [];

// Excercise: check your avatar id by typing "avatar_ids[0]" in the
// console window. Avatar id, unlike player id can be made public - it
// simply identifies your avatar in the game. When other players will
// see your avatar on the radio, it will report the same avatar
// id. The same rule applies to all game objects - they all have ids.

// Now, that we are waiting for the server to return our avatar
// status, we can prepare an object that will hold our knowledge about
// the world in the game:

var objects = {};

// "Pantha rhei" - everything changes. Whenever we get data from the
// server, this data is valid at the moment it is generated. It should
// be useful to remember when we got this data. On order to do so, we
// will need a clock. We will hold it in this variable:

var current_time = 0;

// This function will get an object and integrate it into global
// database in the `objects` variable.

var report2object = function report2object(obj) {
	var key;

	if(objects[obj.id]) {

		// If we already have this object saved, we should only update
		// its fields.	We do this because during the execution
		// various parts of the game will create direct references to
		// the old object and we don't want to invalidate them.

		// Some fields are always sent by the server. Their old values
		// may however remain from older reports. We should delete
		// these possibly invalid properties.

		var old = objects[obj.id];
		
		for(key in obj) old[key] = obj[key];

		// We should erase all references to the received
		// object. After all the data was copied, it could only
		// introduce mess in the code.

		obj = old;
	} else {
		objects[obj.id] = obj;
	}

	// Position and velocity information will be sent as arrays: [x,
	// y, z]. We can convert them into vectors. This way they will be
	// easier to use.

	if(obj.position) obj.position = vectors.create(obj.position);
	if(obj.velocity) obj.velocity = vectors.create(obj.velocity);

	// Now, we can check what other components our `obj` is connected
	// to. Various components can have child elements. They are saved
	// in `hub_slots` field. Child elements connected through
	// `hub_slots` can communicate, exchange resources and power.

	if(obj.hub_slots) {
		obj.hub_slots = obj.hub_slots.map(function(child) {
			// `hub_slots` form an array. However - not every
			// index is filled. We check it now:

			if(child && child.id) {
				return stub2object(child);
			}
			return null;
		});
	}

	// Besides child elements, any object can control its own
	// parent. We will do basically the same thing as with
	// `hub_slots`. Only difference is that an object can have at
	// most one parent so we don't need to iterate over the array.

	if(obj.parent) obj.parent = stub2object(obj.parent);

	// When manipulators hold other objects, they have stubs with
	// their ids in manipulator_slot. If we don't have any information
	// about these held objects, we should mark them in our objects
	// set:

	if(obj.manipulator_slot) obj.manipulator_slot = stub2object(obj.manipulator_slot);

	return obj;

};

// Child components and various other items are
// reported by the server as "stubs". They are objects
// that have only one property defined: `id`. It makes
// communication more efficient - if you already have
// information about this particular object, the
// server doesn't waste any bandwidth to send it
// again. If you don't have any info then you can
// request it using 'report' message.

// When we already have the object scanned - we don't
// need to issue 'report' command any more.

// This way we will get 'scan report' for the next
// component, and the next one, and so on.

// This nifty trick will scan all the component hierarchy
// that is under our control.

var stub2object = function(stub) {
	if(stub.id in common.walk(avatar))
		reporter.add(stub.id);
	return objects[stub.id] || (objects[stub.id] = stub);
};

// Certain objects that we will most probably use all the time are
// also worth saving. Each of them will be more deeply described in
// appropiate section later on.

var avatar;

// Radio will map our surroundings. Without a decent radio, we are
// basically blind.

var radio;

// Drive will provide us with thrust. Without drive, we wouldn't be
// able to move a bit. There are various kinds of drives. Initially
// you will get impulse drive - not very efficient but it can also be
// used as a defense mechanism.

var impulse_drive;

// Store and battery will store resources and energy.

var store, battery;

// Manipulator can grab and throw various objects. It can't generate
// thrust as big as impulse drive but is able to grab any object.

var manipulator;

// Later on we will use other kinds of objects - batteries, reactors,
// weapons, labs, various secret modules and even create our own,
// custom components.

var refinery, laboratory, assembler;
var spectrometer, burning_reactor, enriching_reactor;
