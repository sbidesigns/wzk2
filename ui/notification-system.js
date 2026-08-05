// ui/notification-system.js — Enhanced Notification/Toast System
//
// Features:
// - Multiple notification types: success, error, warning, info, achievement, reward
// - Stacking notifications (multiple visible at once)
// - Progress notifications for loading states
// - Toast-style and persistent notification modes
// - Position options: top-left, top-center, top-right, bottom-center
// - Custom icons, actions, and timeouts
// - Sound effect integration points
// - Queue management with max limits
// - Smooth enter/exit animations
// - Mobile-responsive design
// CSS: loaded via ui/styles/notification-system.css in index.html

/**
 * @enum {string}
 * Notification types
 */
export const NOTIFICATION_TYPE = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  ACHIEVEMENT: 'achievement',
  REWARD: 'reward',
  PROGRESS: 'progress'
};

/**
 * @enum {string}
 * Notification positions
 */
export const NOTIFICATION_POSITION = {
  TOP_LEFT: 'top-left',
  TOP_CENTER: 'top-center',
  TOP_RIGHT: 'top-right',
  BOTTOM_CENTER: 'bottom-center'
};

/**
 * Default configuration
 */
const DEFAULTS = {
  maxVisible: 5,
  defaultDuration: 3000,
  defaultPosition: NOTIFICATION_POSITION.TOP_RIGHT,
  stackSpacing: 10,
  enableSound: true,
  enableQueue: true
};

/**
 * Main NotificationSystem class
 */
class NotificationSystem {
  constructor() {
    this._container = null;
    this._notifications = new Map();
    this._queue = [];
    this._config = { ...DEFAULTS };
    this._counter = 0;
    this._idCounter = 0;
    
    // Singleton container reference
    this._containerCreated = false;
  }

  /**
   * Initialize system with optional config
   */
  init(config = {}) {
    this._config = { ...DEFAULTS, ...config };
    return this;
  }

  /**
   * Show a success notification
   */
  success(message, options = {}) {
    return this._show({
      type: NOTIFICATION_TYPE.SUCCESS,
      message,
      icon: options.icon || '✓',
      title: options.title || 'Success',
      ...options
    });
  }

  /**
   * Show an error notification
   */
  error(message, options = {}) {
    return this._show({
      type: NOTIFICATION_TYPE.ERROR,
      message,
      icon: options.icon || '✕',
      title: options.title || 'Error',
      duration: options.duration || 5000,
      ...options
    });
  }

  /**
   * Show a warning notification
   */
  warning(message, options = {}) {
    return this._show({
      type: NOTIFICATION_TYPE.WARNING,
      message,
      icon: options.icon || '⚠',
      title: options.title || 'Warning',
      ...options
    });
  }

  /**
   * Show an info notification
   */
  info(message, options = {}) {
    return this._show({
      type: NOTIFICATION_TYPE.INFO,
      message,
      icon: options.icon || 'ℹ',
      title: options.title || 'Info',
      ...options
    });
  }

  /**
   * Show an achievement unlocked notification
   */
  achievement(title, description, options = {}) {
    return this._show({
      type: NOTIFICATION_TYPE.ACHIEVEMENT,
      title: title || 'Achievement Unlocked!',
      message: description || '',
      icon: options.icon || '🏆',
      duration: options.duration || 4000,
      persistent: true,
      ...options
    });
  }

  /**
   * Show a reward earned notification
   */
  reward(rewardType, amount, options = {}) {
    const icons = { xp: '⭐', credits: '💰', gold: '🪙' };
    return this._show({
      type: NOTIFICATION_TYPE.REWARD,
      title: `+${amount} ${rewardType.toUpperCase()}`,
      message: options.message || 'Reward earned!',
      icon: options.icon || icons[rewardType] || '🎁',
      duration: options.duration || 3500,
      ...options
    });
  }

