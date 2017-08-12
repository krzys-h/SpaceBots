
var reactor_burn = function(resource, target_resource, amount) {
	console.log("burn "+resource+" "+target_resource+" "+amount);
	return send('reactor burn', { target: burning_reactor.id, store: store.id, battery: battery.id, resource: resource, target_resource: target_resource, amount: amount }).then(function() {
		store.store_stored[resource] -= amount;
		store.store_stored[target_resource] += amount;
	});
};

var reactor_enrich = function(resource, target_resource, amount) {
	console.log("enrich "+resource+" "+target_resource+" "+amount);
	return send('reactor enrich', { target: enriching_reactor.id, store: store.id, battery: battery.id, resource: resource, target_resource: target_resource, amount: amount }).then(function() {
		store.store_stored[resource] -= amount;
		store.store_stored[target_resource] += amount;
	});
};
