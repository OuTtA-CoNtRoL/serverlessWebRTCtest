document.addEventListener("DOMContentLoaded",()=>{
	console.log("Welcome");
	out = document.getElementById("out");
	input = document.getElementById("senden");
	link = document.getElementById("link");
	out.innerText +="Welcome";
	setupRTC();
});
//console.log("outer hi");
var rtc;
var dataChannel;
var commObj = {sdp:[],ice:[]};
var updateCommObj;
var out;
var input;
var link;
function setupRTC(){
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
	rtc.onicecandidate = e =>{
		commObj.ice.push(e.candidate);
		updateCommObj();
	}
	if(!document.location.hash){
		dataChannel = rtc.createDataChannel("ch1");
		setupDataChannel();
		updateCommObj = function(){
			link.href = document.location.origin + document.location.pathname + "#" + btoa(JSON.stringify(commObj));
		}
		rtc.createOffer()
			.then(offer=>rtc.setLocalDescription(offer))
			.then(()=>{
				commObj.sdp.push(rtc.localDescription);
				updateCommObj();
			});
		input.addEventListener("change",e=>{
			applyForeignObj(JSON.parse(atob(e.target.value)));
		});
	}else{
		var foreignObj = JSON.parse(atob(document.location.hash.slice(1)));
		applyForeignObj(foreignObj);
		updateCommObj = function(){
			//out.innerText+="\n"+btoa(JSON.stringify(commObj))+"\n";
			addDebugMessage(btoa(JSON.stringify(commObj)));
		}
		rtc.createAnswer()
			.then(answer=>rtc.setLocalDescription(answer))
			.then(()=>{
				commObj.sdp.push(rtc.localDescription);
				updateCommObj();
			});
		rtc.ondatachannel = e=>{
			dataChannel = e.channel;
			setupDataChannel();
		};
	}
}
function applyForeignObj(foreignObj){
	foreignObj.sdp.forEach(sdp=>rtc.setRemoteDescription(sdp));
	foreignObj.ice.forEach(ice=>rtc.addIceCandidate(ice));
}
function setupDataChannel(){
	dataChannel.onopen = console.log;
	dataChannel.onclose = console.log;
	dataChannel.onmessage = e =>{
		//out.innerText += "\n<<" + e.data + "\n";
		addReceivedMessage(e.data);
		window.scrollTo(0,document.body.scrollHeight);
	}
	input.addEventListener("change", evt=>{
		dataChannel.send(evt.target.value);
		//out.innerText += "\n>>" + evt.target.value + "\n";
		addSentMessage(evt.target.value);
		window.scrollTo(0,document.body.scrollHeight);
		requestAnimationFrame(()=>input.value="");
	});
}

function addDebugMessage(message){
	var output = document.getElementById("chat").innerHTML;
	var formattedMessage = "";
	var lines = Math.floor(message.length / 52);
	
	for (var l = 0; l <= lines; l++) {
		if (l == lines) {
			formattedMessage += message.substring(l*52,message.length);
		} else {
			formattedMessage += message.substring(l*52,(l+1)*52) + '<br>';
		}
	}
	
	output += '\n\t\t\t<div class = "debug">';
	output += '\n\t\t\t\t<div class = "name">DEBUG';
	output += '\n\t\t\t\t\t<div class = "time">' + getTime() + '</div>';
	output += '\n\t\t\t\t</div>';
	output += '\n\t\t\t\t<div class = "message">' + formattedMessage + '</div>';
	output += '\n\t\t\t</div>';
	document.getElementById("chat").innerHTML = output;
}

function addSentMessage(message){
	var output = document.getElementById("chat").innerHTML;
	var formattedMessage = "";
	var lines = Math.floor(message.length / 80);
	
	for (var l = 0; l <= lines; l++) {
		if (l == lines) {
			formattedMessage += message.substring(l*80,message.length);
		} else {
			formattedMessage += message.substring(l*80,(l+1)*80) + '<br>';
		}
	}
	
	output += '\n\t\t\t<div class = "written">';
	output += '\n\t\t\t\t<div class = "name">Test1';
	output += '\n\t\t\t\t\t<div class = "time">' + getTime() + '</div>';
	output += '\n\t\t\t\t</div>';
	output += '\n\t\t\t\t<div class = "message">' + formattedMessage + '</div>';
	output += '\n\t\t\t</div>';
	document.getElementById("chat").innerHTML = output;
}

function addReceivedMessage(message){
	var output = document.getElementById("chat").innerHTML;
	var formattedMessage = "";
	var lines = Math.floor(message.length / 80);
	
	for (var l = 0; l <= lines; l++) {
		if (l == lines) {
			formattedMessage += message.substring(l*80,message.length);
		} else {
			formattedMessage += message.substring(l*80,(l+1)*80) + '<br>';
		}
	}
	
	output += '\n\t\t\t<div class = "answer">';
	output += '\n\t\t\t\t<div class = "name">Test2';
	output += '\n\t\t\t\t\t<div class = "time">' + getTime() + '</div>';
	output += '\n\t\t\t\t</div>';
	output += '\n\t\t\t\t<div class = "message">' + formattedMessage + '</div>';
	output += '\n\t\t\t</div>';
	document.getElementById("chat").innerHTML = output;
}

function fixDigits(time) {
    time = ('0' + time).slice(-2);
    return time;
}

function getTime(){
	var today = new Date();
	var time = fixDigits(today.getHours()) + ':' + fixDigits(today.getMinutes()) + ':' + fixDigits(today.getSeconds());
	return time;
}

function getDate(){
	var today = new Date();
	var date = today.getDate() + '.' + (today.getMonth() + 1) + '.' + today.getFullYear();
	return date;
}