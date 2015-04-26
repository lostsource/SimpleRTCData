/* global  window, SimpleRTCData, console */
'use strict';

window.addEventListener('load', function() {
	var pageHeading = document.getElementById('libTitle');
	var leftTitle = document.getElementById('titleCont');
	var sloganCont = document.getElementById('sloganCont');
	var summaryElm = document.getElementById('summary');
	var browserSupported = true;

	if(!SimpleRTCData().isSupported()) {
		document.getElementById('browserNotSupported').style.display = "block";
		browserSupported = false;
	}

	function updateHeaderPosition(force) {
		if((sloganCont.style.position === "fixed") || (force)) {

			var sloganWidth = sloganCont.offsetWidth;
			var fromLeft = Math.floor((document.body.offsetWidth-sloganWidth)/2);
			sloganCont.style.left = fromLeft+"px";
		}		
	}

	function fixHeader() {
		updateHeaderPosition(true);
		sloganCont.style.top = "0px";
		sloganCont.style.position = "fixed";

		summaryElm.style.marginTop = '60px';
	}

	function releaseHeader() {
		sloganCont.style.position = "relative";		

		summaryElm.style.marginTop = '15px';
		sloganCont.style.left = "0px";
	}

	function updateUIByScroll() {
		
		var opacity = (1-(window.scrollY/100));
		if(opacity < 0) {
			opacity = 0;
		}
		else if(opacity > 1) {
			opacity = 1;
		}

		pageHeading.style.opacity = opacity;

		if(window.scrollY >= 115) {
			sloganSpan.style.right = "20px";
			leftTitle.style.opacity = 1;
//			leftTitle.style.top = "0px";
			sloganSpan.setAttribute('data-istoright','true');
			fixHeader();
		}
		else {
			sloganSpan.style.right = getSloganRight()+"px";
			leftTitle.style.opacity = 0;
//			leftTitle.style.top = "-40px";
			sloganSpan.setAttribute('data-istoright','false');
			releaseHeader();
		}

	}

	var sloganRight = null;

	function getSloganRight() {
		if(sloganRight) {
			return sloganRight;
		}
		var sloganContainer = sloganSpan.parentNode;
		sloganRight = Math.floor((sloganContainer.offsetWidth-sloganSpan.offsetWidth)/2);
		return sloganRight;
	}

	var sloganElm = document.getElementById('slogan');
	var sloganSpan = sloganElm;

	sloganElm.style.right = getSloganRight()+"px";
	sloganElm.style.visibility = "visible";

	window.addEventListener('scroll',function(){
		updateUIByScroll();
	});

	window.addEventListener('resize',function(){
		updateHeaderPosition();
	});


	updateUIByScroll();

	function showCode (readyCB, container, message, index) {    
		setTimeout(function(){
			container.appendChild(document.createTextNode(message));
			readyCB();
		},250);
	}

	function handleSessionClose() {
		var elm = document.getElementById('sessionClosed');
		elm.style.width = document.body.offsetWidth+"px";		
		elm.style.height = window.screen.height+"px";		
		elm.style.display = "block";

		window.addEventListener('resize', function() {
			elm.style.width = document.body.offsetWidth+"px";		
			elm.style.height = window.screen.height+"px";		
		});

		document.getElementById('reloadLink').onclick = function() {
			window.location.reload();
		}
	}

	function dimTextAreas() {
		var tareas = document.querySelectorAll('textarea');
		for(var x = 0; x < tareas.length; x++) {
			tareas[x].style.color = '#aaaaaa';
		}
	}

	var code = {
		bertsOffer: "var BertRTC = new SimpleRTCData;\nBertRTC.getOffer(function(offer) {\n  // 'offer' has to be sent to Ernie\n});",
		erniesAnswer: "var ErnieRTC = new SimpleRTCData;\n\nErnieRTC.on('data',function(data) {\n  // get ready for messages from Bert \n  console.log(data);\n});\n\nErnieRTC.getAnswer(offer,function(answer) {\n  // 'answer' has to be sent to Bert\n});",
		bertSetAnswer: "BertRTC.on('connect',function(){\n  // Bert's ready to send messages\n\n});\n\nBertRTC.setAnswer(answer);"
	};

	var BertRTC = null, ErnieRTC = null;
	var CreatingOffer = false, CreatingAnswer = false, SettingAnswer = false;

	var elmBertWindow = document.getElementById('bertWindow');
	var elmErnieWindow = document.getElementById('ernieWindow');

	var elmBertsOffer = document.getElementById('bertsOffer');
	var elmErniesAnswer = document.getElementById('erniesAnswer');
	var elmCreateOffer = document.getElementById('bttCreateOffer');

	var elmCreateAnswer = document.getElementById('bttCreateAnswer');
	var elmOfferResult = document.getElementById('bertsOfferResult');
	var elmErnieOfferHolder = document.getElementById('ernieOfferHolder');
	
	var elmErnieAnswerHolder = document.getElementById('ernieAnswerHolder');
	
	var elmBertsAnswerGuide = document.getElementById('bertsAnswerGuide');
	var elmBertsAnswerHolder = document.getElementById('bertsAnswerHolder');
	var elmBertSetAnswer = document.getElementById('bertSetAnswer');

	var elmBertSendMsgPrefix = document.getElementById('bertSendMessagePrefix');
	var elmBertSendMsgPostfix = document.getElementById('bertSendMessagePostfix');
	var elmBertMsgNpt = document.getElementById('msgSender');
	var elmErnieMsgNpt = document.getElementById('ernieMsgSender');

	var elmMsgReceiver = document.getElementById('msgReceiver');
	var elmBertMsgReceiver = document.getElementById('bertMsgReceiver');

	var elmErnieSendMsgPrefix = document.getElementById('ernieSendMessagePrefix');
	var elmErnieSendMsgPostfix = document.getElementById('ernieSendMessagePostfix');

	var elmBertMsgSender = document.getElementById('bertSendMsg');


	// firefox does not reset button states and textarea contents after refresh
	elmCreateOffer.disabled = false; 
	elmErnieOfferHolder.value = '';
	elmBertsAnswerHolder.value = '';
	elmErnieAnswerHolder.value = '';
	elmOfferResult.value = '';

	if(!browserSupported) {
		elmCreateOffer.disabled = true;
		elmErnieOfferHolder.disabled = true;
		elmBertWindow.classList.add("inactive");
		elmErnieWindow.classList.add("inactive");
	}

	elmBertMsgNpt.addEventListener('keydown',function(e){
		if(e.keyCode === 13) {
			BertRTC.send(this.value,function(){
				elmBertMsgNpt.value = '';
			});
		}
	});

	elmErnieMsgNpt.addEventListener('keydown',function(e){
		if(e.keyCode === 13) {
			ErnieRTC.send(this.value,function(){
				elmErnieMsgNpt.value = '';	
			});
		}
	});



	elmCreateOffer.addEventListener('click',function(){
		if(CreatingOffer) {
			return false;
		}
		CreatingOffer = true;

		elmBertsOffer.innerHTML = '';

		showCode(function(){
			BertRTC = new SimpleRTCData();
			BertRTC.on('connect', function() {
				console.log("%cBert:  on('connect')", "color:blue");
				dimTextAreas();
			});

			BertRTC.on('disconnect', function() {
				console.log("%cBert:  on('disconnect')", "color:blue");

				handleSessionClose();
			});


			BertRTC.on("data", function() {
				console.log("%cBert:  on('data')", "color:blue");
			});

			var bertConn = BertRTC.getConnection();

			BertRTC.onConnectionEvent('*',function(e){
				console.log("%cBert:  onConnectionEvent ["+e.type+"]", "color:blue",
					"iceConnectionState="+bertConn.iceConnectionState,
					"iceGatheringState="+bertConn.iceGatheringState,
					"signalingState="+bertConn.signalingState
				);
			});					

			BertRTC.onChannelEvent('*',function(e){
				console.log("%cBert:  onChannelEvent ["+e.type+"]", "color:blue");
			});					

			BertRTC.on('data',function(data) {
				elmBertMsgReceiver.innerHTML = '';
				elmBertMsgReceiver.appendChild(document.createTextNode(data));
				elmBertMsgReceiver.style.opacity = 1;

				// get ready for messages from Bert 
//				elmMsgReceiver.innerHTML = '';
//				elmMsgReceiver.appendChild(document.createTextNode(data));
//				elmMsgReceiver.style.opacity = 1;

				elmBertWindow.addEventListener('transitionend',function(e){
					if(e.propertyName === "height") {
						elmBertMsgSender.style.visibility = "visible";
						elmBertWindow.style.overflow = "visible";


						/*
						setTimeout(function() {

							elmErnieSendMsgPrefix.style.visibility = "visible";
							elmErnieSendMsgPrefix.style.backgroundColor = 'transparent';
							elmErnieSendMsgPostfix.style.visibility = "visible";
							elmErnieSendMsgPostfix.style.backgroundColor = 'transparent';

							elmErnieMsgNpt.style.left = ((elmBertSendMsgPrefix.offsetLeft+elmBertSendMsgPrefix.offsetWidth)-6)+"px";
							elmErnieMsgNpt.style.backgroundColor = 'transparent';
							elmErnieSendMsgPostfix.style.left = ((elmBertSendMsgPrefix.offsetLeft+elmBertSendMsgPrefix.offsetWidth+elmErnieMsgNpt.offsetWidth))+"px";

							elmErnieMsgNpt.style.visibility = "visible";
							elmErnieMsgNpt.focus();


						},500);
*/
					}
				});

				elmBertWindow.classList.add('messageSender');
			});


			elmBertWindow.classList.add('execWait');
			elmBertWindow.classList.add('waitingForAnswer');

			BertRTC.getOffer(function(bertsOffer) {
				elmOfferResult.value = bertsOffer;
				elmOfferResult.style.opacity = 1;
				elmBertsAnswerGuide.style.opacity = 1;
				elmBertsAnswerHolder.style.opacity = 1;

				elmCreateOffer.disabled = true;
				elmBertWindow.classList.remove('execWait');
			});

		},elmBertsOffer,code.bertsOffer);
	});

	elmBertsAnswerHolder.addEventListener('input',function(){
		if(SettingAnswer) {
			return false;
		}
		SettingAnswer = true;

		var answerVal = this.value.trim();
		// check if it parses as JSON
		try {
			elmBertWindow.classList.add('settingAnswer');
			showCode(function(){
				BertRTC.on('connect',function(){
					dimTextAreas();

					// triggered when we're read to send a message
					elmBertSendMsgPrefix.style.visibility = "visible";
					elmBertSendMsgPrefix.style.backgroundColor = 'transparent';
					elmBertSendMsgPostfix.style.visibility = "visible";
					elmBertSendMsgPostfix.style.backgroundColor = 'transparent';
					elmBertMsgNpt.style.left = (elmBertSendMsgPrefix.offsetLeft+elmBertSendMsgPrefix.offsetWidth)+"px";
					elmBertMsgNpt.style.backgroundColor = 'transparent';
					elmBertSendMsgPostfix.style.left = (elmBertSendMsgPrefix.offsetLeft+elmBertSendMsgPrefix.offsetWidth+elmBertMsgNpt.offsetWidth)+"px";

					elmBertMsgNpt.style.visibility = "visible";
					elmBertMsgNpt.focus();
					elmBertsAnswerHolder.readOnly = true;
					elmBertWindow.classList.remove('execWait');
				});


				elmBertWindow.classList.add('execWait');
				BertRTC.setAnswer(answerVal, function(detail) {
					if(detail.error) {
						console.error(detail.error);
						SettingAnswer = false;

					}
					else {
						if(elmErnieOfferHolder.value.trim().length === 0) {
							elmErnieWindow.classList.add('inactive');
							elmErnieOfferHolder.disabled = true;
						}
					}
				});	

			},elmBertSetAnswer,code.bertSetAnswer);
			
		}
		catch(e){
			console.warn("INVALID ANSWER JSON");
		};
	});

	elmOfferResult.addEventListener('click',function(){
		this.select();
	});

	elmErnieAnswerHolder.addEventListener('click',function(){
		this.select();
	});


	elmCreateAnswer.addEventListener('click',function(){
		if(CreatingAnswer) {
			return false;
		}

		CreatingAnswer = true;

		elmErniesAnswer.innerHTML = '';

		elmErnieWindow.classList.add('writingAnswerCode');

		showCode(function(){

			ErnieRTC = new SimpleRTCData;
			ErnieRTC.on("connect", function() {
				console.log("%cErnie: on('connect')", "color:maroon");
			});

			ErnieRTC.on("disconnect", function() {
				console.log("%cErnie: on('disconnect')", "color:maroon");
				handleSessionClose();
			});


			ErnieRTC.on("data", function() {
				console.log("%cErnie: on('data')", "color:maroon");
			});

			var ErnieConn = ErnieRTC.getConnection();
			ErnieRTC.onConnectionEvent('*',function(e){
				console.log("%cErnie: onConnectionEvent ["+e.type+"]","color:maroon",
					"iceConnectionState="+ErnieConn.iceConnectionState,
					"iceGatheringState="+ErnieConn.iceGatheringState,
					"signalingState="+ErnieConn.signalingState
				);
			});					

			ErnieRTC.onChannelEvent('*',function(e){
				console.log("%cErnie: onChannelEvent ["+e.type+"]","color:maroon");
			});					


			ErnieRTC.onError = function(error) {
				console.warn(error);
			};

			ErnieRTC.on('data',function(data) {
				// get ready for messages from Bert 
				elmMsgReceiver.innerHTML = '';
				elmMsgReceiver.appendChild(document.createTextNode(data));
				elmMsgReceiver.style.opacity = 1;

				elmErnieWindow.addEventListener('transitionend',function(e){
					if(e.propertyName === "height") {
						setTimeout(function() {

							elmErnieSendMsgPrefix.style.visibility = "visible";
							elmErnieSendMsgPrefix.style.backgroundColor = 'transparent';
							elmErnieSendMsgPostfix.style.visibility = "visible";
							elmErnieSendMsgPostfix.style.backgroundColor = 'transparent';

							elmErnieMsgNpt.style.left = ((elmBertSendMsgPrefix.offsetLeft+elmBertSendMsgPrefix.offsetWidth)-6)+"px";
							elmErnieMsgNpt.style.backgroundColor = 'transparent';
							elmErnieSendMsgPostfix.style.left = ((elmBertSendMsgPrefix.offsetLeft+elmBertSendMsgPrefix.offsetWidth+elmErnieMsgNpt.offsetWidth))+"px";

							elmErnieMsgNpt.style.visibility = "visible";
							elmErnieMsgNpt.focus();


						},200);
					}
				});

				elmErnieWindow.classList.add('messageSender');
			});

			elmErnieWindow.classList.add('execWait');
			ErnieRTC.getAnswer(elmErnieOfferHolder.value.trim(),function(erniesAnswer) {
				elmErnieAnswerHolder.value = erniesAnswer;
				elmErnieAnswerHolder.style.opacity = 1;
				elmCreateAnswer.disabled = true;
				elmErnieOfferHolder.readOnly = true;
				elmErnieWindow.classList.remove('execWait');
				elmErnieWindow.classList.add('showingAnswer');

				if(elmOfferResult.value.trim().length === 0) {
					elmBertWindow.classList.add("inactive");
					elmCreateOffer.disabled = true;
				}
			});

		},elmErniesAnswer,code.erniesAnswer);
	});

	elmErnieOfferHolder.addEventListener('input',function(){
		var offerVal = this.value;
		offerVal = offerVal.trim();

		if(offerVal.length > 0) {
			elmCreateAnswer.disabled = false;
		}
		else {
			elmCreateAnswer.disabled = true;
		}
	});
	
});