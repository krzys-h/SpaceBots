
var planet_takeover = function(planet, energy) {
	planet = common.get(planet);
	return send('planet takeover', { target: planet.id, energy_source: battery.id, energy: energy }).then(function(data) {
		onscreen_console.log("Planet takeover successful, now has "+data.planet_energy+" energy");
		battery.battery_energy -= data.used_energy;
		planet.planet_energy = data.planet_energy;
		return data.planet_energy;
	});
};
