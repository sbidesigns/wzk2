// ui/audio-effects.js
// Sound effects system for Warzone Kart UI interactions
// Uses Howler.js (loaded as vendor global) for audio playback

class AudioEffects {
  constructor() {
    this._enabled = true;
    this._volume = 0.7;
    this._sounds = new Map();
    this._initialized = false;
  }

  async init() {
    if (this._initialized || !window.Howler) {
      console.warn('[AudioEffects] Howler not available - sounds disabled');
      return;
    }

    // Define UI sound effects with base64 encoded simple tones or URLs
    const soundDefs = {
      // UI interaction sounds (simple synthesized)
      'ui.click': { urls: this._generateBeep(800, 0.05), volume: 0.3 },
      'ui.hover': { urls: this._generateBeep(600, 0.03), volume: 0.15 },
      'ui.navigate': { urls: this._generateBeep(500, 0.08), volume: 0.25 },
      'ui.confirm': { urls: this._generateBeep(1000, 0.1), volume: 0.4 },
      'ui.cancel': { urls: this._generateBeep(300, 0.08), volume: 0.3 },
      'ui.error': { urls: this._generateBeep(200, 0.15), volume: 0.35 },
      'ui.success': { 
        urls: this._generateChord([523, 659, 784], 0.2), 
        volume: 0.4 
      },
      
      // Game action sounds placeholder (would be replaced with real SFX)
      'game.engineStart': { urls: this._generateRamp(100, 1500, 0.3), volume: 0.3 },
      'game.countdown': { urls: this._generateBeep(880, 0.15), volume: 0.35 },
      'game.go': { urls: this._generateBeep(1200, 0.2), volume: 0.4 },
      'game.boost': { urls: this._generateSweep(200, 2000, 0.3), volume: 0.25 },
      'game.item': { urls: this._generateBeep(660, 0.12), volume: 0.3 },
      'game.crash': { urls: this._generateNoise(0.2), volume: 0.3 },
      'game.drift': { urls: this._generateSweep(400, 600, 0.15), volume: 0.2 },
      
      // Menu ambient sounds
      'menu.ambient': { 
        urls: this._generatePad([130.81, 146.83, 164.81], 2, 0.1),
        volume: 0.08,
        loop: true 
      }
    };

    try {
      for (const [id, def] of Object.entries(soundDefs)) {
        const howl = new window.Howl({
          src: def.urls,
          volume: def.volume * this._volume,
          loop: def.loop || false,
        });
        
        // Cache error handling
        howl.on('loaderror', (_, err) => {
          console.warn(`[AudioEffects] Failed to load ${id}:`, err);
        });
        
        this._sounds.set(id, howl);
      }
      
      this._initialized = true;
      console.log(`[AudioEffects] Initialized with ${this._sounds.size} sounds`);
    } catch (err) {
      console.error('[AudioEffects] Initialization failed:', err);
    }
  }

  // Play a sound by ID
  play(id, opts = {}) {
    if (!this._enabled || !this._initialized) return null;
    
    const sound = this._sounds.get(id);
    if (!sound) {
      console.warn(`[AudioEffects] Unknown sound: ${id}`);
      return null;
    }

    try {
      const soundId = sound.play();
      
      // Apply options
      if (opts.volume !== undefined) {
        sound.volume(opts.volume * this._volume, soundId);
      }
      
      return soundId;
    } catch (err) {
      console.warn(`[AudioEffects] Error playing ${id}:`, err.message);
      return null;
    }
  }

  // Stop a sound
  stop(id, soundId = null) {
    const sound = this._sounds.get(id);
    if (sound) {
      if (soundId !== null && soundId !== undefined) {
        sound.stop(soundId);
      } else {
        sound.stop();
      }
    }
  }

  // Set master volume
  setVolume(vol) {
    this._volume = Math.max(0, Math.min(1, vol));
    
    // Update all loaded sounds
    this._sounds.forEach((sound) => {
      // Volume will be applied on next play
    });
  }

  // Enable/disable all sounds
  setEnabled(enabled) {
    this._enabled = enabled;
    
    if (!enabled) {
      // Stop all playing sounds
      this._sounds.forEach((sound) => sound.stop());
    }
  }

