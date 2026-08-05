// core/AudioManager.js
// IMMUTABLE CORE — wraps howler.js. Bus layout from config. Music + SFX + UI + engine.

import { EventBus } from './EventBus.js';

export class AudioManager {
  constructor() {
    this._Howler = null;
    this._buses = new Map();        // busName -> Howl group / master gain
    this._sounds = new Map();       // id -> { howl, bus, positional? }
    this._config = null;
    this._currentMusic = null;
    this._currentMusicId = null;
  }

  async init(config = {}) {
    if (!window.Howler) {
      console.warn('[AudioManager] Howler not loaded - audio will be disabled');
      this._disabled = true;
      return this;
    }
    this._Howler = window.Howler;
    this._config = config;
    this._disabled = false;
    
    // Set global Howler configuration
    if (window.Howler.ctx) {
      // AudioContext exists
    }
    
    // Set up buses via Howler volume; Howler doesn't have native buses, so we simulate with grouped volume tracking
    const buses = config.buses || {
      master: { volume: 1.0, muted: false },
      music: { volume: 0.7, muted: false },
      sfx: { volume: 0.9, muted: false },
      ui: { volume: 0.6, muted: false }
    };
    
    for (const [name, settings] of Object.entries(buses)) {
      this._buses.set(name, { 
        volume: settings.volume ?? 1.0, 
        muted: settings.muted ?? false, 
        sounds: new Set() 
      });
    }
    return this;
  }

  setBusVolume(bus, volume) {
    const b = this._buses.get(bus);
    if (!b) return;
    b.volume = volume;
    for (const soundId of b.sounds) {
      const sound = this._sounds.get(soundId);
      if (sound && !sound.positional) sound.howl.volume(volume * (sound.baseVolume || 1));
    }
    EventBus.emit('audio:busVolume', { bus, volume });
  }

  setBusMuted(bus, muted) {
    const b = this._buses.get(bus);
    if (!b) return;
    b.muted = muted;
    for (const soundId of b.sounds) {
      const sound = this._sounds.get(soundId);
      if (sound) sound.howl.mute(muted);
    }
    EventBus.emit('audio:busMuted', { bus, muted });
  }

  registerSound(id, { src, bus = 'sfx', loop = false, volume = 1, positional = false, sprite }) {
    if (this._disabled || !window.Howl) {
      console.warn(`[AudioManager] Audio disabled, skipping sound registration: ${id}`);
      return id;
    }
    const Howl = window.Howl;
    
    // Validate src
    if (!src) {
      console.warn(`[AudioManager] No source provided for sound: ${id}`);
      return id;
    }
    
    try {
      const howl = new Howl({
        src: Array.isArray(src) ? src : [src],
        loop, 
        volume: volume,
        sprite,
        format: ['mp3', 'ogg', 'wav'],
        // Error handling for load failures
        onloaderror: (soundId, err) => {
          console.warn(`[AudioManager] Failed to load sound ${id}:`, err);
        }
      });
      this._sounds.set(id, { howl, bus, baseVolume: volume, positional });
      const b = this._buses.get(bus);
      if (b) {
        b.sounds.add(id);
        howl.volume(b.volume * volume);
        howl.mute(b.muted);
      }
      return id;
    } catch (err) {
      console.warn(`[AudioManager] Error registering sound ${id}:`, err.message);
      return id;
    }
  }

  play(id, opts = {}) {
    if (this._disabled) return null;
    const sound = this._sounds.get(id);
    if (!sound) {
      console.warn(`AudioManager.play: unknown sound id "${id}"`);
      return null;
    }
    try {
      const soundId = sound.howl.play();
      if (opts.volume != null && sound.howl) {
        sound.howl.volume(opts.volume * (this._buses.get(sound.bus)?.volume || 1), soundId);
      }
      return soundId;
    } catch (err) {
      console.warn(`[AudioManager] Failed to play sound ${id}:`, err.message);
      return null;
    }
  }

  stop(id, soundId = null) {
    const sound = this._sounds.get(id);
    if (!sound) return;
    if (soundId) sound.howl.stop(soundId);
    else sound.howl.stop();
  }

  playMusic(id, fadeMs = 600) {
    if (this._currentMusic === id) return;
    const Howl = window.Howler;
    // Fade out current
    if (this._currentMusic && this._currentMusicId != null) {
      const prev = this._sounds.get(this._currentMusic);
      if (prev) {
        prev.howl.fade(prev.howl.volume(this._currentMusicId), 0, fadeMs, this._currentMusicId);
        prev.howl.once('fade', () => prev.howl.stop(this._currentMusicId), this._currentMusicId);
      }
    }
    this._currentMusic = id;
    const sound = this._sounds.get(id);
    if (!sound) return;
    sound.howl.volume(0);
    this._currentMusicId = sound.howl.play();
    sound.howl.fade(0, this._buses.get('music')?.volume || 0.7, fadeMs, this._currentMusicId);
  }

  stopMusic(fadeMs = 600) {
    if (!this._currentMusic) return;
    const sound = this._sounds.get(this._currentMusic);
    if (sound && this._currentMusicId != null) {
      sound.howl.fade(sound.howl.volume(this._currentMusicId), 0, fadeMs, this._currentMusicId);
      sound.howl.once('fade', () => sound.howl.stop(this._currentMusicId), this._currentMusicId);
    }
    this._currentMusic = null;
    this._currentMusicId = null;
  }

  // SFX shortcut for UI clicks etc.
  ui(soundName) {
    return this.play(`ui.${soundName}`);
  }

  getBuses() {
    const out = {};
    for (const [name, b] of this._buses) out[name] = { volume: b.volume, muted: b.muted };
    return out;
  }
}

export const audioManager = new AudioManager();
