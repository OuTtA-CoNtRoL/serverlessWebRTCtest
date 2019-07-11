document.addEventListener("DOMContentLoaded",() => {
	console.log("Welcome");
	out = document.getElementById("out");
	input = document.getElementById("senden");
	base = document.getElementById("base");
	nameSender = document.getElementById("name");
	nameSender.addEventListener("change", evt => {
		commObj.name = nameSender.value;
		addMessage('debug', 'DEBUG', "Name set to: " + nameSender.value);
		requestAnimationFrame(() => nameSender.value="");
		updateCommObj();
	});
	out.innerText += "Welcome";
	setupRTC();
});
var rtc;
var dataChannel;
var commObj = {sdp:[], ice:[], name};
var foreignCommObj;
var updateCommObj;
var out;
var input;
var base;
var nameSender;
var nameReceiver = "";
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
	if (!document.location.hash) {
		dataChannel = rtc.createDataChannel("ch1");
		setupDataChannel();
		updateCommObj = function() {
			base.value = document.location.origin + document.location.pathname + "#" + btoa(JSON.stringify(commObj));
		}
		rtc.createOffer()
			.then(offer => rtc.setLocalDescription(offer))
			.then(() => {
				commObj.sdp.push(rtc.localDescription);
				updateCommObj();
			});
		input.addEventListener("change", e => {
			foreignCommObj = JSON.parse(atob(e.target.value));
			applyForeignObj(foreignCommObj);
		});
	} else {
		foreignCommObj = JSON.parse(atob(document.location.hash.slice(1)));
		applyForeignObj(foreignCommObj);
		commObj.name = 'Default client';
		addMessage('debug', 'DEBUG', "Name set to: Default client");
		updateCommObj = function() {
			addMessage('debug', 'DEBUG', btoa(JSON.stringify(commObj)));
		}
		rtc.createAnswer()
			.then(answer => rtc.setLocalDescription(answer))
			.then(() => {
				commObj.sdp.push(rtc.localDescription);
				updateCommObj();
			});
		rtc.ondatachannel = e => {
			dataChannel = e.channel;
			setupDataChannel();
		};
	}
}

function applyForeignObj(foreignObj) {
	foreignObj.sdp.forEach(sdp => rtc.setRemoteDescription(sdp));
	foreignObj.ice.forEach(ice => rtc.addIceCandidate(ice));
	nameReceiver = foreignObj.name;
}

function setupDataChannel() {
	dataChannel.onopen = e => {
		addMessage('debug', 'DEBUG', "Connection established!");
		console.log(e);
		requestAnimationFrame(() => input.value="");
		nameSender.disabled = true;
		requestAnimationFrame(() => nameSender.value="");
	}
	dataChannel.onclose = e => {
		addMessage('debug', 'DEBUG', "Connection closed!");
		console.log(e);
	}
	dataChannel.onerror = e => {
		addMessage('debug', 'DEBUG', "Error!");
		console.log(e);
	}
	dataChannel.onmessage = e => {
		addMessage('answer', nameReceiver, e.data);
	}
	input.addEventListener("change", evt => {
		dataChannel.send(evt.target.value);
		addMessage('written', commObj.name, evt.target.value);
		requestAnimationFrame(() => input.value="");
	});
}

function addMessage(type, name, message){
	var output = document.getElementById("chat").innerHTML;
	
	output += '\n\t\t\t<div class = "' + type + '">';
	output += '\n\t\t\t\t<div class = "name">' + name;
	output += '\n\t\t\t\t\t<div class = "time">' + getTime() + '</div>';
	output += '\n\t\t\t\t</div>';
	output += '\n\t\t\t\t<div class = "message">' + message + '</div>';
	output += '\n\t\t\t</div>';
	document.getElementById("chat").innerHTML = output;
	window.scrollTo(0, document.body.scrollHeight);
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

function copyLink() {
	if ((commObj.name == undefined) || (commObj.name == '')) {
		commObj.name = 'Default client';
		addMessage('debug', 'DEBUG', "Name set to: Default client");
		updateCommObj();
	}
	base.select();
	document.execCommand('copy');
	addMessage('debug', 'DEBUG', "Copied Base64-Link to clipboard!");
}

function reset() {
	window.location.href = document.location.origin + document.location.pathname;
}