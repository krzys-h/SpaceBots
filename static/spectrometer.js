
var spectrometer_scan = function(material) {
	material = common.get(material);
	return send('spectrometer scan', { target: spectrometer.id, material: material.id }).then(function(data) {
		return data.composition;
	});
};
