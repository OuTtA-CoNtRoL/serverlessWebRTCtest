document.addEventListener('DOMContentLoaded', () => {
	// Get HTML-Elements
	out = document.getElementById('out');
	input = document.getElementById('senden');
	base = document.getElementById('base');
	baseLink = document.getElementById('baseLink');
	nameSender = document.getElementById('name');
	debug = document.getElementsByClassName('debug');
	debugText = document.getElementById('hideDebugText');
	debugCheckBox = document.getElementById('hideDebug');
	// Set name
	nameSender.addEventListener('change', evt => {
		commObj.name = nameSender.value;
		addMessage('info', 'INFO', 'Name set to: ' + nameSender.value);
		requestAnimationFrame(() => nameSender.value='');
		updateCommObj();
	});
	// Generate ID and randomName
	clientID =  Math.random().toString(36).substr(2, 9);
	randomName = '#'+(Math.random()*0xFFFFFF<<0).toString(16);
	// Send messages
	input.addEventListener('change', evt => {
		var counter = 0;
		connections.forEach(function(e) {
			try {
				e.dataChannel.send(evt.target.value);
			} catch(e) {
				connections.splice(getIndexFromID(e.id), 1);
				counter--;
			}
			counter++;
		});
		addMessage('written', commObj.name, evt.target.value);
		requestAnimationFrame(() => input.value = '');
	});
	// Prepare RTC-Connection
	setupRTC();
	console.log('Welcome');
	out.innerText += 'Welcome';
});

var rtc;
var controlChannel;
var dataChannel;
var commObj = {sdp:[], ice:[], id:'', name:'',};
var foreignCommObj;
// List with all connections
var connections = [];
var out;
var input;
// Base html-input
var base;
var baseLink;
// Names
var nameSender;
var nameReceiver = '';
var randomName;
// Debug
var debug;
var debugText;
var debugCounter = 0;
var debugCheckBox;
// IDs
var lastAddID;
var clientID;
var foreignClientID;
// List with Base64-Codes for the new client
var baseOfferList = [];
// List with Base64-Codes from the new client
var baseAnswerList = [];

//////////////////////////////////// Main-Functions ////////////////////////////////////
// Set up the Stun-Server, get the ICE-Candidate and update the commObj
function setupRTC() {
	rtc = new RTCPeerConnection({
		iceServers:[
			{
				urls:[
					"stun:stun1.l.google.com:19302",
					"stun:stun1.l.google.com:19305",
					"stun:stun2.l.google.com:19302",
					"stun:stun2.l.google.com:19305",
					"stun:stun3.l.google.com:19302",
					"stun:stun3.l.google.com:19305",
					"stun:stun4.l.google.com:19302",
					"stun:stun4.l.google.com:19305",
					"stun:stun.services.mozilla.com",
					"stun:stun.stunprotocol.org:3478"
				]
			}
		]
	});
	rtc.onicecandidate = e => {
		if (e.candidate) commObj.ice.push(e.candidate);
		updateCommObj();
	}
	commObj.id = clientID;
}

// Create RTC-Offer
function createOffer() {
	// Create two channels one for control and one for data (chat)
	controlChannel = rtc.createDataChannel('controlChannel');
	dataChannel = rtc.createDataChannel('dataChannel');
	rtc.createOffer()
		.then(offer => rtc.setLocalDescription(offer))
		.then(() => {
			commObj.sdp.push(rtc.localDescription);
			updateCommObj();
		});
}

// Create RTC-Answer
function createAnswer(base) {
	// Convert Base64-Code and parse JSON => apply commObj
	foreignCommObj = JSON.parse(atob(base));
	applyForeignObj(foreignCommObj);
	// If no name is set we choose a random one
	if (commObj.name == null) {	
		commObj.name = 'Client' + randomName;
		addMessage('info', 'INFO', 'Name set to: Client' + randomName);
	}
	rtc.createAnswer()
		.then(answer => rtc.setLocalDescription(answer))
		.then(() => {
			commObj.sdp.push(rtc.localDescription);
			updateCommObj();
		});
	// Wait until both channels are created and then add the connection to the connections array
	rtc.ondatachannel = e => {
		if (e.channel.label == 'controlChannel') {
			controlChannel = e.channel;
		} else {
			dataChannel = e.channel;
		}
		addToConnectionsArray();
	};
}

// Set RTC-Remote and RTC-ICE-Candidate
function applyForeignObj(foreignObj) {
	foreignObj.sdp.forEach(sdp => rtc.setRemoteDescription(sdp));
	foreignObj.ice.forEach(ice => rtc.addIceCandidate(ice));
	// Set partner ID and name
	foreignClientID = foreignObj.id;
	nameReceiver = foreignObj.name;
}

