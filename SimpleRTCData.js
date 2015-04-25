/*
The MIT License (MIT)

Copyright (c) 2015 Joseph Portelli (joseph@lostsource.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/* global  window, console */
'use strict';

function SimpleRTCData(inServers, inConstraints, inDataChanOpts) {
  // set to 'offer' or 'answer' depending on call to getOffer or getAnswer
  var inMode = null;
  var that = this;

  var PayloadTypes = {
    cb: 0x01
  };

  // set to true when iceConnectionState is completed/connected
  var Connected = false;
  var PeerConnection = window.RTCPeerConnection ||
                       window.mozRTCPeerConnection ||
                       window.webkitRTCPeerConnection;

  var SessionDescription = window.RTCSessionDescription ||
                           window.mozRTCSessionDescription ||
                           window.webkitRTCSessionDescription;

  var IceCandidate = window.mozRTCIceCandidate ||
                     window.webkitRTCIceCandidate ||
                     window.RTCIceCandidate;

  if (!this) {
    // called as function not as constructor
    return {
      isSupported: function() {
        if (!PeerConnection || !SessionDescription || !IceCandidate) {
          return false;
        }
        return true;
      }
    };
  }

  var DataChannel = null;
  var SendCBList = [];
  var LENGTH_CBID = 8; // length of callback id

  // list of events to be forwarded to SimpleRTCData.on handlers
  var LibEvList = ['data', 'error', 'connect', 'disconnect'];

  // list of events to be forwarded to SimpleRTCData.onChannelEvent handlers
  var ChanEvList = ['open', 'close', 'error', 'message'];

  // list of events to be forwarded to SimpleRTCData.onConnectionEvent handlers
  var ConnEvList = ['addstream', 'datachannel', 'icecandidate',
                    'iceconnectionstatechange', 'identityresult',
                    'idpassertionerror', 'idpvalidationerror',
                    'negotiationneeded', 'peeridentity',
                    'remotestream', 'signalingstatechange'];

  function getRTCConnection() {
    var servers = inServers || {'iceServers': [
      {'url': 'stun:stun.l.google.com:19302'}
    ]};
    var constraints = inConstraints || {
      optional: [
        {
          DtlsSrtpKeyAgreement: true
        }
      ]
    };

    return new PeerConnection(servers, constraints);
  }

  function typedArrToHex(arr) {
    var cbHash = '', byteHex;

    for (var x = 0; x < arr.length; x++) {
      byteHex = arr[x].toString(16);
      if (byteHex.length === 1) {
        byteHex = '0' + byteHex;
      }

      cbHash += byteHex;
    }

    return cbHash;

  }

  function genSendCallbackID(getAsBuffer) {
    var cbRand = new Uint8Array(new ArrayBuffer(LENGTH_CBID));
    window.crypto.getRandomValues(cbRand);

    if (getAsBuffer) {
      return cbRand.buffer;
    }

    return typedArrToHex(cbRand);
  }

  var ChannelEventHandlers = {}, ConnEventHandlers = {}, LibEventHandlers = {};
  var Connection = getRTCConnection();

  Connection.addEventListener('iceconnectionstatechange', function() {
    switch (Connection.iceConnectionState) {
      case 'disconnected':
        if (Connected) {
          Connected = false;
          emitEvent('disconnect');
        }
        break;
      case 'completed':
      case 'connected':
        if (!Connected) {
          Connected = true;
          emitEvent('connect');
        }
        break;
    }
  });

  ConnEvList.forEach(function(evName) {
    Connection.addEventListener(evName, function(e) {
      forwardConnEvent.apply(this, [e]);
    });
  });

  function getConnectionStats(statType, callback) {
    var allowedTypes = ['local', 'remote'];
    if (allowedTypes.indexOf(statType) === -1) {
      throw new Error('Unsupported Stats Type (' + statType + ')');
    }

    try {
      Connection.getStats(function(stats) {
        var results = stats.result();
        var resultMap = {};

        results.forEach(function(result) {

          resultMap[result.type] = resultMap[result.type] || [];

          var names = result[statType].names();

          var resultVals = {};
          names.forEach(function(name) {
            var resValue = result[statType].stat(name);
            resultVals[name] = resValue;
          });

          resultMap[result.type].push(resultVals);
        });

        callback(resultMap);
      });
    }
    catch (e) {
      console.log(e);
    }
  }

  function emitEvent(evName, evArgs) {
    if (typeof(LibEventHandlers[evName]) === 'undefined') {
      // no event handlers
      return true;
    }

    for (var x = 0; x < LibEventHandlers[evName].length; x++) {
      LibEventHandlers[evName][x].apply(that, evArgs);
    }
  }

  function forwardConnEvent(event) {
    if (typeof(ConnEventHandlers[event.type]) === 'undefined') {
      // no event handlers
      return true;
    }

    for (var x = 0; x < ConnEventHandlers[event.type].length; x++) {
      ConnEventHandlers[event.type][x].apply(this, [event]);
    }
  }


  function forwardChannelEvent(event) {
    if (typeof(ChannelEventHandlers[event.type]) === 'undefined') {
      // no event handlers
      return true;
    }

    for (var x = 0; x < ChannelEventHandlers[event.type].length; x++) {
      ChannelEventHandlers[event.type][x].apply(this, [event]);
    }
  }

  function regChannelEvent(channel, evName) {
    var msgPayload = null;

    channel.addEventListener(evName, function(e) {
      if (e.type === 'message') {
        if (typeof (e.data) === 'string') {
          // do not forward internal events
          try {
            msgPayload = JSON.parse(e.data);
            if (msgPayload._internal) {
              return;
            }
          }
          catch (err) {}
        }
      }

      forwardChannelEvent.apply(this, [e]);
    });
  }

  function isInternalPayload(payload) {
    if (typeof(payload._internal) !== 'undefined') {
      return true;
    }

    return false;
  }

  function processInternalPayload(payload) {
    switch (payload.type) {
      case 'cb':
        if (typeof (SendCBList[payload.data]) !== 'undefined') {
          SendCBList[payload.data]();
          delete SendCBList[payload.data];
        }
        break;
    }
  }

  function processPayload(payload, callback) {
    if (payload instanceof Blob) {

      var fileReader = new FileReader();
      fileReader.onload = function() {
        callback(this.result);
      };
      fileReader.readAsArrayBuffer(payload);

      return true;
    }

    callback(payload);
  }

  function regChannelEvents(channel) {
    channel.addEventListener('close', function() {
      if (Connected) {
        Connected = false;
        emitEvent('disconnect');
      }
    });

    channel.addEventListener('message', function(e) {
      processPayload(e.data, function(payload) {


        if (typeof(payload) === 'string') {
          payload = JSON.parse(payload);

          if (isInternalPayload(payload)) {
            processInternalPayload(payload);
          }
          else {
            emitEvent('data', [payload.data]);

            if (typeof (payload.cb) === 'string') {
              callRemoteCallback(payload.cb);
            }
          }
        }
        else {
          var payloadView = new Uint8Array(payload);
          var dataStart = 2;
          var cbBfr = null, cbView = null;

          if (payloadView[0] === PayloadTypes.cb) {
            dataStart += LENGTH_CBID;

            cbBfr = new ArrayBuffer(LENGTH_CBID);
            cbView = new Uint8Array(cbBfr);

            cbView.set(payloadView.subarray(2, LENGTH_CBID + 2));
          }

          var dataPayload = new ArrayBuffer(payload.byteLength - dataStart);
          var dataPayloadView = new Uint8Array(dataPayload);
          dataPayloadView.set(payloadView.subarray(dataStart));

          emitEvent('data', [dataPayload]);

          if (cbView) {
            callRemoteCallback(typedArrToHex(cbView));
          }
        }

      });

    });

    for (var x = 0; x < ChanEvList.length; x++) {
      regChannelEvent(channel, ChanEvList[x]);
    }
  }

  function callRemoteCallback(callbackId) {
    DataChannel.send(JSON.stringify({
      _internal: true,
      type: 'cb',
      data: callbackId
    }));
  }

  function addChanEvHandler(evName, evHandler) {
    ChannelEventHandlers[evName] = ChannelEventHandlers[evName] || [];
    ChannelEventHandlers[evName].push(evHandler);
  }

  function addConnEvHandler(evName, evHandler) {
    ConnEventHandlers[evName] = ConnEventHandlers[evName] || [];
    ConnEventHandlers[evName].push(evHandler);
  }

  function addLibEvHandler(evName, evHandler) {
    LibEventHandlers[evName] = LibEventHandlers[evName] || [];
    LibEventHandlers[evName].push(evHandler);
  }

  function emitError(libErr, rtcErr) {
    if (typeof(that.onError) !== 'function') {
      return;
    }

    that.onError({
      message: libErr,
      rtc: rtcErr
    });
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

  function addHeaderToBuffer(bfr, callbackId) {
    // 2 bytes for header type and reserved byte
    var bfrSize = bfr.byteLength + 2;
    var payloadType = 0;
    if (callbackId !== null) {
      payloadType = PayloadTypes.cb;
      bfrSize += callbackId.byteLength;
    }

    var payload = new ArrayBuffer(bfrSize);
    var view = new Uint8Array(payload);

    view[0] = payloadType;

    if (callbackId !== null) {
      view.set(new Uint8Array(callbackId), 2);
      view.set(new Uint8Array(bfr), 10);
    }
    else {
      view.set(new Uint8Array(bfr), 2);
    }

    return view.buffer;
  }

  Connection.addEventListener('datachannel', function(e) {
    DataChannel = e.channel;
    regChannelEvents(e.channel);
  });

  this.getConnection = function() {
    return Connection;
  };

  this.getLocalStats = function(callback) {
    return getConnectionStats('local', callback);
  };

  this.getRemoteStats = function(callback) {
    return getConnectionStats('remote', callback);
  };

  this.getDataChannel = function() {
    return DataChannel;
  };

  function isTypedArray(data) {
    if (typeof (data.buffer) !== 'undefined') {
      // TODO , can better check for typed array ?
      return true;
    }

    return false;
  }

  this.send = function(data, callback) {
    if (!DataChannel) {
      return false;
    }

    var callbackId = null, payload = data;

    switch (typeof (data)) {
      case 'string':
        payload = {
          data: data
        };

        // callback required
        if (typeof (callback) === 'function') {
          callbackId = genSendCallbackID();
          SendCBList[callbackId] = callback;
          payload.cb = callbackId;
        }

        // strings are always wrapped as JSON
        payload = JSON.stringify(payload);
        break;

      case 'object':
        if (typeof (callback) === 'function') {
          callbackId = genSendCallbackID(true);
          SendCBList[typedArrToHex(new Uint8Array(callbackId))] = callback;
        }

        if (data instanceof ArrayBuffer) {
          payload = addHeaderToBuffer(data, callbackId);
        }
        else if (isTypedArray(data)) {
          payload = addHeaderToBuffer(data.buffer, callbackId);
        }
        else if (callbackId) {
          throw new Error('Callbacks not supported for type `' + data.constructor.name + '`');
        }
        break;
    }

    DataChannel.send(payload);
  };

  this.getOffer = function(callback) {
    if (inMode !== null) {
      throw new Error('getOffer cannot be called with getAnswer');
    }

    inMode = 'offer';

    if (typeof(callback) !== 'function') {
      throw new Error('getOffer requires first argument to be a callback');
    }


    var didCallback = false;
    var iceList = [];
    var offerSDP = null;

    DataChannel = Connection.createDataChannel('SimpleRTCDataChannel', inDataChanOpts || {
      reliable: true, ordered: true
    });

    regChannelEvents(DataChannel);

    function doCallback(offerSDP, iceList) {
      if (didCallback) {
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
      if (e.candidate) {
        iceList.push(getCandidateCopy(e.candidate));
      }
      else if (Connection.iceGatheringState === 'complete') {
        doCallback(offerSDP, iceList);
      }
    };

    Connection.createOffer(function(inOfferSDP) {
      Connection.setLocalDescription(inOfferSDP,
          // we ignore success callback as we need to wait for ice candidates
          function() {},

          // failed to set local description
          function() {
            doCallback(null);
          }
      );

      offerSDP = inOfferSDP;
    }, function() {
      // createOffer failed
      doCallback(null);
    });
  };

  function addCanditateList(candidateList, callback) {
    callback = callback || function() {};

    var candidate = candidateList.shift();
    if (!candidate) {
      // all candidates processed
      callback({error: 0, errmsg: ''});
      return true;
    }

    Connection.addIceCandidate(new IceCandidate(candidate), function() {
      // succesfully added
      addCanditateList(candidateList, callback);
    },function() {
      // failed to add candidate
      // TODO trigger event
      console.warn('fail');
    });
  }

  this.setAnswer = function(answer, callback) {
    callback = callback || function(detail) {
      if (detail.error) {
        throw new Error(detail.error);
      }
    };

    var didCallback = false, channelIsOpen = false;

    function doCallback(err) {
      err = err || null;
      if (didCallback) {
        return true;
      }

      if (!err && !channelIsOpen) {
        return true;
      }

      didCallback = true;

      Connection.removeEventListener(
          'iceconnectionstatechange',
          checkAnswerReady
      );

      if (err) {
        err = 'SimpleRTCData.setAnswer Failed: ' + err;
      }

      callback({
        error: err
      });
    }

    function checkAnswerReady() {
      switch (Connection.iceConnectionState) {
        case 'completed':
        case 'connected':
          doCallback();
          break;

        case 'failed':
          doCallback('Failed to setAnswer');
          break;
      }
    }

    if (typeof(answer) === 'string') {
      try {
        answer = JSON.parse(answer);
      }
      catch (e) {
        doCallback('Malformed Answer Supplied');
        return false;
      }
    }
    else {
      doCallback('Expected `string` for Argument 1 (answer) got `' + typeof(answer) + '` instead');
      return false;
    }

    if (answer.sdp && answer.sdp.type === 'offer') {
      doCallback('Expected Argument 1 to be `Answer` but got an `Offer` instead.');
      return false;
    }

    Connection.addEventListener('iceconnectionstatechange', checkAnswerReady);
    DataChannel.addEventListener('open', function() {
      channelIsOpen = true;
      doCallback();
    });

    var remoteSDP = new SessionDescription(answer.sdp);
    Connection.setRemoteDescription(remoteSDP, function() {
      addCanditateList(answer.icecandidates);
    },function() {
      doCallback('Failed to setRemoteDescription');
    });
  };

  this.getAnswer = function(offer, callback) {
    if (inMode !== null) {
      throw new Error('getAnswer cannot be called with getOffer');
    }

    inMode = 'answer';

    if (typeof(offer) === 'string') {
      try {
        offer = JSON.parse(offer);
      }
      catch (e) {
        throw new Error('getAnswer: Invalid offer, this should be the result of a call to getOffer');
      }
    }
    else {
      throw new Error('getAnswer: Argument 1 must be the result of a call to getOffer');
    }

    if (typeof(callback) !== 'function') {
      throw new Error('getAnswer requires second argument to be a callback');
    }

    var iceList = [];
    var answerSDP = null;
    var didCallback = false;
    var fnErrMsg = 'SimpleRTCData.getAnswer Failed: ';

    function doCallback(answerSDP, iceList) {
      if (didCallback) {
        // make sure callback is only fired once
        return false;
      }

      didCallback = true;

      callback(JSON.stringify({
        sdp: getSDPCopy(answerSDP),
        icecandidates: iceList
      }));
    }

    Connection.addEventListener('icecandidate', function(e) {
      if (e.candidate) {
        iceList.push(getCandidateCopy(e.candidate));
      }
      else {
        doCallback(answerSDP, iceList);
      }
    });

    var remoteDescriptor = new SessionDescription(offer.sdp);

    Connection.setRemoteDescription(remoteDescriptor, function() {

      Connection.createAnswer(function(inAnswerSDP) {
        answerSDP = inAnswerSDP;

        Connection.setLocalDescription(inAnswerSDP, function() {
          addCanditateList(offer.icecandidates);

        },function(err) {
          emitError(fnErrMsg + '(setLocalDescription)', err);
        });

      },function(err) {
        emitError(fnErrMsg + '(createAnswer)', err);
      });

    },function(err) {
      emitError(fnErrMsg + '(setRemoteDescription)', err);
    });
  };

  this.onChannelEvent = function(evName, evHandler) {
    if (evName !== '*') {
      addChanEvHandler(evName, evHandler);
      return;
    }

    // register all channel events if evName is '*'
    ChanEvList.forEach(function(evName) {
      addChanEvHandler(evName, evHandler);
    });
  };

  this.onConnectionEvent = function(evName, evHandler) {
    if (evName !== '*') {
      addConnEvHandler(evName, evHandler);
      return;
    }

    // register all channel events if evName is '*'
    ConnEvList.forEach(function(evName) {
      addConnEvHandler(evName, evHandler);
    });
  };

  this.on = function(evName, evHandler) {
    if (evName === '*') {
      throw new Error('SimpleRTCData.on does not accept wildcard for the eventName argument');
    }

    if (LibEvList.indexOf(evName) === -1) {
      throw new Error('SimpleRTCData.on: Unknown eventName (' + evName + ')');
    }

    addLibEvHandler(evName, evHandler);
  };
}
