## SimpleRTCData

SimpleRTCData is a tiny JavaScript library which can be used to establish an RTCDataChannel between two peers. It does not handle the signalling stage so you will need to implement your own mechanism for that.

[Working Example](http://lostsource.github.io/SimpleRTCData/)

### Basic Usage

Assuming two peers Bert and Ernie in which Bert is the initiator, Bert needs to first make an 'offer' to Ernie by calling the `getOffer` method:

    var BertRTC = new SimpleRTCData;
    BertRTC.getOffer(function(bertsOffer) {
      
    });

At this point the `bertsOffer` needs to be sent to Ernie in any way preferred, WebSockets, E-mail, magic etc.. Once Ernie receives Bert's offer he will need to create an 'answer' by passing it as the first argument to `getAnswer`: 

    var ErnieRTC = new SimpleRTCData;
    ErnieRTC.onChannelEvent('message',function(e) {
       // get ready for messages from Bert 
       console.log(e.data);
    });

    ErnieRTC.getAnswer(bertsOffer,function(erniesAnswer) {
      
    });
    
Using your preferred transport mechanism send `erniesAnswer` to Bert so he can use it for the `setAnswer` method:

    BertRTC.onChannelEvent('open',function(){
       // Bert's ready to send messages
    });
    
    BertRTC.setAnswer(erniesAnswer);
