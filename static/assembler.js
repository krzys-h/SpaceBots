
var estimate = function(slot) {
	return send('assembler estimate', { target: assembler.id, laboratory: laboratory.id, slot: slot }).then(function(data) {
		var details = document.getElementById(assembler.id);
		if (details) {
			var results = details.querySelector('.results');
			while (results.hasChildNodes())
				results.removeChild(results.lastChild);

			onscreen_console.log("Assembler estimated blueprint");

			results.appendChild(document.createTextNode('Assembler estimated blueprint to:'));
			results.appendChild(document.createElement('br'));

			var max = 0;
			var sum = 0;
			for (var i = 0; i < 100; ++i) {
				max = Math.max(max, data.materials[i]);
				sum += data.materials[i];
			}
			results.appendChild(draw_composition(data.materials, max));
			results.appendChild(document.createElement('br'));

			var desc = '(' + Math.round(sum) + ' resources)';
			results.appendChild(document.createTextNode(desc));
		}

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
		onscreen_console.log('Assembler has built ' + JSON.stringify(data.object, null, '	'));
		return report2object(data.object);
	});
};

