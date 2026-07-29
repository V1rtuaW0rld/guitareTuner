/**
 * Base Interface for Microphone Providers
 */
export class MicrophoneProvider {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.stream = null;
  }

  /**
   * Starts the microphone and returns the MediaStream.
   * Must be implemented by subclasses.
   * @returns {Promise<MediaStream>}
   */
  async start() {
    throw new Error('start() must be implemented by subclass');
  }

  /**
   * Stops the microphone stream.
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Returns the current MediaStream, if any.
   * @returns {MediaStream|null}
   */
  getStream() {
    return this.stream;
  }
}
