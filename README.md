## SimpleRTCData

SimpleRTCData can be used to establish an RTCDataChannel between two or more peers. It does not handle signalling so you will need to implement your own mechanism for that.

### Basic Usage

Assuming two peers Bert and Ernie in which Bert is the initiator, Bert needs to make an 'offer' to Ernie by calling the `getOffer` method:

    var BertRTC = new SimpleRTCData;
    BertRTC.getOffer(function(bertsOffer) {
      // 'bertsOffer' is the string to be sent to Ernie
    });

At this point the offer needs to be sent to Ernie in any way preferred, WebSockets, E-mail, magic etc.. Once Ernie receives Bert's offer he will need to create an 'answer' by passing it as the first argument to `getAnswer`: 

    var ErnieRTC = new SimpleRTCData;
    ErnieRTC.getAnswer(bertsOffer,function(erniesAnswer) {
      // 'erniesAnswer' is the string to be sent to Bert
    });
    
Again, the transport used to send `erniesAnswer` is not relevant however Bert will need to use it's value to call `setAnswer`

    BertRTC.setAnswer(erniesAnswer);
