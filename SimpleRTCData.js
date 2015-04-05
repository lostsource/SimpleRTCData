/* global RTCSessionDescription, RTCIceCandidate */
'use strict';

function SimpleRTCData(inServers,inConstraints) {
    // this is set to 'offer' or 'answer' depending on call to getOffer or getAnswer
    var inMode = null; 

    function getRTCConnection() {
        var servers = inServers;
        var constraints = inConstraints || {
            optional: [
                {
                    DtlsSrtpKeyAgreement: true
                }
            ]
        };

        window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;

        return new window.RTCPeerConnection(servers,constraints);
    }

    var ChannelEventHandlers = {};
    var Connection = getRTCConnection();
    var DataChannel = null;

    function forwardEventToHandler(evName,context,event) {
        if(typeof(ChannelEventHandlers[evName]) === 'undefined') {
            // no event handlers
            return true;
        }

        for(var x = 0; x < ChannelEventHandlers[evName].length; x++) {
            ChannelEventHandlers[evName][x].apply(context,[event]);
        }
    }

    function registerChannelEvent(channel,evName) {
        channel.addEventListener(evName,function(e){
            forwardEventToHandler(evName,this,e);
        });
    }

    function registerChannelEvents(channel) {
        var handledEvents = ['open','close','error','message'];
        for(var x = 0; x < handledEvents.length; x++) {
            registerChannelEvent(channel,handledEvents[x]);
        }
    }

    function getSDPCopy(detail) {
      // we need to do this separately as Chrome Dev 43 fails to stingify
      return { 
        type: detail.type,
        sdp: detail.sdp
      };
    }
    
    function getCandidateCopy(detail) {
      return {
        candidate: detail.candidate, 
        sdpMid: detail.sdpMid,
        sdpMLineIndex: detail.sdpMLineIndex
      };
    }

    Connection.ondatachannel = function(e) {
        registerChannelEvents(e.channel);
    };

    this.getOffer = function(callback) {
        if(inMode !== null) {
            throw new Error('getOffer cannot be called with getAnswer');
        }

        inMode = 'offer';

        if(typeof(callback) !== 'function') {
            throw new Error('getOffer requires first argument to be a callback');
        }
        

        var didCallback = false;
        var iceList = [];
        var offerSDP = null;


        DataChannel = Connection.createDataChannel(
            'SimpleRTCDataChannel',
            {reliable: true, ordered:true}
        );

        registerChannelEvents(DataChannel);

        function doCallback(offerSDP,iceList) {
            if(didCallback) {
                // make sure callback is only fired once
                return false;
            }

            didCallback = true;
            
            callback(
                JSON.stringify({
                    sdp: getSDPCopy(offerSDP),
                    icecandidates: iceList
                })
            );
        }

        Connection.onicecandidate = function(e) {
            /// FIXME we're assuming last candidate is null, callback might never be called or called to early
            if(e.candidate) {
                iceList.push(getCandidateCopy(e.candidate));
            }
            else {
                doCallback(offerSDP,iceList);
            }
        };

        Connection.createOffer(function(inOfferSDP){
            Connection.setLocalDescription(inOfferSDP,
                function(){}, // we ignore success callback as we need to wait for ice candidates
                function(){
                    // failed to set local description
                    doCallback(null);
                }
            );

            offerSDP = inOfferSDP;
        }, function(){
            // createOffer failed
            doCallback(null);
        });
    };

    this.setAnswer = function(answer) {
        if(typeof(answer) === 'string') {
            try {
                answer = JSON.parse(answer);
            }
            catch(e){
                throw new Error('setAnswer: Invalid answer, this should be the result of a call to getAnswer');
            }
        }
        else {
            throw new Error('setAnswer: Argument 1 must be the result of a call to getAnswer');
        }        

        var remoteSDP = new RTCSessionDescription(answer.sdp);
        Connection.setRemoteDescription(remoteSDP,function(){

            // add ice candidates
            for(var x = 0; x < answer.icecandidates.length; x++) {
                var rtcCand = new RTCIceCandidate(answer.icecandidates[x]);
                Connection.addIceCandidate(rtcCand);
            }

        },function(){
            // failed to set remote desc, trigger error TODO
            throw new Error('setAnswer: Failed to setRemoteDescription');
        });
    };

    this.getAnswer = function(offer,callback) {
        if(inMode !== null) {
            throw new Error('getAnswer cannot be called with getOffer');
        }

        inMode = 'answer';

        if(typeof(offer) === 'string') {
            try {
                offer = JSON.parse(offer);
            }
            catch(e){
                throw new Error('getAnswer: Invalid offer, this should be the result of a call to getOffer');
            }
        }
        else {
            throw new Error('getAnswer: Argument 1 must be the result of a call to getOffer');
        }

        if(typeof(callback) !== 'function') {
            throw new Error('getAnswer requires second argument to be a callback');
        }

        var iceList = [];
        var answerSDP = null;
        var didCallback = false;

        function doCallback(answerSDP,iceList) {
            if(didCallback) {
                // make sure callback is only fired once
                return false;
            }

            didCallback = true;

            callback(JSON.stringify({
                sdp: getSDPCopy(answerSDP),
                icecandidates: iceList
            }));
        }

        Connection.onicecandidate = function(e) {
            if(e.candidate) {
                iceList.push(getCandidateCopy(e.candidate));
            }
            else {
                doCallback(answerSDP,iceList);
            }
        };

        var remoteDescriptor = new RTCSessionDescription(offer.sdp);

        Connection.setRemoteDescription(remoteDescriptor,function(){
            Connection.createAnswer(function(inAnswerSDP){
                answerSDP = inAnswerSDP;

                Connection.setLocalDescription(inAnswerSDP,function(){

                    // add ice candidates
                    for(var x = 0; x < offer.icecandidates.length; x++) {
                        var rtcCand = new RTCIceCandidate(offer.icecandidates[x]);
                        Connection.addIceCandidate(rtcCand);             
                    }

                },function(){
                    // failed to set local description
                    doCallback(null);
                })
                ;         
            },function(){
                // failed to createAnswer
                doCallback(null);
            });
        },function(){
            // failed to set remote description
            doCallback(null);
        });
    };

    this.onChannelEvent = function(evName,evHandler) {
        ChannelEventHandlers[evName] = ChannelEventHandlers[evName] || [];
        ChannelEventHandlers[evName].push(evHandler);
    };
}