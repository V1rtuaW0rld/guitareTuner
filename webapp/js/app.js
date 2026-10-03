/**
 * WebApp Main Application Logic & Controller
 * Integrates Web Audio API, YIN Pitch Detection from core-audio, Visualizer Monitor,
 * Debug Doctor Diagnostic Dashboard, Verbose Log Terminal, and UI rendering.
 */

import { YinPitchDetector } from '../core-audio/pitch-detector.js?v=4';
import { frequencyToNote } from '../core-audio/note-converter.js?v=4';
import { GUITAR_TUNINGS, getClosestGuitarString } from '../core-audio/guitar-tunings.js?v=4';
import { TunerGauge } from './gauge.js';
import { AudioVisualizer } from './visualizer.js';
import { initCustomSelect } from './custom-select.js';
import { WebMicrophoneProvider } from '../core-audio/providers/WebMicrophoneProvider.js';
import { AndroidMicrophoneProvider } from '../core-audio/providers/AndroidMicrophoneProvider.js';

class AccordeurApp {
  constructor() {
    // Audio State
    this.audioContext = null;
    this.analyserNode = null;
    this.gainNode = null;
    this.dummyGainNode = null;
    this.micStream = null;
    this.isListening = false;
    this.selectedDeviceId = '';
    this.isTestToneRunning = false;
    this.isPopulatingDevices = false;

    // Pitch Hysteresis / Hold State
    this.lastPitchTime = 0;
    this.lastFrequency = null;
    this.lastLoggedNote = '';
    this.pitchHoldDuration = 1500;
    
    // Core Engine - YIN Pitch Detector
    this.pitchDetector = new YinPitchDetector({
      threshold: 0.20,
      minFreq: 65,
      maxFreq: 1000,
      rmsThreshold: 0.008
    });

    // Tuning & String Mode State
    this.currentTuningKey = 'standard';
    this.isListening = false;
    this.isTestToneRunning = false;
    this.manualTargetString = null;
    this.audioContext = null;
    this.micStream = null;
    
    // Smooth pitch detection variables
    this.freqHistory = []; // Median filter buffer for pitch stabilization
    
    this.bufferSize = 4096;
    this.audioBuffer = new Float32Array(this.bufferSize);
    this.lastLogTime = 0;

    // Performance & Battery optimizations
    this.lastRenderTime = 0;
    this.performanceMode = 'eco'; // 'eco' or 'turbo'
    this.targetFPS = 30; // 30 FPS for eco
    this.frameInterval = 1000 / this.targetFPS;
    this.skipYinOnSilence = true;

    this.initDOMElements();
    
    // Initialize Custom HTML Dropdown
    initCustomSelect('tuningSelect');
    
    if (this.tuningSelect && this.tuningSelect.value) {
      this.currentTuningKey = this.tuningSelect.value;
    }
    this.gauge = new TunerGauge(this.canvasEl);
    this.visualizer = new AudioVisualizer(this.visualizerCanvasEl);
    this.bindEvents();

    this.renderStringPins();
    this.populateAudioDevices();

    // Check Mobile APK / Android Environment for UI Divergence
    const isMobileAPK = window.location.href.includes('androidproxy') || /Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobileAPK) {
      document.body.classList.add('is-mobile-apk');
      
      // Hide PC-only elements on Mobile APK
      if (this.micToggleBtn) this.micToggleBtn.style.display = 'none';
      if (this.audioSourceSelect && this.audioSourceSelect.closest('.select-group')) {
        this.audioSourceSelect.closest('.select-group').style.display = 'none';
      }
    }

    // Auto-collapse Debug Doctor by default for a clean UI (can be scrolled & expanded anytime)
    if (this.debugBody) {
      this.debugBody.classList.add('hidden');
    }

    this.log('🚀 Initialisation Accordeur Pro terminée.');

