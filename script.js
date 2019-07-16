document.addEventListener('DOMContentLoaded',() => {
	console.log('Welcome');
	out = document.getElementById('out');
	input = document.getElementById('senden');
	base = document.getElementById('base');
	baseLink = document.getElementById('baseLink');
	nameSender = document.getElementById('name');
	nameSender.addEventListener('change', evt => {
		commObj.name = nameSender.value;
		addMessage('info', 'INFO', 'Name set to: ' + nameSender.value);
		requestAnimationFrame(() => nameSender.value='');
		updateCommObj();
	});
	clientID =  Math.random().toString(36).substr(2, 9);
	randomName = '#'+(Math.random()*0xFFFFFF<<0).toString(16);
	debug = document.getElementsByClassName('debug');
	debugText = document.getElementById('hideDebugText');
	debugCheckBox = document.getElementById('hideDebug');
	out.innerText += 'Welcome';
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
	setupRTC();
});
var rtc;
var controlChannel;
var dataChannel;
var commObj = {sdp:[], ice:[], id:'', name:'',};
var foreignCommObj;
var connections = [];
var out;
var input;
var base;
var baseLink;
var nameSender;
var nameReceiver = '';
var randomName;
var debug;
var debugText;
var debugCounter = 0;
var debugCheckBox;
var clientID;
var foreignClientID;
var baseList = [];
var baseAList = [];
var lastAddID;
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

function createOffer() {
	controlChannel = rtc.createDataChannel('controlChannel');
	dataChannel = rtc.createDataChannel('dataChannel');
	rtc.createOffer()
		.then(offer => rtc.setLocalDescription(offer))
		.then(() => {
			commObj.sdp.push(rtc.localDescription);
			updateCommObj();
		});
}

function createAnswer(base) {
	foreignCommObj = JSON.parse(atob(base));
	applyForeignObj(foreignCommObj);
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
	rtc.ondatachannel = e => {
		if (e.channel.label == 'controlChannel') {
			controlChannel = e.channel;
		} else {
			dataChannel = e.channel;
		}
		addToConnectionsArray();
	};
}

function applyForeignObj(foreignObj) {
	foreignObj.sdp.forEach(sdp => rtc.setRemoteDescription(sdp));
	foreignObj.ice.forEach(ice => rtc.addIceCandidate(ice));
	foreignClientID = foreignObj.id;
	nameReceiver = foreignObj.name;
}

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
			createOffer();
			coChannel.send('OFFER-BASE: ' + base.value);
		} else if (e.data.startsWith('OFFER-BASE: ')) {
			baseList.push(e.data.slice(12));
		} else if (e.data.startsWith('JOIN: ')) {
			createAnswer(e.data.slice(6));
			coChannel.send('ANSWER-BASE: ' + base.value);
		} else if (e.data.startsWith('ANSWER-BASE: ')) {
			///PLEASE CHANGE THIS///
			baseAList.push(e.data.slice(13));
		} else if (e.data.startsWith('ADD: ')) {
			addToConnectionsArrayBase(e.data.slice(5));
			///PLEASE CHANGE THIS///
			createOffer();
		}
		console.log(e.data);
	}
}

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
		addMessage('answer', name, e.data);
	}
}

function addToConnectionsArray() {
	if (controlChannel != null && dataChannel != null) {
		var userInfo = {rtc:rtc, controlChannel:controlChannel, dataChannel:dataChannel, id:foreignClientID, name:nameReceiver};
		controlChannel = null;
		dataChannel = null;
		connections.push(userInfo);
		setupControlChannel(connections[connections.length - 1].controlChannel, connections[connections.length - 1].id);
		setupDataChannel(connections[connections.length - 1].dataChannel, connections[connections.length - 1].name);
		setupRTC();
	}
}

function addToConnectionsArrayBase(base) {
	foreignCommObj = JSON.parse(atob(base));
	applyForeignObj(foreignCommObj);
	var userInfo = {rtc:rtc, controlChannel:controlChannel, dataChannel:dataChannel, id:foreignClientID, name:nameReceiver};
	connections.push(userInfo);
	setupControlChannel(connections[connections.length - 1].controlChannel, connections[connections.length - 1].id);
	setupDataChannel(connections[connections.length - 1].dataChannel, connections[connections.length - 1].name);
	lastAddID = connections[connections.length - 1].id;
	//startFullMesh();
	setupRTC();
}

function updateCommObj() {
	base.value = btoa(JSON.stringify(commObj));
	baseLink.value = document.location.origin + document.location.pathname + "#" + btoa(JSON.stringify(commObj));
	addMessage('debug', 'DEBUG', 'New Base64-Code created!');
}

function addMessage(type, name, message){
	var output = document.getElementById('chat').innerHTML;
	var setVis = 'display:block';
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

function startFullMesh() {
	if (connections.length > 1) {
		//fetchBaseList();
		///NEEDS TO BE CHANGED - ONLY FOR TESTING///
		//sleep(1000);
		var counter = 0;
		connections.forEach(function(e) {
			if (e.id != lastAddID) {
				connections[getIndexFromID(lastAddID)].controlChannel.send('JOIN: ' + baseList[counter]);
				console.log('JOIN: ' + baseList[counter]);
				counter++;
			}
		});
		/*sleep(2000);
		counter = 0;
		connections.forEach(function(e) {
			if (e.id != lastAddID) {
				e.controlChannel.send('ADD: ' + baseAList[counter]);
				console.log('ADD: ' + baseAList[counter]);
				counter++;
			}
		});*/
	}
}

//Control Commands//
function fetchBaseList() {
	baseList = [];
	connections.forEach(function(e) {
		if (e.id != lastAddID) {
			e.controlChannel.send('GET: OFFER-BASE');
		}
	});
}
////////////////////////////////

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function fixDigits(time) {
    time = ('0' + time).slice(-2);
    return time;
}

function getTime() {
	var today = new Date();
	var time = fixDigits(today.getHours()) + ':' + fixDigits(today.getMinutes()) + ':' + fixDigits(today.getSeconds());
	return time;
}

function getDate() {
	var today = new Date();
	var date = today.getDate() + '.' + (today.getMonth() + 1) + '.' + today.getFullYear();
	return date;
}

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

function singleStart() {
	createOffer();
}

function join() {
	var promptInput = prompt('Enter Base64-Code');
	createAnswer(promptInput);
}

function addUser() {
	var promptInput = prompt('Enter Base64-Code');
	addToConnectionsArrayBase(promptInput);
	///PLEASE CHANGE THIS///
	createOffer();
	//fetchBaseList();
}

function reset() {
	window.location.href = document.location.origin + document.location.pathname;
}

function hideDebug() {
	for (var i = 0; i < debug.length; i++) {
		if (debugCheckBox.checked == true) {
			debug[i].style.display = 'none';
		} else {
			debug[i].style.display = 'block';
		}
	}
}