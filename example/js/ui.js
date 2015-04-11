window.addEventListener('load',function(){

	function showCode (readyCB, container, message, index) {    
		// adapted from http://stackoverflow.com/a/7265613/149636 
		if(typeof(index) === "undefined") {
			index = 0;
		}

		if (index < message.length) { 
			container.appendChild(document.createTextNode(message[index++]));
			setTimeout(function () { 
				showCode(readyCB, container, message, index); 
			}, 5); 
		}
		else {
			readyCB();
		} 
	}

	var code = {
		bertsOffer: "var BertRTC = new SimpleRTCData;\nBertRTC.getOffer(function(offer) {\n  // 'offer' has to be sent to Ernie\n});",
		erniesAnswer: "var ErnieRTC = new SimpleRTCData;\n\nErnieRTC.onChannelEvent('message',function(e) {\n  // get ready for messages from Bert \n  console.log(e.data);\n});\n\nErnieRTC.getAnswer(offer,function(answer) {\n  // 'answer' has to be sent to Bert\n});",
		bertSetAnswer: "BertRTC.onChannelEvent('open',function(){\n  // Bert's ready to send messages\n\n});\n\nBertRTC.setAnswer(answer);"
	}

	var BertRTC = null, BertChan = null, ErnieRTC = null;
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

	var elmMsgReceiver = document.getElementById('msgReceiver');

	// firefox keeps does not reset button states and textarea contents after refresh
	elmCreateOffer.disabled = false; 
	elmErnieOfferHolder.value = "";
	elmBertsAnswerHolder.value = "";
	elmErnieAnswerHolder.value = "";
	elmOfferResult.value = "";


	elmBertMsgNpt.addEventListener('keydown',function(e){
		if(!BertChan) {
			return;
		}

		if(e.keyCode === 13) {
			BertChan.send(this.value);
			this.value = "";
		}
	});



	elmCreateOffer.addEventListener('click',function(){
		if(CreatingOffer) {
			return false;
		}
		CreatingOffer = true;

		elmBertsOffer.innerHTML = "";

		showCode(function(){
			BertRTC = new SimpleRTCData;
			BertRTC.on("connect", function(e) {
				console.log("%cBert:  on('connect')", "color:blue");
			});

			BertRTC.on("disconnect", function(e) {
				console.log("%cBert:  on('disconnect')", "color:blue");
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
			var answerObj = JSON.parse(answerVal);
			if(!((answerObj.sdp) && (answerObj.sdp.type === 'answer'))) {
				console.warn("INVALID ANSWER CONTENT");
				return;
			}

			elmBertWindow.classList.add('settingAnswer');
			showCode(function(){
				BertRTC.onChannelEvent('open',function(){
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
					BertChan = this;
					elmBertsAnswerHolder.readOnly = true;
					elmBertWindow.classList.remove('execWait');
				});


				elmBertWindow.classList.add('execWait');
				BertRTC.setAnswer(answerVal, function(detail) {
					if(detail.error) {
						console.warn(detail.error);
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

		elmErniesAnswer.innerHTML = "";

		elmErnieWindow.classList.add('writingAnswerCode');

		showCode(function(){

			ErnieRTC = new SimpleRTCData;
			ErnieRTC.on("connect", function(e) {
				console.log("%cErnie: on('connect')", "color:maroon");
			});

			ErnieRTC.on("disconnect", function(e) {
				console.log("%cErnie: on('disconnect')", "color:maroon");
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
			}

			ErnieRTC.onChannelEvent('message',function(e) {
				// get ready for messages from Bert 
				elmMsgReceiver.innerHTML = "";
				elmMsgReceiver.appendChild(document.createTextNode(e.data));
				elmMsgReceiver.style.opacity = 1;
			});

			elmErnieWindow.classList.add('execWait');
			ErnieRTC.getAnswer(elmErnieOfferHolder.value.trim(),function(erniesAnswer) {
				elmErnieAnswerHolder.value = erniesAnswer;
				elmErnieAnswerHolder.style.opacity = 1;
				elmCreateAnswer.disabled = true;
				elmErnieOfferHolder.readOnly = true;
				elmErnieWindow.classList.remove('execWait');
				elmErnieWindow.classList.add('showingAnswer');
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