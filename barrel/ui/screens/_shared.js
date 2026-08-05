// barrel/ui/screens/_shared.js
// Shared helpers for screens. NOT a screen itself — imported by other screen files.

// ============== DOM HELPERS ==============

export function el(tag, className = '', innerHTML = '') {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (innerHTML) e.innerHTML = innerHTML;
  return e;
}

export function button(label, variant = '', onClick = null, opts = {}) {
  const { icon, dataAction, sound } = opts;
  const b = el('button', `btn ${variant}`);
  
  // Add icon if provided
  if (icon) {
    const iconSpan = el('span', 'btn-icon');
    iconSpan.innerHTML = icon;
    b.appendChild(iconSpan);
    b.appendChild(document.createTextNode(label));
  } else {
    b.textContent = label;
  }
  
  if (dataAction) b.dataset.action = dataAction;
  if (onClick) {
    b.addEventListener('click', (e) => {
      playUISound(sound || 'click');
      hapticFeedback('light');
      onClick(e);
    });
  }
  
  // Hover sound
  b.addEventListener('mouseenter', () => {
    playUISound('hover');
  });
  
  return b;
}

export function statBar(label, value, max = 10) {
  const wrap = el('div', 'stat-bar');
  wrap.innerHTML = `
    <div class="stat-bar-label"><span>${label}</span><span>${value}/${max}</span></div>
    <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${(value / max) * 100}%"></div></div>
  `;
  return wrap;
}

// ============== NAVIGATION COMPONENTS ==============

export function topNav() {
  const nav = el('div', 'top-nav');
  nav.innerHTML = `
    <div class="top-nav-left">
      <button class="btn btn-ghost btn-sm" data-action="back">‹ Back</button>
    </div>
    <div class="top-nav-right">
      <div class="currency-chip">
        <div class="currency-chip-icon"></div>
        <span id="currency-credits">25,000</span>
      </div>
      <div class="currency-chip currency-chip-gold">
        <div class="currency-chip-icon"></div>
        <span id="currency-gold">500</span>
      </div>
      <div class="player-chip">
        <div class="player-chip-avatar">A</div>
        <div class="player-chip-info">
          <div class="player-chip-name">Ace</div>
          <div class="player-chip-level">LVL 7</div>
        </div>
      </div>
    </div>
  `;
  nav.querySelector('[data-action="back"]').addEventListener('click', () => {
    playUISound('navigate');
    window.__uiRouter?.pop();
  });
  return nav;
}

export function screenHeader(title, subtitle = '') {
  const h = el('div', 'screen-header');
  h.innerHTML = `
    <div>
      <h1 class="screen-title">${title}</h1>
      ${subtitle ? `<div class="screen-subtitle">${subtitle}</div>` : ''}
    </div>
  `;
  return h;
}

// ============== AUDIO SYSTEM ==============

/**
 * Play UI sound effect with fallbacks
 * @param {string} name - Sound name (click, hover, navigate, confirm, cancel, error, success)
 */
export function playUISound(name = 'click') {
  // Try dedicated audio effects system first
  if (window.__audioEffects) {
    window.__audioEffects.play(`ui.${name}`);
    return;
  }
  
  // Try engine audio system
  const engine = window.__engine;
  if (engine?.audio) {
    engine.audio.ui(name);
    return;
  }
  
  // Silent fail - no audio system available
}

/**
 * Play game sound effect
 * @param {string} name - Sound name (engineStart, countdown, go, boost, item, crash, drift)
 */
export function playGameSound(name) {
  if (window.__audioEffects) {
    window.__audioEffects.play(`game.${name}`);
  }
}

// ============== HAPTIC FEEDBACK ==============

/**
 * Provide haptic feedback on supported devices
 * @param {'light' | 'medium' | 'heavy'} style - Intensity of feedback
 */
export function hapticFeedback(style = 'light') {
  // Check for vibration API support
  if ('vibrate' in navigator) {
    switch (style) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'heavy':
        navigator.vibrate(30);
        break;
      default:
        navigator.vibrate(15);
    }
  }
}

// ============== VISUAL FEEDBACK ==============

/**
 * Show a brief flash/ripple effect at an element
 * @param {HTMLElement} element - Target element
 * @param {string} color - Ripple color (default: accent-primary)
 */
export function rippleEffect(element, color = null) {
  if (!element) return;
  
  const ripple = document.createElement('span');
  ripple.className = 'btn-ripple';
  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: ${color || 'var(--accent-primary)'};
    transform: scale(0);
    animation: ripple 0.6s ease-out forwards;
    pointer-events: none;
  `;
  
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = '50%';
  ripple.style.top = '50%';
  ripple.style.marginLeft = `-${size / 2}px`;
  ripple.style.marginTop = `-${size / 2}px`;
  
  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
}

/**
 * Shake an element to indicate error or invalid action
 * @param {HTMLElement} element - Target element
 */
export function shakeEffect(element) {
  if (!element) return;
  
  element.style.animation = 'shake 0.5s cubic-bezier(0.455, 0.03, 0.515, 0.955)';
  hapticFeedback('medium');
  playUISound('error');
  
  setTimeout(() => {
    element.style.animation = '';
  }, 500);
}

/**
 * Bounce/pulse an element to draw attention
 * @param {HTMLElement} element - Target element
 */
export function bounceIn(element) {
  if (!element) return;
  
  element.style.animation = 'bounceIn 0.6s cubic-bezier(0.215, 0.61, 0.355, 1)';
  playUISound('confirm');
  
  setTimeout(() => {
    element.style.animation = '';
  }, 600);
}

// ============== ANIMATION UTILITIES ==============

/**
 * Animate a number value with easing
 * @param {Function} callback - Callback with current value (0-1 range)
 * @param {number} duration - Animation duration in ms
 * @returns {Promise} Resolves when complete
 */
export function animateValue(callback, duration = 300) {
  return new Promise(resolve => {
    const start = performance.now();
    
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      callback(eased);
      
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        callback(1);
        resolve(true);
      }
    }
    
    requestAnimationFrame(tick);
  });
}

/**
 * Delay execution for specified time
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise}
 */
export function delay(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============== UTILITY FUNCTIONS ==============

/**
 * Format number with commas (e.g., 25000 -> "25,000")
 * @param {number} num - Number to format
 * @returns {string}
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Clamp value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum bound
 * @param {number} max - Maximum bound
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick random item from array
 * @param {Array} arr - Array to pick from
 * @returns {*}
 */
export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Export everything
export default {
  el,
  button,
  statBar,
  topNav,
  screenHeader,
  playUISound,
  playGameSound,
  hapticFeedback,
  rippleEffect,
  shakeEffect,
  bounceIn,
  animateValue,
  delay,
  formatNumber,
  clamp,
  lerp,
  randomInt,
  randomPick
};
