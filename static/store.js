
var store_move = function(from_store, composition) {
	from_store = common.get(from_store);
	composition = composition || from_store.store_stored;
	return send('store move', { target: store.id, store: from_store.id, composition: composition }).then(function(data) {
		resources.add(store.store_stored, composition);
		resources.subtract(from_store.store_stored, composition);
		return data;
	});
};
