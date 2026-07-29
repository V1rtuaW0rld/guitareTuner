/**
 * WebApp - Real-Time Audio Equalizer & Waveform Visualizer
 * Renders dynamic FFT spectrum bars and PCM oscilloscope waveform to verify mic activity.
 */

export class AudioVisualizer {
  /**
   * @param {HTMLCanvasElement} canvas 
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.freqData = null;
    this.timeData = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Render frame using data from AnalyserNode
   * @param {AnalyserNode|null} analyser 
   */
  draw(analyser) {
    const w = this.width;
    const h = this.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    if (!analyser) {
      // Idle state: subtle dotted flat line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (!this.freqData || this.freqData.length !== analyser.frequencyBinCount) {
      this.freqData = new Uint8Array(analyser.frequencyBinCount);
      this.timeData = new Uint8Array(analyser.fftSize);
    }

    analyser.getByteFrequencyData(this.freqData);
    analyser.getByteTimeDomainData(this.timeData);

    // 1. Render FFT Equalizer Spectrum Bars (32 bars)
    const barCount = 32;
    const gap = 3;
    const barWidth = (w - (barCount - 1) * gap) / barCount;
    const binStep = Math.floor(this.freqData.length / barCount / 2); // Focus on lower/mid frequencies

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < binStep; j++) {
        sum += this.freqData[i * binStep + j];
      }
      const avg = sum / binStep;
      const percent = avg / 255;
      const barHeight = Math.max(3, percent * (h * 0.75));

      const x = i * (barWidth + gap);
      const y = h - barHeight;

      ctx.save();
      const gradient = ctx.createLinearGradient(0, h, 0, 0);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
      gradient.addColorStop(0.6, 'rgba(59, 130, 246, 0.8)');
      gradient.addColorStop(1, '#10b981');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
      ctx.fill();
      ctx.restore();
    }

    // 2. Render Oscilloscope Waveform Line
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f8fafc';
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 8;

    const sliceWidth = w / this.timeData.length;
    let x = 0;

    for (let i = 0; i < this.timeData.length; i += 4) {
      const v = this.timeData[i] / 128.0; // 0 to 2
      const y = (v * h) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth * 4;
    }

    ctx.stroke();
    ctx.restore();
  }
}