  /**
   * Show a progress/loading notification
   */
  progress(message, progressPercent, options = {}) {
    const id = `notif-progress-${this._idCounter++}`;
    
    if (!this._container) this._ensureContainer();

    const notifEl = this._createElement({
      id,
      type: NOTIFICATION_TYPE.PROGRESS,
      title: options.title || 'Loading...',
      message,
      icon: options.icon || '⏳',
      progress: progressPercent || 0,
      position: options.position || this._config.defaultPosition,
      persistent: true,
      showProgress: true,
      actions: []
    });

    this._container.appendChild(notifEl);
    this._notifications.set(id, { element: notifEl, timeout: null });

    // Trigger animation
    requestAnimationFrame(() => notifEl.classList.add('visible'));

    // Return updater function
    return {
      id,
      update: (newProgress) => {
        const progressBar = notifEl.querySelector('.notification-progress-bar');
        if (progressBar) {
          progressBar.style.width = `${Math.min(100, Math.max(0, newProgress))}%`;
        }
        const progressText = notifEl.querySelector('.notification-progress-text');
        if (progressText) {
          progressText.textContent = `${Math.round(newProgress)}%`;
        }
      },
      complete: (message, icon) => {
        this._completeProgress(id, message, icon);
      }
    };
  }

  /**
   * Complete a progress notification
   */
  _completeProgress(id, message = 'Complete!', icon = '✓') {
    const notifData = this._notifications.get(id);
    if (!notifData) return;

    const el = notifData.element;
    const progressSection = el.querySelector('.notification-progress-section');
    const iconEl = el.querySelector('.notification-icon');
    const msgEl = el.querySelector('.notification-message');

    if (iconEl) iconEl.textContent = icon;
    if (msgEl) msgEl.textContent = message;

    el.classList.remove('notification-progress');
    el.classList.add('notification-success');

    if (progressSection) {
      progressSection.innerHTML = `
        <div class="progress-complete-icon">✓</div>
        <span class="progress-complete-text">Complete!</span>
      `;
    }

    // Auto-dismiss after delay
    setTimeout(() => this._dismiss(id), 2000);
  }

  /**
   * Dismiss a specific notification
   */
  dismiss(id) {
    this._dismiss(id);
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this._notifications.forEach((data, id) => {
      this._dismiss(id, true);
    });
  }

  /**
   * Get current notification count
   */
  get count() {
    return this._notifications.size;
  }

  /**
   * Internal method to show notification
   */
  _show(options) {
    const id = `notif-${this._idCounter++}`;
    const opts = {
      duration: this._config.defaultDuration,
      position: this._config.defaultPosition,
      persistent: false,
      showProgress: false,
      actions: [],
      ...options,
      id
    };

    // Ensure container exists
    this._ensureContainer();

    // Check if we're at max visible non-persistent notifications
    const visibleNonPersistent = Array.from(this._notifications.values())
      .filter(d => !d.element.classList.contains('notification-persistent'));
    
    if (visibleNonPersistent.length >= this._config.maxVisible && !opts.persistent) {
      // Add to queue or dismiss oldest
      if (this._config.enableQueue) {
        this._queue.push(opts);
        return id;
      } else {
        // Dismiss oldest
        const oldestId = visibleNonPersistent[0]?.id;
        if (oldestId) this._dismiss(oldestId);
      }
    }

    // Create element
    const notifEl = this._createElement(opts);
    this._container.appendChild(notifEl);

    // Store reference
    let timeoutId = null;
    if (!opts.persistent) {
      timeoutId = setTimeout(() => this._dismiss(id), opts.duration);
    }

    this._notifications.set(id, { element: notifEl, timeout: timeoutId, options: opts });

    // Animate in
    requestAnimationFrame(() => {
      notifEl.classList.add('visible');
      
      // If progress type, animate bar after a tick
      if (opts.showProgress) {
        setTimeout(() => {
          const bar = notifEl.querySelector('.notification-progress-fill');
          if (bar) bar.style.width = `${opts.progress}%`;
        }, 50);
      }
    });

    // Emit event
    this._emit('notification:show', { id, ...opts });

    return id;
  }

