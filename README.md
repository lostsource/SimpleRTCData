# [![SimpleRTCData](http://i.imgur.com/BQpkqkE.png)](#)

SimpleRTCData is a tiny JavaScript library which can be used to establish an RTCDataChannel between two peers. It does not handle relaying of messages during connection setup so a separate signalling mechanism is required.

- [How it works](#how-it-works)
- [Basic Usage](#basic-usage)
- [Constructor](#constructor)
- [Methods](#methods)
	- [close](#close)
	- [getAnswer](#getanswer)
	- [getConnection](#getconnection)
	- [getDataChannel](#getdatachannel)
	- [getOffer](#getoffer)
	- [send](#send)
	- [setAnswer](#setanswer)
- [Events](#events)
  - [on('connect')](#onconnect)
  - [on('data')](#ondata)
  - [on('disconnect')](#ondisconnect)
  - [onChannelEvent](#onchannelevent)
  - [onConnectionEvent](#onconnectionevent)

## How it works

1. Peer A calls `getOffer` and sends the offer to Peer B
2. Peer B calls `getAnswer` and sends the answer to Peer A
3. Peer A calls `setAnswer` using the answer received from Peer B

*You may want to go through these steps using this [online example](https://lostsource.github.io/SimpleRTCData/)*

[![SimpleRTCData Signalling Example](http://i.imgur.com/jljAcGQ.png)](https://lostsource.github.io/SimpleRTCData/)

## Basic Usage

Start by including the library in your markup,

    <script type='text/javascript' src='SimpleRTCData.js></script>

Assume we have two peers Bert and Ernie in which Bert is the initiator. Bert first needs to make an 'offer' to Ernie by calling the `getOffer` method:

    var BertRTC = new SimpleRTCData;
    BertRTC.getOffer(function(bertsOffer) {
      
    });

The callback for `getOffer` returns a single argument `bertsOffer` of type `String` which needs to be sent to Ernie using your preferred message exchange mechanism (eg. WebSockets) Once Ernie receives Bert's offer he will need to create an 'answer' by passing it as the first argument to `getAnswer`. 

    var ErnieRTC = new SimpleRTCData;
     
    ErnieRTC.getAnswer(bertsOffer,function(erniesAnswer) {
      // now send erniesAnswer Bert
    });
    
He should also listen for messages from Bert using the `on('data')` event: 

    ErnieRTC.on('data',function(data) {
       // get ready for messages from Bert 
       console.log(data);
    });
     
    
At last send `erniesAnswer` to Bert so he can use it to call his `setAnswer` method:

    BertRTC.onChannelEvent('open',function(){
       // Bert's ready to send messages
       this.send('Hey Ernie!');
    });
     
    BertRTC.setAnswer(erniesAnswer);

## Constructor
*SimpleRTCData([RTCConfiguration], [MediaConstraints], [RTCDataChannelInit])*

Creating a `SimpleRTCData` instance does not require any arguments. However it is possible to customize options for the underlying `RTCPeerConnection` and `RTCDataChannel` by passing standard [RTCConfiguration](https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration), [MediaConstraints](https://www.webrtc-experiment.com/docs/WebRTC-PeerConnection.html) and [RTCDataChannelInit](http://html5index.org/WebRTC%20-%20RTCDataChannelInit.html) options.

## Methods

### close
*SimpleRTCData.close(void)*

Closes the current connection. The [`disconnect`](#ondisconnect) event will be triggered on both local and remote peers.

### getAnswer
*SimpleRTCData.getAnswer(String offer, Function callback)*

The *joiner* should call this method after receiving an offer from the *initiator*. The offer should be passed as the first argument. The callback function gets one argument `(String answer)`

### getConnection
*SimpleRTCData.getConnection(void)*

Returns a reference to the session's [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection) instance

### getDataChannel
*SimpleRTCData.getDataChannel(void)*

Returns a reference to the session's [RTCDataChannel](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel) instance


### getOffer
*SimpleRTCData.getOffer(Function callback)*

The *initiator* must call this method to retrieve the offer metadata which should be used by the *joiner* as the first argument for the `getAnswer` method. The callback function gets one argument `(String offer)`.

### send
*SimpleRTCData.send(DOMString | ArrayBuffer message, [Function callback])*

Sends `message` of type *DOMString* or *ArrayBuffer* to peer. An optional callback can be passed as a second argument which will be triggered upon receipt of confirmation from the remote peer. Note: Messages sent before a [connection is established](#onconnect) are discarded.

### setAnswer
*SimpleRTCData.setAnswer(String answer, [Function callback])*

The *initiator* must call this method after receiving an answer from the *joiner*. The answer should be passed as the first argument. The second optional argument can be used to check if the call was successful.


## Events

### on('connect')
*SimpleRTCData.on('connect', Function callback)*

Emitted when [RTCPeerConnection.iceConnectionState](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState) has a value of `completed` and [RTCDataChannel.readyState](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/readyState) is `open`. At this point peers can start exchanging messages.

### on('data')
*SimpleRTCData.on('data', Function callback)*

Emitted when a message event is received on the [RTCDataChannel](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/onmessage). The callback receives one argument `data` containing the message payload.

### on('disconnect')
*SimpleRTCData.on('disconnect', Function callback)*

Emitted when [RTCPeerConnection.iceConnectionState](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState) has a value of `disconnected` or the [RTCDataChannel.onclose](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/onclose) event is triggered.

### onChannelEvent
*SimpleRTCData.onChannelEvent(String eventType, Function callback)*

This handler forwards events of type `eventType` from the [RTCDataChannel](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel) instance to the callback specified in the second argument. 

The `eventType` parameter also accepts the special '*' value which forwards all known `RTCDataChannel` events to a single handler.

### onConnectionEvent
*SimpleRTCData.onConnectionEvent(String eventType, Function callback)*

This handler forwards events of type `eventType` from the [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection) instance to the callback specified in the second argument. 

For Example:

    var RTC = new SimpleRTCData;
    RTC.onConnectionEvent('icecandidate',myCandidateHandler);

Is identical to:

    var RTC = new SimpleRTCData;
    var connection = RTC.getConnection(); // returns the standard RTCPeerConnection
    connection.onicecandidate = myCandidateHandler;

The `eventType` parameter also accepts the special '*' value which forwards all known `RTCPeerConnection` events to a single handler.
