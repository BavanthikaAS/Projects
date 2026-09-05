/**
 * Auction Hub - Main Application Script (app.js)
 * Global UI initialization, toast manager, auth synchronization
 */

// Toast Notification Manager
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <span class="toast-close" onclick="this.parentElement.remove()">&times;</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// HTML Escaper for XSS Prevention
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Currency Formatter
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Countdown Timer Formatter
function formatTimeRemaining(endTimeStr) {
  const end = new Date(endTimeStr).getTime();
  const now = new Date().getTime();
  const diff = end - now;

  if (diff <= 0) {
    return { text: 'Auction Ended', expired: true, endingSoon: false };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const endingSoon = diff < 2 * 60 * 60 * 1000; // Under 2 hours

  let text = '';
  if (days > 0) {
    text = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m left`;
  } else {
    text = `${minutes}m ${seconds}s left`;
  }

  return { text, expired: false, endingSoon };
}

// Auth State & Nav Synchronization
function updateNavAuthState() {
  const user = API.getUser();
  const authNav = document.getElementById('nav-auth-container');
  if (!authNav) return;

  if (user) {
    authNav.innerHTML = `
      <div class="dropdown-container">
        <button class="nav-link" id="user-menu-btn" onclick="toggleUserDropdown()" aria-label="User profile menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>${escapeHtml(user.full_name || 'Account')}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="dropdown-menu" id="user-dropdown-menu">
          <div class="dropdown-header">
            <div class="dropdown-user-name">${escapeHtml(user.full_name)}</div>
            <div class="dropdown-user-role">${escapeHtml(user.email)} &bull; <strong>${user.role.toUpperCase()}</strong></div>
          </div>
          <a href="/dashboard.html?tab=orders" class="dropdown-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            Buyer Orders & Bids
          </a>
          <a href="/seller.html" class="dropdown-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Seller Dashboard
          </a>
          ${user.role === 'admin' ? `
            <a href="/admin.html" class="dropdown-item" style="color: #F59E0B; font-weight: 600;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Admin Moderation
            </a>
          ` : ''}
          <div class="dropdown-divider"></div>
          <button onclick="API.logout()" class="dropdown-item" style="width: 100%; text-align: left; color: var(--color-error);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sign Out
          </button>
        </div>
      </div>
    `;
  } else {
    authNav.innerHTML = `
      <a href="/login.html" class="nav-link">Sign In</a>
      <a href="/register.html" class="btn btn-accent" style="padding: 0.35rem 0.9rem; font-size: 0.85rem;">Register</a>
    `;
  }
}

function toggleUserDropdown() {
  const menu = document.getElementById('user-dropdown-menu');
  if (menu) {
    menu.classList.toggle('show');
  }
}

// Close dropdowns on outside click
window.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown-container')) {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
  }
});

// Sync on load & on auth event
window.addEventListener('DOMContentLoaded', async () => {
  updateNavAuthState();
  if (API.isAuthenticated()) {
    await API.fetchCurrentUser();
    updateNavAuthState();
  }
});

window.addEventListener('auth:change', () => {
  updateNavAuthState();
});