    // Auto-start Microphone on Launch
    this.startMicrophone().catch(() => {
      this.log('📢 STATUT MICRO: En attente du premier clic/toucher utilisateur...');
    });

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initDOMElements() {
    this.micToggleBtn = document.getElementById('micToggleBtn');
    this.micBtnText = document.getElementById('micBtnText');
    this.tuningSelect = document.getElementById('tuningSelect');
    this.audioSourceSelect = document.getElementById('audioSourceSelect');
    this.autoBtn = document.getElementById('autoBtn');
    this.stringsGrid = document.getElementById('stringsGrid');
    
    this.canvasEl = document.getElementById('gaugeCanvas');
    this.visualizerCanvasEl = document.getElementById('visualizerCanvas');
    this.tunerCard = document.getElementById('tunerCard');
    this.noteLetterEl = document.getElementById('noteLetter');
    this.noteOctaveEl = document.getElementById('noteOctave');
    this.frequencyValEl = document.getElementById('frequencyVal');
    this.centsValEl = document.getElementById('centsVal');
    this.statusBadgeEl = document.getElementById('statusBadge');
    this.volumeFillEl = document.getElementById('volumeFill');
    this.dbValEl = document.getElementById('dbVal');

    this.debugHeader = document.getElementById('debugHeader');
    this.debugToggleBtn = document.getElementById('debugToggleBtn');
    this.debugBody = document.getElementById('debugBody');
    this.step1Status = document.getElementById('step1Status');
    this.step1Badge = document.getElementById('step1Badge');
    this.step2Status = document.getElementById('step2Status');
    this.step2Badge = document.getElementById('step2Badge');
    this.step3Status = document.getElementById('step3Status');
    this.step3Badge = document.getElementById('step3Badge');
    this.step4Status = document.getElementById('step4Status');
    this.step4Badge = document.getElementById('step4Badge');
    this.synthTestBtn = document.getElementById('synthTestBtn');
    this.copyLogsBtn = document.getElementById('copyLogsBtn');
    this.clearLogsBtn = document.getElementById('clearLogsBtn');
    this.logTerminal = document.getElementById('logTerminal');
    this.modeEcoBtn = document.getElementById('modeEcoBtn');
    this.modeTurboBtn = document.getElementById('modeTurboBtn');
  }

    const resumeAudioContext = () => {
      if (this.audioContext && this.audioContext.state === 'suspended' && this.isListening) {
        this.audioContext.resume().then(() => {
          this.log('▶️ AudioContext réactivé');
        });
      }
    };

    document.addEventListener('click', resumeAudioContext);
    document.addEventListener('touchstart', resumeAudioContext);

