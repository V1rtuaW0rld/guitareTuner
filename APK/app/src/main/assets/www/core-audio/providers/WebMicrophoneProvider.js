import { MicrophoneProvider } from './MicrophoneProvider.js';

/**
 * Standard WebRTC Microphone implementation for Browsers (Windows, Mac, iOS Safari, etc.)
 */
export class WebMicrophoneProvider extends MicrophoneProvider {
  constructor(audioContext, selectedDeviceId = null, logCallback = console.log) {
    super(audioContext);
    this.selectedDeviceId = selectedDeviceId;
    this.log = logCallback;
    this.hiddenAudioEl = null;
  }

  async start() {
    this.stop(); // Ensure any previous stream is stopped

    let constraints = { audio: true };
    if (this.selectedDeviceId && this.selectedDeviceId !== 'default') {
      constraints = { audio: { deviceId: { ideal: this.selectedDeviceId } } };
    }

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = this.stream.getAudioTracks()[0];
    this.log(`🌐 [WEB] CAPTATION MICRO: "${track.label}" (Muted: ${track.muted})`);

    // FIREFOX WEBRTC BUG WORKAROUND: Force OS to pump data by attaching stream to a muted <audio> element
    if (!this.hiddenAudioEl) {
      this.hiddenAudioEl = new Audio();
      this.hiddenAudioEl.muted = true;
    }
    this.hiddenAudioEl.srcObject = this.stream;
    this.hiddenAudioEl.play().catch(() => {
      this.log("Info: Autoplay policy prevented hidden audio play, stream may still work via WebAudio.");
    });

    return this.stream;
  }

  stop() {
    if (this.hiddenAudioEl) {
      this.hiddenAudioEl.pause();
      this.hiddenAudioEl.srcObject = null;
      this.hiddenAudioEl = null;
    }
    super.stop();
  }
}