// Update the HTML-Elements with the newest Base64-Code
function updateCommObj() {
	base.value = btoa(JSON.stringify(commObj));
	baseLink.value = document.location.origin + document.location.pathname + "#" + btoa(JSON.stringify(commObj));
	addMessage('debug', 'DEBUG', 'New Base64-Code created!');
}

// Set up events
function setupControlChannel(coChannel, id) {
	coChannel.onopen = e => {
		console.log(e);
	}
	coChannel.onclose = e => {
		connections.splice(getIndexFromID(id), 1);
		console.log(e);
	}
	coChannel.onerror = e => {
		connections.splice(getIndexFromID(id), 1);
		console.log(e);
	}
	coChannel.onmessage = e => {
		if (e.data == 'GET: OFFER-BASE') {
			// Create a new offer and send the new Base64-Code
			createOffer();
			coChannel.send('OFFER-BASE: ' + base.value);
		} else if (e.data.startsWith('OFFER-BASE: ')) {
			// Add OFFER-BASE to the baseOfferList
			baseOfferList.push(e.data.slice(12));
		} else if (e.data.startsWith('JOIN: ')) {
			// Create a new answear and send the new Base64-Code
			createAnswer(e.data.slice(6));
			coChannel.send('ANSWER-BASE: ' + base.value);
		} else if (e.data.startsWith('ANSWER-BASE: ')) {
			/// PLEASE CHANGE THIS ///
			// Add ANSWER-BASE to the baseAnswerList
			baseAnswerList.push(e.data.slice(13));
		} else if (e.data.startsWith('ADD: ')) {
			// Add a new connection
			addToConnectionsArrayBase(e.data.slice(5));
			/// PLEASE CHANGE THIS ///
			createOffer();
		}
		console.log(e.data);
	}
}

// Set up events
function setupDataChannel(daChannel, name) {
	daChannel.onopen = e => {
		addMessage('info', 'INFO', 'Connection established!');
		console.log(e);
		requestAnimationFrame(() => input.value = '');
		nameSender.disabled = true;
		requestAnimationFrame(() => nameSender.value = '');
	}
	daChannel.onclose = e => {
		addMessage('info', 'INFO', 'Connection closed!');
		console.log(e);
	}
	daChannel.onerror = e => {
		addMessage('info', 'INFO', 'Error!');
		console.log(e);
	}
	daChannel.onmessage = e => {
		// Add the message to the chat-html-element
		addMessage('answer', name, e.data);
	}
}

// Check if both channels are ready, add it to the Connections-Array and set up the Event-Listeners
function addToConnectionsArray() {
	if (controlChannel != null && dataChannel != null) {
		var userInfo = {rtc:rtc, controlChannel:controlChannel, dataChannel:dataChannel, id:foreignClientID, name:nameReceiver};
		// reset global vars for possible new connections
		controlChannel = null;
		dataChannel = null;
		connections.push(userInfo);
		// Set up listeners
		setupControlChannel(connections[connections.length - 1].controlChannel, connections[connections.length - 1].id);
		setupDataChannel(connections[connections.length - 1].dataChannel, connections[connections.length - 1].name);
		setupRTC();
	}
}

// Add a foreign Base64-Code to the Connections-Array and set up the Event-Listeners
function addToConnectionsArrayBase(base) {
	foreignCommObj = JSON.parse(atob(base));
	applyForeignObj(foreignCommObj);
	var userInfo = {rtc:rtc, controlChannel:controlChannel, dataChannel:dataChannel, id:foreignClientID, name:nameReceiver};
	connections.push(userInfo);
	// Set up listeners
	setupControlChannel(connections[connections.length - 1].controlChannel, connections[connections.length - 1].id);
	setupDataChannel(connections[connections.length - 1].dataChannel, connections[connections.length - 1].name);
	// Set a global var for the newest user
	lastAddID = connections[connections.length - 1].id;
	//startFullMesh();
	setupRTC();
}

