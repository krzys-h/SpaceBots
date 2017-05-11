
var invent = function(slot, energy) {
	return send('laboratory invent', { target: laboratory.id, slot: slot, battery: battery.id, energy: energy }, function(data) {
		var laboratory = stub2object(data.laboratory);
		laboratory.laboratory_slots[data.slot] = data.blueprint;
		var details = document.getElementById(laboratory.id);
		if(details) {
			details.querySelector('.laboratory_slots').innerHTML = stringify(laboratory.laboratory_slots);
		}
	});
};

var abandon = function(slot) {
	return send('laboratory abandon', { target: laboratory.id, slot: slot }, function(data) {
		var laboratory = stub2object(data.laboratory);
		laboratory.laboratory_slots[data.slot] = null;
		var details = document.getElementById(laboratory.id);
		if(details) {
			details.querySelector('.laboratory_slots').innerHTML = stringify(laboratory.laboratory_slots);
		}
	});
};
