import { useEffect, useRef } from "react";

import { useChat } from "../context/ChatContext";

export default function CallOverlay() {
  const {
    incomingCall,
    callState,
    localStream,
    remoteStream,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
  } = useChat();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (!localVideoRef.current || !localStream) {
      return;
    }
    localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (!remoteVideoRef.current || !remoteStream) {
      return;
    }
    remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (!remoteAudioRef.current || !remoteStream) {
      return;
    }
    remoteAudioRef.current.srcObject = remoteStream;
    remoteAudioRef.current
      .play()
      .catch(() => {
        // Browser may block autoplay until user interaction; call buttons provide retry points.
      });
  }, [remoteStream]);

  const showIncoming = Boolean(incomingCall);
  const showInCall = callState.status !== "idle";

  if (!showIncoming && !showInCall) {
    return null;
  }

  return (
    <section className="call-overlay">
      {showIncoming && (
        <div className="incoming-card">
          <h3>Incoming {incomingCall.callType} call</h3>
          <p>{incomingCall.fromName} is calling you</p>
          <div className="call-actions">
            <button type="button" onClick={acceptIncomingCall}>
              Accept
            </button>
            <button type="button" className="danger-btn" onClick={declineIncomingCall}>
              Decline
            </button>
          </div>
        </div>
      )}

      {showInCall && (
        <div className="call-panel">
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <h3>
            {callState.status === "calling" ? "Calling" : "In call with"} {callState.withName}
          </h3>
          <p>{callState.type === "video" ? "Video call" : "Voice call"}</p>

          {callState.type === "video" && (
            <div className="video-grid">
              <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
              <video ref={localVideoRef} autoPlay muted playsInline className="local-video" />
            </div>
          )}

          <div className="call-actions">
            <button type="button" className="danger-btn" onClick={endCall}>
              End Call
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