// Add message to the HTML-Element chat
function addMessage(type, name, message){
	var output = document.getElementById('chat').innerHTML;
	var setVis = 'display:block';
	// Hide debug-messages and count them
	if (type == 'debug') {
		debugCounter++;
		debugText.innerText = 'Hide debug (' + debugCounter + ')';
		if (debugCheckBox.checked == true) {
			setVis = 'display:none';
		}
	}
	output += '\n\t\t\t<div class = "' + type + '" style = "' + setVis + '">';
	output += '\n\t\t\t\t<div class = "name">' + name;
	output += '\n\t\t\t\t\t<div class = "time">' + getTime() + '</div>';
	output += '\n\t\t\t\t</div>';
	output += '\n\t\t\t\t<div class = "message">' + message + '</div>';
	output += '\n\t\t\t</div>';
	document.getElementById('chat').innerHTML = output;
	window.scrollTo(0, document.body.scrollHeight);
}
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Main-Functions !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

//////////////////////////////////// Mesh-Setup ////////////////////////////////////
function startFullMesh() {
	if (connections.length > 1) {
		//fetchBaseList();
		///NEEDS TO BE CHANGED - ONLY FOR TESTING///
		//sleep(1000);
		var counter = 0;
		connections.forEach(function(e) {
			if (e.id != lastAddID) {
				connections[getIndexFromID(lastAddID)].controlChannel.send('JOIN: ' + baseOfferList[counter]);
				console.log('JOIN: ' + baseOfferList[counter]);
				counter++;
			}
		});
		/*sleep(2000);
		counter = 0;
		connections.forEach(function(e) {
			if (e.id != lastAddID) {
				e.controlChannel.send('ADD: ' + baseAnswerList[counter]);
				console.log('ADD: ' + baseAnswerList[counter]);
				counter++;
			}
		});*/
	}
}
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Mesh-Setup !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

//////////////////////////////////// helpful functions ////////////////////////////////////
function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

// Add zeros in certain situations (e.g. time - 9:3 => 09:03)
function fixDigits(time) {
    time = ('0' + time).slice(-2);
    return time;
}

// Get time with fixed digits (see fixDigits())
function getTime() {
	var today = new Date();
	var time = fixDigits(today.getHours()) + ':' + fixDigits(today.getMinutes()) + ':' + fixDigits(today.getSeconds());
	return time;
}

// Get the current date
function getDate() {
	var today = new Date();
	var date = today.getDate() + '.' + (today.getMonth() + 1) + '.' + today.getFullYear();
	return date;
}

// Get an index from the connections-list based on an ID
function getIndexFromID(id) {
	var counter = 0;
	var result = -1;
	connections.forEach(function(e) {
		if (e.id == id) {
			result = counter;
		}
		counter++;
	});
	return result;
}
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! helpful functions !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

//////////////////////////////////// Control-Commands ////////////////////////////////////
// Make a list with all connections without the newest participant
function fetchBaseList() {
	baseOfferList = [];
	connections.forEach(function(e) {
		if (e.id != lastAddID) {
			e.controlChannel.send('GET: OFFER-BASE');
		}
	});
}
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Control-Commands !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

//////////////////////////////////// Button-Functions ////////////////////////////////////
// Copy a Base64-Code as a link into the clipboard
function copyLink() {
	if ((commObj.name == undefined) || (commObj.name == '')) {
		commObj.name = 'Client' + randomName;
		addMessage('info', 'INFO', 'Name set to: Client' + randomName);
		updateCommObj();
	}
	baseLink.select();
	document.execCommand('copy');
	addMessage('info', 'INFO', 'Copied Base64-Link to clipboard!');
}

// Copy a Base64-Code into the clipboard
function copyBase() {
	if ((commObj.name == undefined) || (commObj.name == '')) {
		commObj.name = 'Client' + randomName;
		addMessage('info', 'INFO', 'Name set to: Client' + randomName);
		updateCommObj();
	}
	base.select();
	document.execCommand('copy');
	addMessage('info', 'INFO', 'Copied Base64-Code to clipboard!');
}

// Start a new connection as the first user
function singleStart() {
	setupRTC();
	createOffer();
}

// Join a chat with a Base64-Offer-Code
function join() {
	var promptInput = prompt('Enter Base64-Code');
	createAnswer(promptInput);
}

// Add a user with a Base64-Answer-Code
function addUser() {
	var promptInput = prompt('Enter Base64-Code');
	addToConnectionsArrayBase(promptInput);
	///PLEASE CHANGE THIS///
	createOffer();
	//fetchBaseList();
}

// Reset all connections and reload the page
function reset() {
	window.location.href = document.location.origin + document.location.pathname;
}

// Hides all elements which are declared as debug-messages
function hideDebug() {
	for (var i = 0; i < debug.length; i++) {
		if (debugCheckBox.checked == true) {
			debug[i].style.display = 'none';
		} else {
			debug[i].style.display = 'block';
		}
	}
}
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Button-Functions !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!