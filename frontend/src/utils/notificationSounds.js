// Notification sound utility
class NotificationSounds {
  constructor() {
    this.sounds = {
      // Success sounds
      'order-placed': this.createSound(800, 0.1, 'sine'),
      'payment-success': this.createSound(600, 0.15, 'sine'),
      'ready-pickup': this.createSound(1000, 0.2, 'sine'),
      'delivered': this.createSound(1200, 0.25, 'sine'),
      
      // Info sounds
      'kitchen-started': this.createSound(400, 0.1, 'triangle'),
      'out-for-delivery': this.createSound(500, 0.15, 'triangle'),
      
      // Error sounds
      'payment-failed': this.createSound(200, 0.3, 'sawtooth'),
      'cancelled': this.createSound(150, 0.4, 'sawtooth'),
      
      // Default notification sound
      'default': this.createSound(600, 0.2, 'sine')
    };
    
    this.isEnabled = this.getSoundPreference();
  }

  // Create a simple beep sound using Web Audio API
  createSound(frequency, duration, waveType = 'sine') {
    return () => {
      if (!this.isEnabled) return;
      
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = waveType;
        
        // Create a nice envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      } catch (error) {
        console.warn('Could not play notification sound:', error);
      }
    };
  }

  // Play sound for notification type
  playSound(notificationType) {
    const sound = this.sounds[notificationType] || this.sounds.default;
    sound();
  }

  // Play a custom sound
  playCustomSound(frequency, duration, waveType = 'sine') {
    const sound = this.createSound(frequency, duration, waveType);
    sound();
  }

  // Enable/disable sounds
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('notificationSoundsEnabled', enabled.toString());
  }

  // Get sound preference from localStorage
  getSoundPreference() {
    const stored = localStorage.getItem('notificationSoundsEnabled');
    return stored !== null ? stored === 'true' : true; // Default to enabled
  }

  // Toggle sounds
  toggle() {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  // Play different notification patterns
  playSuccessPattern() {
    if (!this.isEnabled) return;
    
    setTimeout(() => this.playCustomSound(800, 0.1, 'sine'), 0);
    setTimeout(() => this.playCustomSound(1000, 0.1, 'sine'), 150);
    setTimeout(() => this.playCustomSound(1200, 0.2, 'sine'), 300);
  }

  playErrorPattern() {
    if (!this.isEnabled) return;
    
    setTimeout(() => this.playCustomSound(200, 0.2, 'sawtooth'), 0);
    setTimeout(() => this.playCustomSound(150, 0.2, 'sawtooth'), 200);
  }

  playInfoPattern() {
    if (!this.isEnabled) return;
    
    setTimeout(() => this.playCustomSound(600, 0.15, 'triangle'), 0);
    setTimeout(() => this.playCustomSound(800, 0.15, 'triangle'), 200);
  }

  // Play sound based on notification priority
  playByPriority(priority, notificationType) {
    if (!this.isEnabled) return;
    
    switch (priority) {
      case 'urgent':
        this.playErrorPattern();
        break;
      case 'high':
        this.playSuccessPattern();
        break;
      case 'medium':
        this.playInfoPattern();
        break;
      case 'low':
        this.playSound(notificationType);
        break;
      default:
        this.playSound(notificationType);
    }
  }
}

// Create singleton instance
const notificationSounds = new NotificationSounds();

export default notificationSounds;
