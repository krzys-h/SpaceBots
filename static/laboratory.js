
var invent = function(slot, energy) {
	return send('laboratory invent', { target: laboratory.id, slot: slot, battery: battery.id, energy: energy }).then(function(data) {
		var laboratory = stub2object(data.laboratory);
		laboratory.laboratory_slots[data.slot] = data.blueprint;
		var details = document.getElementById(laboratory.id);
		if(details) {
			var controls_div = details.querySelector(".controls");
			while (controls_div.hasChildNodes()) {
				controls_div.removeChild(controls_div.lastChild);
			}
			controls['laboratory'](controls_div, objects[details.id]);
		}
		return data;
	});
};

var abandon = function(slot) {
	return send('laboratory abandon', { target: laboratory.id, slot: slot }).then(function(data) {
		var laboratory = stub2object(data.laboratory);
		laboratory.laboratory_slots[data.slot] = null;
		var details = document.getElementById(laboratory.id);
		if(details) {
			var controls_div = details.querySelector(".controls");
			while (controls_div.hasChildNodes()) {
				controls_div.removeChild(controls_div.lastChild);
			}
			controls['laboratory'](controls_div, objects[details.id]);
		}
		return data;
	});
};
