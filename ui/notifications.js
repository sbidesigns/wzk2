// ui/notifications.js — Toast notification & achievement popup system

class NotificationSystem {
  constructor() {
    this.container = null;
    this.queue = [];
    this.activeNotifications = new Set();
    this.maxVisible = 4;
    this.defaultDuration = 3000;
    this.isInitialized = false;
  }

  /**
   * Initialize the notification container
   */
  init() {
    if (this.isInitialized) return this;

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.setAttribute('role', 'status');
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-label', 'Game notifications');
    
    // Inject styles
    this._injectStyles();
    
    document.body.appendChild(this.container);
    this.isInitialized = true;
    
    return this;
  }

  /**
   * Show a toast notification
   */
  show(message, options = {}) {
    const {
      type = 'info', // info, success, warning, error, achievement, currency
      duration = this.defaultDuration,
      title,
      icon,
      action,
      persist = false,
      sound = true,
    } = options;

    const notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      title,
      icon,
      action,
      persist,
      sound,
      timestamp: Date.now(),
    };

    this.queue.push(notification);
    this._processQueue();
    
    return notification.id;
  }

  /** Convenience methods */
  info(message, options = {}) { return this.show(message, { ...options, type: 'info' }); }
  success(message, options = {}) { return this.show(message, { ...options, type: 'success' }); }
  warning(message, options = {}) { return this.show(message, { ...options, type: 'warning' }); }
  error(message, options = {}) { return this.show(message, { ...options, type: 'error' }); }

  /**
   * Show achievement unlocked notification
   */
  achievement(achievement) {
    const id = this.show(achievement.description || 'Achievement Unlocked!', {
      type: 'achievement',
      title: achievement.name || 'ACHIEVEMENT',
      icon: achievement.icon || '🏆',
      duration: 5000,
      sound: true,
    });
    
    return id;
  }

  /**
   * Show currency earned notification
   */
  currencyEarned(amount, type = 'credits') {
    const icons = { credits: '💰', gold: '🥇', premium: '💎' };
    return this.show(`+${amount.toLocaleString()} ${type}`, {
      type: 'currency',
      icon: icons[type] || '💰',
      duration: 2000,
      sound: false,
    });
  }

  /**
   * Show XP gained notification
   */
  xpGained(amount, levelUps = []) {
    if (levelUps.length > 0) {
      return this.show(`LEVEL UP! Now level ${levelUps[0].newLevel}`, {
        type: 'success',
        title: '⬆️ LEVEL UP!',
        icon: '✨',
        duration: 4000,
        sound: true,
      });
    }
    
    return this.show(`+${amount} XP`, {
      type: 'info',
      icon: '⭐',
      duration: 2000,
      sound: false,
    });
  }

  /**
   * Dismiss a specific notification
   */
  dismiss(id) {
    const element = document.getElementById(id);
    if (element) {
      this._dismissNotification(element);
    }
  }

  /**
   * Dismiss all active notifications
   */
  dismissAll() {
    this.activeNotifications.forEach(el => {
      this._dismissNotification(el);
    });
  }

  /**
   * Clear queue without animating
   */
  clearQueue() {
    this.queue = [];
  }

  // === PRIVATE METHODS ===

  _processQueue() {
    if (this.queue.length === 0) return;
    if (this.activeNotifications.size >= this.maxVisible) return;

    const notif = this.queue.shift();
    this._renderNotification(notif);
    
    // Process next in queue
    requestAnimationFrame(() => this._processQueue());
  }

  _renderNotification(notif) {
    const el = document.createElement('div');
    el.id = notif.id;
    el.className = `notification notification-${notif.type}`;
    el.setAttribute('data-notification-id', notif.id);
    
    // Build content based on type
    let innerHTML = '';
    
    // Icon
    const iconHtml = notif.icon ? `<span class="notification-icon">${notif.icon}</span>` : '';
    
    // Content wrapper
    let contentHtml = '';
    if (notif.title) {
      contentHtml += `<div class="notification-title">${this._escapeHtml(notif.title)}</div>`;
    }
    contentHtml += `<div class="notification-message">${this._escapeHtml(notif.message)}</div>`;
    
    // Action button
    const actionHtml = notif.action 
      ? `<button class="notification-action" data-action="${this._escapeHtml(notif.action.label)}">${this._escapeHtml(notif.action.label)}</button>`
      : '';

    // Close button (non-persistent only)
    const closeHtml = !notif.persist 
      ? `<button class="notification-close" aria-label="Dismiss">&times;</button>`
      : '';

    innerHTML = `
      <div class="notification-inner">
        ${iconHtml}
        <div class="notification-content">
          ${contentHtml}
        </div>
        ${actionHtml}
        ${closeHtml}
      </div>
      <div class="notification-progress"></div>
    `;
    
    el.innerHTML = innerHTML;
    
    // Event listeners
    const closeBtn = el.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this._dismissNotification(el));
    }
    
    const actionBtn = el.querySelector('.notification-action');
    if (actionBtn && notif.action?.callback) {
      actionBtn.addEventListener('click', () => {
        notif.action.callback();
        this._dismissNotification(el);
      });
    }

    // Add to DOM
    this.container.appendChild(el);
    this.activeNotifications.add(el);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      el.classList.add('visible');
      
      // Play sound if available
      if (notif.sound && window.__audioEffects) {
        switch (notif.type) {
          case 'achievement': window.__audioEffects.playUISound('success'); break;
          case 'error': window.__audioEffects.playUISound('error'); break;
          default: window.__audioEffects.playUISound('confirm');
        }
      }
    });

    // Auto-dismiss after duration
    if (!notif.persist) {
      setTimeout(() => {
        this._dismissNotification(el);
      }, notif.duration || this.defaultDuration);
    }
  }

  _dismissNotification(el) {
    if (!el || !el.parentNode || el.classList.contains('dismissing')) return;
    
    el.classList.add('dismissing');
    el.classList.remove('visible');
    this.activeNotifications.delete(el);
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
      // Process any queued notifications
      this._processQueue();
    }, 400); // Match CSS transition duration
  }

  _injectStyles() {
    const styleId = 'notification-system-styles';
    if (document.getElementById(styleId)) return;
    
    const css = `
#notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 380px;
  width: calc(100% - 40px);
  pointer-events: none;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.notification {
  background: rgba(18, 20, 31, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: hidden;
  opacity: 0;
  transform: translateX(100%) scale(0.9);
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              0 2px 8px rgba(0, 0, 0, 0.2);
}

.notification.visible {
  opacity: 1;
  transform: translateX(0) scale(1);
}

.notification.dismissing {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

/* Type-specific styles */
.notification-success {
  border-color: rgba(61, 220, 132, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              0 0 24px -4px rgba(61, 220, 132, 0.3);
}

.notification-error {
  border-color: rgba(255, 61, 90, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              0 0 24px -4px rgba(255, 61, 90, 0.3);
}

.notification-warning {
  border-color: rgba(255, 177, 61, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              0 0 24px -4px rgba(255, 177, 61, 0.3);
}

.notification-achievement {
  background: linear-gradient(135deg, rgba(18, 20, 31, 0.98), rgba(30, 15, 25, 0.95));
  border-color: rgba(255, 210, 63, 0.5);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5),
              0 0 40px -8px rgba(255, 210, 63, 0.25);
}

.notification-achievement .notification-icon {
  font-size: 28px;
  animation: achievementPulse 1s ease-in-out infinite;
}

@keyframes achievementPulse {
  0%, 100% { transform: scale(1) rotate(-5deg); }
  50% { transform: scale(1.15) rotate(5deg); }
}

.notification-currency {
  border-color: rgba(255, 210, 63, 0.3);
}

/* Inner layout */
.notification-inner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  position: relative;
}

.notification-icon {
  font-size: 22px;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 77, 46, 0.2), rgba(255, 140, 0, 0.1));
  border-radius: 8px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #ffd23f;
  margin-bottom: 4px;
}

.notification-message {
  font-size: 14px;
  line-height: 1.4;
  color: #f5f6fa;
  word-wrap: break-word;
}

/* Action button */
.notification-action {
  padding: 6px 14px;
  background: linear-gradient(135deg, #ff4d2e, #ff8c00);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: center;
  flex-shrink: 0;
}

.notification-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 77, 46, 0.4);
}

/* Close button */
.notification-close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #a0a4b0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.notification-close:hover {
  background: rgba(255, 77, 46, 0.3);
  color: white;
}

/* Progress bar (auto-dismiss timer) */
.notification-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #ff4d2e, #ff8c00);
  animation: progressShrink linear forwards;
  border-radius: 0 0 0 12px;
}

@keyframes progressShrink {
  from { width: 100%; }
  to { width: 0%; }
}

/* Responsive */
@media (max-width: 480px) {
  #notification-container {
    top: auto;
    bottom: 80px; /* Above touch controls */
    left: 10px;
    right: 10px;
    max-width: none;
  }
  
  .notification-inner {
    padding: 12px;
    gap: 10px;
  }
  
  .notification-icon {
    font-size: 18px;
    width: 28px;
    height: 28px;
  }
  
  .notification-message {
    font-size: 13px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .notification {
    transition: opacity 0.15s ease;
    transform: none;
  }
  
  .notification.visible,
  .notification.dismissing {
    transform: none;
  }
  
  @keyframes progressShrink {
    from { width: 100%; opacity: 1; }
    to { width: 100%; opacity: 0; }
  }
}
`;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Singleton
const notifications = new NotificationSystem();

export { NotificationSystem, notifications };
export default notifications;
window.__notifications = notifications;
