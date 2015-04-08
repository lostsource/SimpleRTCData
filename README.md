# SimpleRTCData

SimpleRTCData is a tiny JavaScript library which can be used to establish an RTCDataChannel between two peers. It does not handle relaying of messages during connection setup so a separate signalling mechanism is required.

## How to use

*Note: Visualization of the following example is available on this project's [GitHub Page](http://lostsource.github.io/SimpleRTCData/)*

Assume we have two peers Bert and Ernie in which Bert is the initiator. Bert first needs to make an 'offer' to Ernie by calling the `getOffer` method:

    var BertRTC = new SimpleRTCData;
    BertRTC.getOffer(function(bertsOffer) {
      
    });

The callback for `getOffer` returns a single argument `bertsOffer` of type `String` which needs to be sent to Ernie your preferred message exchange mechanism (eg. WebSockets, E-mail, magic etc..) Once Ernie receives Bert's offer he will need to create an 'answer' by passing it as the first argument to `getAnswer`. 

    var ErnieRTC = new SimpleRTCData;
     
    ErnieRTC.getAnswer(bertsOffer,function(erniesAnswer) {
      // erniesAnswer now needs to be sent to Bert
    });
    
He should also register a message handler using the `onChannelEvent` method as to be able to receive messages from Bert: 

    ErnieRTC.onChannelEvent('message',function(e) {
       // get ready for messages from Bert 
       console.log(e.data);
    });
     
    
At last send `erniesAnswer` to Bert so he can use it to call his `setAnswer` method:

    BertRTC.onChannelEvent('open',function(){
       // Bert's ready to send messages
       this.send('Hey Ernie!');
    });
     
    BertRTC.setAnswer(erniesAnswer);

## Methods

### getAnswer
*SimpleRTCData.getAnswer(String offer, Function callback)*

The *joiner* should call this method after receiving an offer from the *initiator*. The offer should be passed as the first argument. The callback function get one argument `(String answer)`

### getConnection
*SimpleRTCData.getConnection(void)*

Returns a reference to the session's [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection) instance

### getOffer
*SimpleRTCData.getOffer(Function callback)*

The *initiator* must call this method to retrieve the offer metadata which should be used by the *joiner* as the first argument for the `getAnswer` method. The callback function gets one argument `(String offer)`.

### setAnswer
*SimpleRTCData.setAnswer(String answer)*

The *initiator* must call this method after receiving an answer from the *joiner*. The answer should be passed as the first argument.

## Events

### onChannelEvent
*SimpleRTCData.onChannelEvent(String eventType, Function callback)*

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

The `eventType` parameter also accepts the special '*' value which forwards all known RTCPeerConnection events to a single handler.

### onError
*SimpleRTCData.onError(Function callback)*
