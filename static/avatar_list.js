
// After properly logging in, server will send us a list of
// "avatars". They are little machines that can't do anything on their
// own but instead - they rely on controlling other machines. Avatars
// are our only way of controlling the world.

// Although you can have much more than one avatar, the basic
// interface included on this site, allows you to control only one
// of them at a time - later you could extend it to allow control over a
// fleet of avatars or write scripts to utilize additional ones as
// autonomus radios, mining or combat robots.

logged_in = logged_in.then(function (reply) {
	avatar_ids = reply.avatar_list;

	console.log('Retrieved avatar list', avatar_ids);

	if(avatar_ids.length == 0) {
		document.getElementById('death_message').style.display = "block";
		return Promise.reject();
	}

	for(var i = 0; i < avatar_ids.length; i++) {
		// In order to get some basic informations about our avatar, we
		// will issue `report` command. Report will provide information
		// about avatar location, parts that it is connected with and
		// other interesting information.

		reporter.add(avatar_ids[i]);

		var avatarInfo = document.createElement('div');
		avatarInfo.id = 'avatar_'+avatar_ids[i];
		avatarInfo.innerHTML = '<img src=\'/features/avatar.png\'> <a href=\'#'+avatar_ids[i]+'\' style=\'color: #'+avatar_ids[i].substr(0, 6)+';\'>'+avatar_ids[i].substr(0, 6)+'</a>';
		document.getElementById('avatars').appendChild(avatarInfo);
	}

	return Promise.resolve();

});

socket.on('avatar added', function(new_id) {
	onscreen_console.log('New avatar added: '+new_id);
	avatar_ids.push(new_id);

	reporter.add(new_id);

	var avatarInfo = document.createElement('div');
	avatarInfo.id = 'avatar_'+new_id;
	avatarInfo.innerHTML = '<img src=\'/features/avatar.png\'> <a href=\'#'+new_id+'\' style=\'color: #'+new_id.substr(0, 6)+';\'>'+new_id.substr(0, 6)+'</a>';
	document.getElementById('avatars').appendChild(avatarInfo);
});

socket.on('avatar removed', function(lost_id) {
	onscreen_console.warn('Avatar destroyed: '+lost_id);
	avatar_ids.splice(avatar_ids.indexOf(lost_id), 1);
	var avatarInfo = document.getElementById('avatar_'+lost_id);
	if(avatarInfo) {
		avatarInfo.parentNode.removeChild(avatarInfo);
	}
	if(avatar && avatar.id == lost_id) {
		if(avatar_ids.length > 0) {
			avatar = objects[avatar_ids[0]];
			onscreen_console.log("Changed control to avatar: "+avatar.id)
		} else {
			avatar = null;
			document.getElementById('death_message').style.display = "block";
		}
	}
});
