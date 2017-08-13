
var battery_move = function(from_battery, amount) {
	from_battery = common.get(from_battery);
	amount = amount || from_battery.battery_energy;
	return send('battery move', { target: store.id, battery: from_battery.id, energy: amount }).then(function(data) {
		battery.battery_energy += amount;
		from_battery.battery_energy -= amount;
		return data;
	});
};
