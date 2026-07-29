import { MicrophoneProvider } from './MicrophoneProvider.js';

/**
 * Android APK specific Microphone Provider.
 * Allows injecting specific behaviors, hacks, or native Java bridges for Android WebViews.
 */
export class AndroidMicrophoneProvider extends MicrophoneProvider {
  constructor(audioContext, selectedDeviceId = null, logCallback = console.log) {
    super(audioContext);
    this.selectedDeviceId = selectedDeviceId;
    this.log = logCallback;
  }

  async start() {
    this.stop(); // Ensure any previous stream is stopped

    let constraints = { audio: true };
    if (this.selectedDeviceId) {
      constraints = { audio: { deviceId: { exact: this.selectedDeviceId } } };
    }

    // Android WebViews standard WebRTC call
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = this.stream.getAudioTracks()[0];
    this.log(`📱 [ANDROID APK] CAPTATION MICRO: "${track.label}" (Muted: ${track.muted})`);

    // Note: If using a native Cordova/Capacitor plugin in the future or a JavascriptInterface 
    // to bypass WebRTC latency on Android, the implementation would go here instead of WebRTC.

    return this.stream;
  }
}
