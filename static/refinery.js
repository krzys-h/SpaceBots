
var refine = function(material) {
	material = common.get(material);
	return send('refinery refine', { target: refinery.id, store: store.id, material: material.id }).then(function(data) {
		return data.refined;
	});
};
