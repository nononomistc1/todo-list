// Utility functions for the Todo List App

export function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

export function createTodo({ text, category = 'General', dueDate = null }) {
  return {
    id: generateId(),
    text: text.trim(),
    completed: false,
    category,
    dueDate,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Sound Effects System
class SoundManager {
  constructor() {
    this.audioContext = null;
    this.soundsEnabled = true;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.soundsEnabled = false;
    }
  }

  playSound(frequency = 800, duration = 0.1, type = 'sine') {
    if (!this.soundsEnabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Error playing sound:', e);
    }
  }

  playClick() {
    this.playSound(800, 0.1, 'sine');
  }

  playSuccess() {
    this.playSound(1000, 0.2, 'sine');
  }

  playError() {
    this.playSound(400, 0.3, 'sawtooth');
  }

  playDelete() {
    this.playSound(300, 0.2, 'triangle');
  }

  playToggle() {
    this.playSound(600, 0.15, 'square');
  }

  toggleSounds() {
    this.soundsEnabled = !this.soundsEnabled;
    return this.soundsEnabled;
  }

  isEnabled() {
    return this.soundsEnabled;
  }
}

export const soundManager = new SoundManager();
