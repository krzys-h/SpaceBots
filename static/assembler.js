
var estimate = function(slot) {
	return send('assembler estimate', { target: assembler.id, laboratory: laboratory.id, slot: slot }).then(function(data) {
		console.log('Assembler estimated blueprint to', data.materials);
		return data.materials;
	});
};

var build = function(slot) {
	return send('assembler build', {
		target: assembler.id,
		laboratory: laboratory.id,
		slot: slot,
		store: store.id
	}).then(function(data) {
		console.log('Assembler has built ' + JSON.stringify(data.object, null, '	'));
		return report2object(data.object);
	});
};