    if (this.micToggleBtn) {
      this.micToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMicrophone();
      });
    }
    
    if (this.tuningSelect) {
      this.tuningSelect.addEventListener('change', (e) => {
        this.currentTuningKey = e.target.value;
        this.manualTargetString = null;
        this.log(`🎼 Accordage sélectionné: ${e.target.value}`);
        this.updateAutoBtnState();
        this.renderStringPins();
        this.resetUI();
      });
    }

    if (this.audioSourceSelect) {
      this.audioSourceSelect.addEventListener('change', (e) => {
        if (this.isPopulatingDevices || !e.isTrusted) return;
        this.selectedDeviceId = e.target.value;
        this.log(`🎙️ Entrée audio choisie dans la liste: "${e.target.value || 'Par défaut'}"`);
        if (this.isListening) {
          this.stopMicrophone();
          this.startMicrophone();
        }
      });
    }

    if (this.autoBtn) {
      this.autoBtn.addEventListener('click', () => {
        this.manualTargetString = null;
        this.log('🎯 Mode Automatique activé');
        this.updateAutoBtnState();
        this.renderStringPins();
      });
    }

    if (this.debugHeader) {
      this.debugHeader.addEventListener('click', () => {
        if (this.debugBody) this.debugBody.classList.toggle('hidden');
      });
    }

    if (this.synthTestBtn) {
      this.synthTestBtn.addEventListener('click', async () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        await this.runSyntheticTestTone();
      });
    }

    if (this.modeEcoBtn) {
      this.modeEcoBtn.addEventListener('click', () => {
        this.performanceMode = 'eco';
        this.targetFPS = 30;
        this.frameInterval = 1000 / 30;
        this.skipYinOnSilence = true;
        this.modeEcoBtn.classList.add('active');
        if (this.modeTurboBtn) this.modeTurboBtn.classList.remove('active');
        this.log('🍃 Passage en Mode Éco (30 FPS & Pause Silence)');
      });
    }

    if (this.modeTurboBtn) {
      this.modeTurboBtn.addEventListener('click', () => {
        this.performanceMode = 'turbo';
        this.targetFPS = 0;
        this.frameInterval = 0;
        this.skipYinOnSilence = false;
        this.modeTurboBtn.classList.add('active');
        if (this.modeEcoBtn) this.modeEcoBtn.classList.remove('active');
        this.log('⚡ Passage en Mode Turbo (120 Hz Ultra-Fluide)');
      });
    }

    if (this.copyLogsBtn) {
      this.copyLogsBtn.addEventListener('click', () => {
        if (this.logTerminal) {
          navigator.clipboard.writeText(this.logTerminal.value);
          if (this.copyLogsBtn) this.copyLogsBtn.textContent = '✅ Logs Copiés !';
          setTimeout(() => { if (this.copyLogsBtn) this.copyLogsBtn.textContent = '📋 Copier les Logs Texte'; }, 2000);
        }
      });
    }

    if (this.clearLogsBtn) {
      this.clearLogsBtn.addEventListener('click', () => {
        if (this.logTerminal) {
          this.logTerminal.value = '';
        }
      });
    }
  }

  log(msg) {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const logLine = `[${timestamp}] ${msg}`;
    
    console.log(logLine);
    if (this.logTerminal) {
      this.logTerminal.value += logLine + '\n';
      this.logTerminal.scrollTop = this.logTerminal.scrollHeight;
    }
  }

  async populateAudioDevices() {
    this.isPopulatingDevices = true;
    try {
      if (!this.audioSourceSelect) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      
      this.audioSourceSelect.innerHTML = '';
      
      const optDefault = document.createElement('option');
      optDefault.value = '';
      optDefault.textContent = 'Par défaut système';
      this.audioSourceSelect.appendChild(optDefault);

      audioInputs.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Microphone ${index + 1}`;
        if (device.deviceId === this.selectedDeviceId) {
          option.selected = true;
        }
        this.audioSourceSelect.appendChild(option);
      });
      this.log(`🎙️ ${audioInputs.length} périphérique(s) audio détecté(s) sur le système.`);
    } catch (err) {
      this.log(`⚠️ Erreur d'énumération des périphériques: ${err.message}`);
    } finally {
      this.isPopulatingDevices = false;
    }
  }

  updateAutoBtnState() {
    if (this.manualTargetString === null) {
      this.autoBtn.classList.add('active');
    } else {
      this.autoBtn.classList.remove('active');
    }
  }

  renderStringPins() {
    const tuning = GUITAR_TUNINGS[this.currentTuningKey] || GUITAR_TUNINGS.standard;
    this.stringsGrid.innerHTML = '';

    tuning.strings.forEach(str => {
      const pin = document.createElement('div');
      pin.className = 'string-pin';
      pin.dataset.stringNum = str.stringNum;

      if (this.manualTargetString && this.manualTargetString.stringNum === str.stringNum) {
        pin.classList.add('selected');
      }

      pin.innerHTML = `
        <span class="string-num">Corde ${str.stringNum}</span>
        <span class="string-note">${str.note}</span>
        <span class="string-freq">${str.freq} Hz</span>
      `;

      pin.addEventListener('click', () => {
        if (this.manualTargetString && this.manualTargetString.stringNum === str.stringNum) {
          this.manualTargetString = null;
          this.log('🎯 Mode Auto réactivé.');
        } else {
          this.manualTargetString = str;
          this.log(`🎯 Corde Cible Verrouillée: Corde ${str.stringNum} (${str.note} - ${str.freq} Hz)`);
        }
        this.updateAutoBtnState();
        this.renderStringPins();
      });

      this.stringsGrid.appendChild(pin);
    });
  }

  async toggleMicrophone() {
    if (this.isListening) {
      this.log('🖱️ Clic utilisateur: Arrêt du microphone requested.');
      this.stopMicrophone();
    } else {
      this.log('🖱️ Clic utilisateur: Démarrage du microphone requested.');
      await this.startMicrophone();
    }
  }

  stopMicrophone() {
    this.log('🛑 Arrêt du micro...');
    this.isListening = false;
    
    if (this.micProvider) {
      this.micProvider.stop();
      this.micProvider = null;
    }
    
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.suspend();
    }
    if (this.micToggleBtn) this.micToggleBtn.classList.remove('active');
    if (this.micBtnText) this.micBtnText.textContent = 'Activer le Micro';
    if (this.statusBadgeEl) {
      this.statusBadgeEl.textContent = 'PAUSE';
      this.statusBadgeEl.className = 'status-badge idle';
    }
    if (this.tunerCard) this.tunerCard.className = 'tuner-card idle';
  }

  async startMicrophone() {
    try {
      this.log('🔊 Démarrage de la chaîne audio WebAudio...');
      
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive'
      });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // 1. Delegate capture to the appropriate Platform Provider
      const logCb = (msg) => this.log(msg);
      
      if (this.isMobileAPK) {
        this.micProvider = new AndroidMicrophoneProvider(this.audioContext, this.selectedDeviceId, logCb);
      } else {
        this.micProvider = new WebMicrophoneProvider(this.audioContext, this.selectedDeviceId, logCb);
      }
      
      this.micStream = await this.micProvider.start();

      await this.populateAudioDevices();

      // 2. Setup WebAudio Graph
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      
      // Pre-amp gain boost 6x (+15dB)
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 6.0;

      this.guitarLowpass = this.audioContext.createBiquadFilter();
      this.guitarLowpass.type = 'lowpass';
      this.guitarLowpass.frequency.value = 1200; // Allow full guitar frequency range (E2 = 82Hz up to Capo 12 = 660Hz)

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.bufferSize;
      
      source.connect(this.gainNode);
      this.gainNode.connect(this.guitarLowpass);
      this.guitarLowpass.connect(this.analyserNode);

      // FIREFOX ENGINE OPTIMIZATION BUG WORKAROUND (SILENT): 
      // Connect to a 1Hz Lowpass filter. This forces Firefox to process the audio graph
      // and pump the microphone data, but filters out all audible sound so it doesn't output to speakers!
      this.dummyFilter = this.audioContext.createBiquadFilter();
      this.dummyFilter.type = 'lowpass';
      this.dummyFilter.frequency.value = 1; // 1 Hz = inaudible
      
      source.connect(this.dummyFilter);
      this.dummyFilter.connect(this.audioContext.destination);

      this.isListening = true;
      if (this.micToggleBtn) this.micToggleBtn.classList.add('active');
      if (this.micBtnText) this.micBtnText.textContent = 'Arrêter le Micro';

      this.statusBadgeEl.textContent = 'EN ÉCOUTE...';
      this.statusBadgeEl.className = 'status-badge listening';
      
      this.log('🔴 STATUT MICRO: ACTIF (Écoute en direct)');
    } catch (err) {
      this.log(`❌ ERREUR ACCÈS MICROPHONE: ${err.message}`);
      this.isListening = false;
      if (this.micToggleBtn) this.micToggleBtn.classList.remove('active');
      if (this.micBtnText) this.micBtnText.textContent = 'Activer le Micro';
      alert("Impossible d'accéder au microphone. Note : L'accès à distance nécessite impérativement une connexion HTTPS sécurisée (ex: https://accordeur.virtuaworld.org via Reverse Proxy Caddy/Nginx) ou http://localhost.");
    }
  }

  resetUI() {
    this.noteLetterEl.textContent = '--';
    this.noteOctaveEl.textContent = '';
    this.frequencyValEl.textContent = '-- Hz';
    this.centsValEl.textContent = '-- cents';
    this.statusBadgeEl.textContent = 'INACTIF';
    this.statusBadgeEl.className = 'status-badge';
    this.tunerCard.className = 'tuner-card';
    this.volumeFillEl.style.width = '0%';
    this.gauge.update(0, false, false);

    document.querySelectorAll('.string-pin').forEach(pin => pin.classList.remove('detected'));

    this.updateDebugSteps(null, 0, 0);
  }

  async runSyntheticTestTone() {
    this.log('🧪 Démarrage du test d\'onde synthétique (La 440 Hz sonore)...');
    
    if (!this.isListening) {
      await this.startMicrophone();
    }

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (!this.analyserNode) {
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.bufferSize;
    }

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = 440.0;
    gain.gain.value = 0.25;

    osc.connect(gain);
    gain.connect(this.analyserNode);
    gain.connect(this.audioContext.destination);

    this.isTestToneRunning = true;
    this.micBtnText.textContent = 'Test 440 Hz En Cours...';

    osc.start();

    setTimeout(() => {
      osc.stop();
      this.isTestToneRunning = false;
      this.micBtnText.textContent = this.isListening ? 'Arrêter le Micro' : 'Activer le Micro';
      this.log('🧪 Test 440 Hz terminé.');
    }, 3000);
  }

  loop() {
    let rawRMS = 0;
    let rawPeak = 0;
    let result = { frequency: null, clarity: 0, rms: 0 };
    const now = Date.now();

    try {
      if (this.isListening && this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      if (this.isListening && this.analyserNode) {
        this.analyserNode.getFloatTimeDomainData(this.audioBuffer);

        for (let i = 0; i < this.audioBuffer.length; i++) {
          const absVal = Math.abs(this.audioBuffer[i]);
          if (absVal > rawPeak) rawPeak = absVal;
          rawRMS += absVal * absVal;
        }
        rawRMS = Math.sqrt(rawRMS / this.audioBuffer.length);

        // BATTERY OPTIMIZATION: Skip heavy YIN math if in Eco Mode and room is silent (RMS < 0.003)
        if (!this.skipYinOnSilence || rawRMS > 0.003) {
          result = this.pitchDetector.detectPitch(this.audioBuffer, this.audioContext.sampleRate);
        } else {
          result = { frequency: null, clarity: 0, rms: rawRMS };
        }
        
        const volPercent = Math.min(100, Math.round((rawRMS || 0) * 4000));
        this.volumeFillEl.style.width = `${volPercent}%`;
        
        // Calculate dB FS level (-60 dB to 0 dB)
        const dbFS = rawRMS > 0.000001 ? Math.max(-60, Math.round(20 * Math.log10(rawRMS))) : -60;
        if (this.dbValEl) {
          this.dbValEl.textContent = `${dbFS > -60 ? dbFS + ' dB' : '-∞ dB'}`;
        }

        if (result && result.frequency && result.clarity >= 0.55) {
          let freq = result.frequency;

          // Dynamic Octave Folding based on active tuning strings:
          // Check if half-frequency (freq / 2) is a much better match for a string in the active tuning than freq itself.
          const strDirect = getClosestGuitarString(freq, this.currentTuningKey);
          const strHalf = getClosestGuitarString(freq / 2.0, this.currentTuningKey);
          
          if (strDirect && strHalf) {
            const diffDirect = Math.abs(freq - strDirect.freq);
            const diffHalf = Math.abs((freq / 2.0) - strHalf.freq);
            
            // If halving the frequency matches a valid tuning string within 3.5 Hz and is significantly better than direct match
            if (diffHalf < 3.5 && diffHalf < diffDirect - 5.0) {
              freq = freq / 2.0;
            }
          }

          // Fundamental Latch: At strong attack (RMS > 0.08), lock onto the fundamental guitar string
          if (rawRMS > 0.08) {
            const closestStr = getClosestGuitarString(freq, this.currentTuningKey);
            if (closestStr) {
              this.latchedStringFreq = closestStr.freq;
            }
          }

          // If currently latched on a string during sustain (RMS still active), suppress harmonic jumps (like A2 110Hz -> E3 165Hz harmonic)
          if (this.latchedStringFreq) {
            const ratio = freq / this.latchedStringFreq;
            // If frequency jumped to 1.5x (3rd harmonic e.g. 165Hz for 110Hz), 2x (octave), or 3x, snap back to fundamental
            if (Math.abs(ratio - 1.5) < 0.25) {
              freq = freq / 1.5; // Correct 3rd harmonic back to fundamental
            } else if (Math.abs(ratio - 2.0) < 0.3) {
              freq = freq / 2.0; // Correct 2nd harmonic back to fundamental
            } else if (Math.abs(ratio - 3.0) < 0.35) {
              freq = freq / 3.0; // Correct 4th harmonic back to fundamental
            }
          }

          // 1. Median filter over 7 samples to discard transient harmonic spikes
          this.freqHistory.push(freq);
          if (this.freqHistory.length > 7) this.freqHistory.shift();

          if (this.freqHistory.length >= 3) {
            const sorted = [...this.freqHistory].sort((a, b) => a - b);
            const rawMedianFreq = sorted[Math.floor(sorted.length / 2)];

            // 2. Exponential Moving Average (EMA) smoothing (~250ms window) for ultra-smooth needle movement
            if (!this.smoothedFrequency || Math.abs(rawMedianFreq - this.smoothedFrequency) > 30) {
              // Sudden big note jump -> reset instant jump
              this.smoothedFrequency = rawMedianFreq;
            } else {
              // Smooth small changes when turning guitar keys (alpha = 0.20)
              this.smoothedFrequency += 0.20 * (rawMedianFreq - this.smoothedFrequency);
            }
            
            this.lastFrequency = this.smoothedFrequency;
            this.lastPitchTime = now;
            this.processPitch(this.smoothedFrequency, result.clarity, rawRMS, rawPeak);
          }
        } else {
          this.freqHistory = [];
          this.smoothedFrequency = null;
          this.latchedStringFreq = null;
          
          if (now - this.lastPitchTime < this.pitchHoldDuration && this.lastFrequency) {
            this.processPitch(this.lastFrequency, 0.5, rawRMS, rawPeak);
          } else {
          this.noteLetterEl.textContent = '--';
          this.noteOctaveEl.textContent = '';
          this.frequencyValEl.textContent = '-- Hz';
          this.centsValEl.textContent = '-- cents';

          this.gauge.update(0, false, false);
          this.statusBadgeEl.textContent = 'EN ÉCOUTE...';
          this.statusBadgeEl.className = 'status-badge listening';
          this.tunerCard.className = 'tuner-card';
          document.querySelectorAll('.string-pin').forEach(pin => pin.classList.remove('detected'));

          if (now - this.lastLogTime > 2500) {
            this.lastLogTime = now;
            this.log(`📊 [MICRO ACTIF] Audio Stream Input: RMS ${Number(rawRMS).toFixed(5)}, Peak ${Number(rawPeak).toFixed(5)}`);
          }
        }
        }
      } else if (!this.isListening) {
        if (now - this.lastLogTime > 5000) {
          this.lastLogTime = now;
          // Silenced the repetitive MICRO INACTIF log to avoid spamming the console
        }
      }

      // BATTERY OPTIMIZATION: Throttle Canvas rendering to targetFPS (e.g., 30 FPS in Eco, 120 FPS in Turbo)
      if (this.frameInterval === 0 || (now - this.lastRenderTime >= this.frameInterval)) {
        if (this.frameInterval > 0) {
          this.lastRenderTime = now - ((now - this.lastRenderTime) % this.frameInterval);
        }
        
        this.gauge.render();
        this.visualizer.draw(this.isListening ? this.analyserNode : null);
        this.updateDebugSteps(result, rawRMS, rawPeak);
      }
      
    } catch (err) {
      this.log(`❌ ERREUR CRITIQUE DANS LOOP: ${err.message}`);
    }

    requestAnimationFrame(this.loop);
  }

  updateDebugSteps(yinResult, rms, peak) {
    // 1. Conduit Auditif
    if (this.isListening) {
      const track = this.micStream ? this.micStream.getAudioTracks()[0] : null;
      this.step1Status.textContent = track ? track.label : 'Micro Actif (Stream invisible)';
      this.step1Badge.textContent = 'OK (LIVE)';
      this.step1Badge.className = 'step-badge ok';
    } else if (this.isTestToneRunning) {
      this.step1Status.textContent = 'Générateur Synthétique 440 Hz';
      this.step1Badge.textContent = 'OK (TEST)';
      this.step1Badge.className = 'step-badge ok';
    } else {
      this.step1Status.textContent = 'Microphone Non Démarré';
      this.step1Badge.textContent = 'EN ATTENTE';
      this.step1Badge.className = 'step-badge pending';
    }

    // 2. Tympan (AudioContext)
    if (this.audioContext) {
      this.step2Status.textContent = `État: ${this.audioContext.state.toUpperCase()} | ${this.audioContext.sampleRate} Hz`;
      this.step2Badge.textContent = this.audioContext.state === 'running' ? 'OK (RUNNING)' : 'SUSPENDU';
      this.step2Badge.className = this.audioContext.state === 'running' ? 'step-badge ok' : 'step-badge warn';
    } else {
      this.step2Status.textContent = 'AudioContext Inactif';
      this.step2Badge.textContent = 'INACTIF';
      this.step2Badge.className = 'step-badge pending';
    }

    // 3. Signal PCM
    if (this.isListening) {
      const safeRms = Number(rms) || 0;
      const safePeak = Number(peak) || 0;
      this.step3Status.textContent = `RMS: ${safeRms.toFixed(5)} | Peak: ${safePeak.toFixed(5)}`;
      
      if (safePeak === 0) {
        this.step3Badge.textContent = 'SILENCE (0.000)';
        this.step3Badge.className = 'step-badge err';
      } else if (safeRms < 0.0004) {
        this.step3Badge.textContent = 'TRÈS FAIBLE';
        this.step3Badge.className = 'step-badge warn';
      } else {
        this.step3Badge.textContent = 'SIGNAL ACTIF';
        this.step3Badge.className = 'step-badge ok';
      }
    } else {
      this.step3Status.textContent = 'RMS: 0.0000 | Peak: 0.0000';
      this.step3Badge.textContent = 'MICRO ÉTEINT';
      this.step3Badge.className = 'step-badge pending';
    }

    // 4. Algorithme YIN
    if (this.isListening && yinResult && yinResult.frequency) {
      this.step4Status.textContent = `${yinResult.frequency.toFixed(1)} Hz | Clarté: ${(yinResult.clarity * 100).toFixed(0)}%`;
      this.step4Badge.textContent = 'PITCH DÉTECTÉ';
      this.step4Badge.className = 'step-badge ok';
    } else {
      this.step4Status.textContent = 'Hz: -- | Clarté: --';
      this.step4Badge.textContent = 'AUCUN PITCH';
      this.step4Badge.className = 'step-badge pending';
    }
  }

  processPitch(frequency, clarity = 1.0, rms = 0, peak = 0) {
    let targetFreq = 0;
    let centsOffset = 0;

    const parsedNote = frequencyToNote(frequency);

    if (this.manualTargetString) {
      targetFreq = this.manualTargetString.freq;
      centsOffset = 1200 * Math.log2(frequency / targetFreq);
      
      const targetNoteObj = frequencyToNote(targetFreq);
      this.noteLetterEl.textContent = targetNoteObj.noteName;
      this.noteOctaveEl.textContent = targetNoteObj.octave || '';
    } else {
      // Auto Mode: Lock strictly to the 6 guitar strings of the selected tuning (E2 A2 D3 G3 B3 E4)
      const closestString = getClosestGuitarString(frequency, this.currentTuningKey);

      if (closestString) {
        targetFreq = closestString.freq;
        centsOffset = 1200 * Math.log2(frequency / targetFreq);
        
        const stringNoteObj = frequencyToNote(closestString.freq);
        this.noteLetterEl.textContent = stringNoteObj.noteName;
        this.noteOctaveEl.textContent = stringNoteObj.octave || '';
        this.highlightDetectedString(closestString.stringNum);
      } else {
        targetFreq = parsedNote.exactFrequency;
        centsOffset = parsedNote.cents;
        this.noteLetterEl.textContent = parsedNote.noteName;
        this.noteOctaveEl.textContent = parsedNote.octave || '';
      }
    }

    const roundedCents = Number(centsOffset.toFixed(1));
    const isInTune = Math.abs(roundedCents) <= 3.5;

    this.frequencyValEl.textContent = `${frequency.toFixed(1)} Hz`;
    this.centsValEl.textContent = `${roundedCents > 0 ? '+' : ''}${roundedCents} cents`;

    this.tunerCard.className = 'tuner-card';
    this.statusBadgeEl.className = 'status-badge';

    if (isInTune) {
      this.statusBadgeEl.textContent = 'ACCORDÉ !';
      this.statusBadgeEl.classList.add('in-tune');
      this.tunerCard.classList.add('in-tune');
    } else if (roundedCents < 0) {
      this.statusBadgeEl.textContent = 'TROP BAS ♭';
      this.statusBadgeEl.classList.add('flat');
      this.tunerCard.classList.add('flat');
    } else {
      this.statusBadgeEl.textContent = 'TROP HAUT ♯';
      this.statusBadgeEl.classList.add('sharp');
      this.tunerCard.classList.add('sharp');
    }

    this.gauge.update(roundedCents, true, isInTune);

    const now = Date.now();
    if (now - (this.lastPitchLogTime || 0) > 600) {
      this.lastPitchLogTime = now;
      this.log(`🎵 Note: ${parsedNote.fullNote} (${frequency.toFixed(1)} Hz) | Cents: ${roundedCents > 0 ? '+' : ''}${roundedCents} | RMS: ${rms.toFixed(5)}`);
    }
  }

  highlightDetectedString(stringNum) {
    document.querySelectorAll('.string-pin').forEach(pin => {
      if (parseInt(pin.dataset.stringNum, 10) === stringNum) {
        pin.classList.add('detected');
      } else {
        pin.classList.remove('detected');
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new AccordeurApp();
});
