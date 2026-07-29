/**
 * WebApp - Tuning Gauge Canvas Renderer
 * Smooth 60 FPS HTML5 Canvas gauge with exponential damping & High-DPI support.
 */

export class TunerGauge {
  /**
   * @param {HTMLCanvasElement} canvas 
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Animation state
    this.currentCents = 0;
    this.targetCents = 0;
    this.smoothingFactor = 0.15; // Smooth needle damping
    this.isInTune = false;
    this.activeSignal = false;

    // Seismograph history
    this.history = [];
    this.maxHistory = 120; // Frames of history to keep

    // Handle HiDPI Crisp Canvas Rendering
    this.resize = this.resize.bind(this);
    // Use ResizeObserver to detect layout shifts and prevent stretching
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(this.canvas.parentElement);
    
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  /**
   * Updates target cents offset (-50 to +50)
   * @param {number} cents 
   * @param {boolean} activeSignal 
   * @param {boolean} isInTune 
   */
  update(cents, activeSignal = false, isInTune = false) {
    this.activeSignal = activeSignal;
    this.isInTune = isInTune;
    
    if (activeSignal) {
      // Clamp between -50 and +50
      this.targetCents = Math.max(-50, Math.min(50, cents));
    } else {
      // Decay smoothly to zero when no audio signal detected
      this.targetCents = 0;
    }
  }

  /**
   * Main render loop frame
   */
  render() {
    // Interpolate current cents towards target for smooth needle movement
    this.currentCents += (this.targetCents - this.currentCents) * this.smoothingFactor;

    // Add current frame to history for seismograph
    this.history.unshift({
      cents: this.currentCents,
      active: this.activeSignal,
      inTune: this.isInTune
    });
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    this.draw();
  }

  draw() {
    const w = this.width;
    const h = this.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    // Pivot de l'aiguille remonté légèrement pour ne pas toucher le bord inférieur moche
    const centerY = h - 15; 
    
    // Rayon élargi pour s'adapter à la largeur de l'écran sans être écrasé
    const radius = Math.min(w * 0.48, h * 0.85);

    // Angular bounds (-50 cents = -Math.PI * 0.4, +50 cents = +Math.PI * 0.4)
    const minAngle = -Math.PI * 0.38;
    const maxAngle = Math.PI * 0.38;
    const centerOffset = -Math.PI / 2; // Center at 12 o'clock (top)

    // 0. Draw Vertical Seismograph (Paper scrolling upwards)
    if (this.history.length > 1) {
      ctx.save();
      
      // The pen is near the pivot at the bottom, paper scrolls up to the top.
      const penY = centerY;
      const paperTop = 15;
      const sliceHeight = (penY - paperTop) / this.maxHistory;
      
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      for (let i = 0; i < this.history.length; i++) {
        const pt = this.history[i];
        
        // y moves upwards as history gets older
        const y = penY - (i * sliceHeight);
        
        // x represents the pitch offset in cents
        // We map -50 cents to left, +50 cents to right.
        const maxSwing = radius * 0.75;
        // Smooth out the signal to avoid violent horizontal jumps, and fallback to 0 if inactive
        const xOffset = pt.active ? (pt.cents / 50) * maxSwing : 0;
        const x = centerX + xOffset;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      // Gradient fades out as the paper goes up (persists longer now)
      const grad = ctx.createLinearGradient(0, penY, 0, paperTop);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.9)'); // Vibrant green at the pen
      grad.addColorStop(0.6, 'rgba(59, 130, 246, 0.7)'); // Remains strong blue past the arc
      grad.addColorStop(1, 'rgba(59, 130, 246, 0)');     // Fades into background near the top (note letter)
      
      ctx.strokeStyle = grad;
      ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      
      // Draw a subtle "pen" dot at the bottom
      const currentPt = this.history[0];
      const penX = centerX + (currentPt.active ? (currentPt.cents / 50) * radius * 0.75 : 0);
      ctx.beginPath();
      ctx.arc(penX, penY, 4, 0, Math.PI * 2);
      ctx.fillStyle = currentPt.active ? '#10b981' : '#334155';
      ctx.fill();
      
      ctx.restore();
    }

    // 1. Draw Background Arc
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, centerOffset + minAngle, centerOffset + maxAngle);
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.stroke();

    // 2. Draw In-Tune Center Zone Marker Arc (±3 cents)
    const inTuneMinAngle = (minAngle + maxAngle) / 2 - 0.06;
    const inTuneMaxAngle = (minAngle + maxAngle) / 2 + 0.06;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, centerOffset + inTuneMinAngle, centerOffset + inTuneMaxAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = this.isInTune ? '#10b981' : 'rgba(16, 185, 129, 0.3)';
    if (this.isInTune) {
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
    }
    ctx.stroke();
    ctx.restore();

    // 3. Draw Tick Marks (-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50)
    for (let c = -50; c <= 50; c += 10) {
      const norm = (c + 50) / 100;
      const angle = centerOffset + minAngle + norm * (maxAngle - minAngle);

      const isMajor = c % 25 === 0 || c === 0;
      const tickLength = isMajor ? 12 : 6;
      
      const innerR = radius - 16;
      const outerR = innerR - tickLength;

      const x1 = centerX + innerR * Math.cos(angle);
      const y1 = centerY + innerR * Math.sin(angle);
      const x2 = centerX + outerR * Math.cos(angle);
      const y2 = centerY + outerR * Math.sin(angle);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = isMajor ? 2.5 : 1.5;
      
      if (c === 0) {
        ctx.strokeStyle = '#10b981';
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      }
      ctx.stroke();

      // Labels for major ticks
      if (isMajor) {
        const textR = outerR - 12;
        const tx = centerX + textR * Math.cos(angle);
        const ty = centerY + textR * Math.sin(angle);

        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillStyle = c === 0 ? '#10b981' : '#64748b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c > 0 ? `+${c}` : `${c}`, tx, ty);
      }
      ctx.restore();
    }

    // 4. Draw Dynamic Needle
    const centsNorm = (this.currentCents + 50) / 100;
    const needleAngle = centerOffset + minAngle + centsNorm * (maxAngle - minAngle);

    const needleR = radius - 4;
    const nx = centerX + needleR * Math.cos(needleAngle);
    const ny = centerY + needleR * Math.sin(needleAngle);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(nx, ny);
    ctx.lineWidth = 3.5;

    if (!this.activeSignal) {
      ctx.strokeStyle = '#64748b';
    } else if (this.isInTune) {
      ctx.strokeStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 20;
    } else if (this.currentCents < 0) {
      ctx.strokeStyle = '#f59e0b'; // Flat
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = '#ef4444'; // Sharp
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
    }

    ctx.lineCap = 'round';
    ctx.stroke();

    // Pivot Circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = this.isInTune ? '#10b981' : (this.activeSignal ? '#3b82f6' : '#334155');
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f8fafc';
    ctx.stroke();

    ctx.restore();
  }
}