  /**
   * Create notification DOM element
   */
  _createElement(opts) {
    const el = document.createElement('div');
    el.className = `notification notification-${opts.type}`;
    el.dataset.id = opts.id;
    el.setAttribute('role', 'alert');

    // Build inner HTML based on type
    let innerHTML = '';

    // Icon
    innerHTML += `
      <div class="notification-icon">${opts.icon}</div>
      <div class="notification-body">
        ${opts.title ? `<div class="notification-title">${opts.title}</div>` : ''}
        <div class="notification-message">${opts.message}</div>
    `;

    // Progress section (for progress type)
    if (opts.showProgress) {
      innerHTML += `
        <div class="notification-progress-section">
          <div class="notification-progress-track">
            <div class="notification-progress-fill" style="width: 0%"></div>
          </div>
          <span class="notification-progress-text">0%</span>
        </div>
      `;
      el.classList.add('notification-progress');
    }

    // Close button (for persistent)
    if (opts.persistent) {
      innerHTML += `
        <button class="notification-close" data-dismiss="${opts.id}" aria-label="Dismiss">✕</button>
      `;
      el.classList.add('notification-persistent');
    }

    // Actions
    if (opts.actions && opts.actions.length > 0) {
      innerHTML += '<div class="notification-actions">';
      opts.actions.forEach(action => {
        innerHTML += `
          <button class="notification-action-btn" data-action="${action.id}">${action.label}</button>
        `;
      });
      innerHTML += '</div>';
    }

    innerHTML += '</div>'; // Close body

    el.innerHTML = innerHTML;

    // Set position
    el.style.setProperty('--stack-index', this._getStackIndex(opts.position));

    // Setup action handlers
    el.querySelectorAll('.notification-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = opts.actions.find(a => a.id === btn.dataset.action);
        if (action?.onClick) action.onClick();
        this._dismiss(opts.id);
      });
    });

    // Setup close handler
    const closeBtn = el.querySelector('[data-dismiss]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this._dismiss(opts.id));
    }

    return el;
  }

  /**
   * Dismiss notification
   */
  _dismiss(id, immediate = false) {
    const data = this._notifications.get(id);
    if (!data) return;

    // Clear timeout
    if (data.timeout) {
      clearTimeout(data.timeout);
    }

    const el = data.element;
    el.classList.add(immediate ? 'removing-immediate' : 'removing');

    // Remove from map and DOM after animation
    setTimeout(() => {
      el.remove();
      this._notifications.delete(id);
      this._emit('notification:dismissed', { id });

      // Process queue
      if (this._queue.length > 0) {
        const nextOpts = this._queue.shift();
        this._show(nextOpts);
      }
    }, immediate ? 100 : 300);
  }

  /**
   * Get stack index for positioning
   */
  _getStackIndex(position) {
    const posNotifs = Array.from(this._notifications.values())
      .filter(d => d.options?.position === position).length;
    return posNotifs + 1; // 1-based for new item
  }

  /**
   * Ensure container exists
   */
  _ensureContainer() {
    if (this._container && document.contains(this._container)) return;

    this._container = document.createElement('div');
    this._container.id = 'notification-container';
    this._container.className = 'notification-container';
    document.body.appendChild(this._container);
    this._containerCreated = true;
  }

  /**
   * Event emitter
   */
  _emit(event, detail) {
    document.dispatchEvent(new CustomEvent(event, { detail }));
  }

  on(event, cb) { document.addEventListener(event, cb); }
  off(event, cb) { document.removeEventListener(event, cb); }
}

// Singleton instance
let _instance = null;

export function getNotificationSystem() {
  if (!_instance) _instance = new NotificationSystem();
  return _instance;
}

if (typeof window !== 'undefined') {
  window.__notifications = getNotificationSystem();
}

export default getNotificationSystem();
