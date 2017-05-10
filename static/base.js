// Welcome to SpaceBots, game where robots controlled by AI and human
// players compete to create thriving industry, accumulate resources
// and secure rare and efficient machines.

// This game is meant to be operated from built-in browser
// console. You can invoke it depending on your browser:

// Chrome: Shift + Ctrl + J
// Firefox: Shift + Ctrl + K (you may disable CSS and Network buttons)

// If you have done everything properly, you should be reading the
// same file but from the inside of your browser :)

// These are the commands that most probably brought you here:

console.log('%cWelcome to SpaceBots! For a complete tutorial, navigate to ' +
  '"Elements" tab and click on link to "base.js"', 'font-size: x-large');

// To stop intro message from showing up every time you refresh the
// page, try writing following command into the console:
// localStarage.inhibitIntro = 'true';

// If you set it this way, it will remove #intro element.
if(localStorage.inhibitIntro) {
  document.getElementById('introtext').remove();
} else {
  // Otherwise it will show you the invitation and register click
  // handler to hide it.
  document.getElementById('introtext').textContent =
    'Welcome to SpaceBots! For a complete tutorial, press F12 and navigate to "base.js".';

  document.getElementById('introtext').
  addEventListener('click', function(e) {
    e.target.remove();
  }, false);
}

// Simple isn't it? You have just enabled the 'if' statement a few
// lines upwards from here :D

// You will constantly be using Javascript to learn game mechanics, to
// automate boring chores and to write any tools you like that help
// you in the game.  We will teach you how to do it, don't worry if
// you are a javascript newbie.

// It is a good idea to take at least a short course on javascript
// before reading rest of the source code. This way you will
// understand the basics.  Examples from the code will help you even
// better understand the language.

// The code is filled with excercises so you can really understand
// mechanics governing various parts of the game. In the meantime you
// will learn some really neat programming tricks, so even if you are
// an expert programmer, taking this tutorial will have some benefit.

// Having said all the basics nessessary, we can begin the tour of the
// source code.

// We will start by running custom startup scripts. Initially there
// won't be any of them but you can create them, put them on the
// internet and use them to help you in the game.

// We will use special object called `localStorage` that persists over
// browser sessions. This object is avialable by default but its
// properties might not be set to proper values. If the set of custom
// scripts is undefined, we can set it to empty array:

// Note that we saved our array as a string. LocalStorage can save
// only string values. We will use `JSON.parse` to convert them back
// into usable form.

// There is one important security issue here - the game is played
// over secured https and scripts usually are located on non-secured
// sites. If you want to load them anyway, use appropiate setting in
// your browser. In the case of Chromium this would be:

// chromium --allow-running-insecure-content

// If you are developing local scripts (accessed using file:// instead
// of http://) you can force browser to ignore security restrictions
// by running it with appropiate settings. In the case of Chromium
// this would be:

// chromium --allow-file-access

var run_script = function(data, title) {

  // Create new html element for the script

  var script = document.createElement('script');

  if(title) script.title = title;

  // Set the script to async - it will run when it'll be ready,
  // without blocking the browser.

  script.async = true;

  // Set the url to proper address

  script.src = data;

  // Finally, let's insert our script into the page.

  // This line will actually load and run the script. If you got
  // 404, then probably url you entered in
  // `localStorage.custom_scripts` is down.

  document.body.appendChild(script);

  // After script was run, we can remove it to keep the page
  // clean.
  // This should work even for async scripts that hasn't been
  // yet downloaded.

  // document.body.removeChild(script);
};

// Now we can iterate over all URLs and add them to the website:

(function() {
  var script_set = JSON.parse(localStorage.custom_scripts || '{}');
  for(var name in script_set) {
    run_script(script_set[name]);
  }
})();


// Enough about plugins. Let's get back to the game.

// The next important point in the source code is the logging_in.js file
// Open it now to continue the tour of the source code!




// TODO: clean this up


// Logging function

// On-screen console

(function() {
  var make_logger = function(style, command) {
    return function() {
      var c = document.getElementById('console');
      var m = document.createElement('div');
      if(style) m.classList.add(style);
      var t = Array.prototype.join.call(arguments, ' ');
      m.innerText = t;
      c.appendChild(m);
      setTimeout(function() {
        m.fadeOut();
      }, 3000 + 100 * t.length);
      command.apply(this, arguments);
    }
  };
  console.log = make_logger(null, console.log);
  console.info = make_logger('info', console.info);
  console.warn = make_logger('warn', console.warn);
  console.error = make_logger('error', console.error);
})();

var log = console.log.bind(console);
var error = console.log.bind(error);
var info = console.log.bind(info);
var warn = console.log.bind(warn);


// Extend Element with utility functions...

Element.prototype.fadeOut = function() {
  this.style['-webkit-animation'] = 'slideOut 500ms';
  this.addEventListener('webkitAnimationEnd', function() {
    this.remove();
  });
};

Element.prototype.remove = function() {
  this.parentElement.removeChild(this);
};

NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
  for(var i = 0, len = this.length; i < len; i++) {
    if(this[i] && this[i].parentElement) {
      this[i].parentElement.removeChild(this[i]);
    }
  }
};

NodeList.prototype.text = HTMLCollection.prototype.text = function(text) {
  for(var i = 0, len = this.length; i < len; i++) {
    if(this[i]) {
      this[i].textContent = text;
    }
  }
};

document.addEventListener('mousedown', function(e) {
  if(e.button === 0) {
    if (e.target.classList.contains('run') && e.target.parentNode.classList.contains('command')) {
      var command = e.target.parentNode;

      console.group(command.textContent);
      eval(command.textContent);
      console.groupEnd();

      e.preventDefault();
      e.stopPropagation();
    }
  }
}, false);