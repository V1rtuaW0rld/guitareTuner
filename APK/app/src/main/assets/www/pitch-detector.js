/**
 * Core Audio - YIN Pitch Detection Algorithm
 * High-precision pitch detection designed for musical instruments (specifically guitar).
 * YIN reduces sub-harmonic octave errors common in autocorrelation.
 *
 * Algorithm steps:
 * 1. Difference function: d_t(tau)
 * 2. Cumulative Mean Normalized Difference Function (CMNDF): d'_t(tau)
 * 3. Absolute thresholding for fundamental lag selection
 * 4. Parabolic interpolation for sub-sample precision
 */

export class YinPitchDetector {
  /**
   * @param {Object} options Configuration parameters
   * @param {number} [options.threshold=0.15] YIN threshold (lower = stricter peak matching)
   * @param {number} [options.minFreq=60] Minimum detectable frequency in Hz (Guitar Low E2 = 82.41 Hz)
   * @param {number} [options.maxFreq=1000] Maximum detectable frequency in Hz (Guitar High E4 = 329.63 Hz)
   * @param {number} [options.rmsThreshold=0.008] Minimum RMS volume to filter out background silence
   */
  constructor(options = {}) {
    this.threshold = options.threshold ?? 0.20;
    this.minFreq = options.minFreq ?? 65;
    this.maxFreq = options.maxFreq ?? 1000;
    this.rmsThreshold = options.rmsThreshold ?? 0.020;
  }

  /**
   * Calculates the Root Mean Square (RMS) volume of a buffer.
   * @param {Float32Array} buffer Audio samples
   * @returns {number} RMS volume level
   */
  calculateRMS(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  /**
   * Detects fundamental frequency from audio time-domain buffer.
   * @param {Float32Array} buffer - Audio PCM signal buffer
   * @param {number} sampleRate - Audio context sample rate (e.g. 44100 or 48000)
   * @returns {{ frequency: number|null, clarity: number, rms: number }} Result object
   */
  detectPitch(buffer, sampleRate) {
    const rms = this.calculateRMS(buffer);

    // If signal is too weak/quiet, return null
    if (rms < this.rmsThreshold) {
      return { frequency: null, clarity: 0, rms };
    }

    const minTau = Math.floor(sampleRate / this.maxFreq);
    const maxTau = Math.min(Math.floor(sampleRate / this.minFreq), Math.floor(buffer.length / 2));
    const yinBufferLength = maxTau;

    const yinBuffer = new Float32Array(yinBufferLength);

    // Step 1: Difference Function
    for (let tau = 0; tau < yinBufferLength; tau++) {
      let sum = 0;
      for (let i = 0; i < yinBufferLength; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
    }

    // Step 2: Cumulative Mean Normalized Difference Function (CMNDF)
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < yinBufferLength; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] = (yinBuffer[tau] * tau) / runningSum;
    }

    // Step 3: Absolute Thresholding
    let tauEstimate = -1;
    for (let tau = minTau; tau < yinBufferLength; tau++) {
      if (yinBuffer[tau] < this.threshold) {
        while (tau + 1 < yinBufferLength && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    // Fallback: Global minimum if no value dipped under threshold
    if (tauEstimate === -1) {
      let minVal = Infinity;
      for (let tau = minTau; tau < yinBufferLength; tau++) {
        if (yinBuffer[tau] < minVal) {
          minVal = yinBuffer[tau];
          tauEstimate = tau;
        }
      }
      // If signal quality is still too poor, reject
      if (minVal > 0.75) {
        return { frequency: null, clarity: 0, rms };
      }
    }

    // Step 4: Parabolic Interpolation for Sub-Sample Accuracy
    let betterTau = tauEstimate;
    const x0 = tauEstimate > 0 ? tauEstimate - 1 : tauEstimate;
    const x2 = tauEstimate < yinBufferLength - 1 ? tauEstimate + 1 : tauEstimate;

    if (x0 !== tauEstimate && x2 !== tauEstimate) {
      const s0 = yinBuffer[x0];
      const s1 = yinBuffer[tauEstimate];
      const s2 = yinBuffer[x2];
      
      const denominator = 2 * (2 * s1 - s2 - s0);
      if (denominator !== 0) {
        betterTau = tauEstimate + (s2 - s0) / denominator;
      }
    }

    const frequency = sampleRate / betterTau;
    const clarity = Math.max(0, 1 - yinBuffer[tauEstimate]);

    // Sanity check frequency bounds
    if (frequency < this.minFreq || frequency > this.maxFreq) {
      return { frequency: null, clarity: 0, rms };
    }

    return {
      frequency,
      clarity,
      rms
    };
  }
}
