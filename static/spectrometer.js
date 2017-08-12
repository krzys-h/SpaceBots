
var spectrometer_scan = function(material) {
	material = common.get(material);
	return send('spectrometer scan', { target: spectrometer.id, material: material.id }).then(function(data) {
		var details = document.getElementById(spectrometer.id);
		if (details) {
			var results = details.querySelector('.results');
			while (results.hasChildNodes())
				results.removeChild(results.lastChild);

			results.appendChild(document.createTextNode('Resource composition of '+material.id+':'));
			results.appendChild(document.createElement('br'));

			var max = 0;
			var sum = 0;
			for(var i = 0; i < 100; ++i) {
				max = Math.max(max, data.composition[i]);
				sum += data.composition[i];
			}
			results.appendChild(draw_composition(data.composition, max));
			results.appendChild(document.createElement('br'));

			var desc = 'Contains ' + Math.round(sum) + ' resources';
			results.appendChild(document.createTextNode(desc));
		}

		return data.composition;
	});
};