  // Generate a simple beep tone using Web Audio API (fallback)
  _generateBeep(frequency, duration) {
    // Return a data URL with generated audio
    try {
      return [this._createToneDataUrl(frequency, duration)];
    } catch (e) {
      return ['data:audio/wav;base64,UklGRnoAAABXQVZFZmzIBAAAAAABAAEAQB8AIAcAAACABACAYI0AIA0AABAZoF//AA=='];
    }
  }

  _generateChord(frequencies, duration) {
    try {
      return [this._createToneDataUrl(frequencies[0], duration)];
    } catch (e) {
      return ['data:audio/wav;base64,UklGRnoAAABXQVZFZmzIBAAAAAABAAEAQB8AIAcAAACABACAYk0AIA0AABAZoF//AA=='];
    }
  }

  _generateRamp(startFreq, endFreq, duration) {
    try {
      return [this._createToneDataUrl(startFreq, duration)];
    } catch (e) {
      return ['data:audio/wav;base64,UklGRnoAAABXQVZFZmzIBAAAAAABAAEAQB8AIAcAAACABACAYQ0AIA0AABAZoF//AA=='];
    }
  }

  _generateSweep(startFreq, endFreq, duration) {
    try {
      return [this._createToneDataUrl(startFreq, duration)];
    } catch (e) {
      return ['data:audio/wav;base64,UklGRnoAAABXQVZFZmzIBAAAAAABAAEAQB8AIAcAAACABACAYU0AIA0AABAZoF//AA=='];
    }
  }

  _generateNoise(duration) {
    try {
      return [this._createNoiseDataUrl(duration)];
    } catch (e) {
      return ['data:audio/wav;base64,UklGRnoAAABXQVZFZmzIBAAAAAABAAEAQB8AIAcAAACABACAYA0AIA0AABAZoF//AA=='];
    }
  }

  _generatePad(frequencies, duration, volume) {
    try {
      return [this._createToneDataUrl(frequencies[0], duration)];
    } catch (e) {
      return ['data:audio/wav;base64,UklGRnoAAABXQVZFZmzIBAAAAAABAAEAQB8AIAcAAACABACAYM0AIA0AABAZoF//AA=='];
    }
  }

  // Create a WAV file data URL from parameters
  _createToneDataUrl(frequency = 440, duration = 0.1) {
    const sampleRate = 22050;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    this._writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    this._writeString(view, 8, 'WAVE');
    this._writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size = 16
    view.setUint16(20, 1, true); // AudioFormat = PCM
    view.setUint16(22, 1, true); // NumChannels = 1
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 1, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    this._writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Write sine wave samples
    let amplitude = 0.7 * 32767; // Max amplitude for 16-bit
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Simple envelope to prevent clicks
      const envelope = Math.min(1, t / 0.005) * Math.min(1, (duration - t) / 0.005);
      const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude * envelope;
      view.setInt16(44 + i * 2, sample, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  _createNoiseDataUrl(duration = 0.2) {
    const sampleRate = 22050;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    this._writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    this._writeString(view, 8, 'WAVE');
    this._writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 1, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this._writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Write noise samples with decay
    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      const decay = 1 - t; // Linear decay
      const sample = (Math.random() * 2 - 1) * decay * 28000;
      view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample)), true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  _writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // Cleanup blob URLs when no longer needed
  cleanup() {
    this._sounds.forEach((sound) => {
      if (sound.state() === 'unloaded') return;
      sound.unload();
    });
    this._sounds.clear();
    this._initialized = false;
  }
}

// Export singleton instance
export const audioEffects = new AudioEffects();

// Convenience function for playing UI sounds
export function playUISound(name) {
  const engine = window.__engine;
  
  // Try the dedicated audio effects system first
  if (typeof audioEffects !== 'undefined') {
    audioEffects.play(`ui.${name}`);
  }
  
  // Fallback to engine's built-in audio system
  if (engine?.audio) {
    engine.audio.ui(name);
  }
}

export default audioEffects;
