/* ============================================
   AUTH.JS — Netlify Identity
   ============================================ */

(function () {
  'use strict';

  // Pages that do NOT require authentication
  var PUBLIC_PATHS = ['/', '/index.html', '/login.html', '/enroll/', '/enroll/index.html', '/welcome/', '/welcome/index.html'];

  function isPublicPath(pathname) {
    // Exact match against allowlist
    for (var i = 0; i < PUBLIC_PATHS.length; i++) {
      if (pathname === PUBLIC_PATHS[i]) return true;
    }
    // Prefix match for /enroll/ and /welcome/ subdirectories
    if (pathname.indexOf('/enroll/') === 0) return true;
    if (pathname.indexOf('/welcome/') === 0) return true;
    return false;
  }

  // Check if user is authenticated via Netlify Identity
  function isAuthenticated() {
    if (typeof netlifyIdentity !== 'undefined') {
      return !!netlifyIdentity.currentUser();
    }
    return false;
  }

  // Get display name from Netlify Identity user
  function getDisplayName() {
    if (typeof netlifyIdentity !== 'undefined') {
      var user = netlifyIdentity.currentUser();
      if (user) {
        return (user.user_metadata && user.user_metadata.full_name) || user.email;
      }
    }
    return 'Member';
  }

  // Handle invite token in URL (from Netlify Identity email invite links)
  // Tokens appear as ?invite_token=... or #invite_token=...
  function getInviteToken() {
    var search = window.location.search;
    var hash = window.location.hash;

    var match = search.match(/[?&]invite_token=([^&]+)/);
    if (match) return match[1];

    match = hash.match(/invite_token=([^&]+)/);
    if (match) return match[1];

    return null;
  }

  // Initialize auth — handles invite tokens, gates protected pages
  function initAuth() {
    var pathname = window.location.pathname;
    // Capture token NOW — the widget strips it from the URL hash during auto-init
    var inviteToken = getInviteToken();

    if (typeof netlifyIdentity === 'undefined') {
      // Widget not loaded — redirect protected pages to be safe
      if (!isPublicPath(pathname)) {
        window.location.href = '/login.html';
      }
      return;
    }

    if (inviteToken) {
      console.log('[Auth] Invite token detected on ' + pathname);
    }

    // Do NOT call netlifyIdentity.init() — the widget script tag auto-inits when loaded.
    // Calling init() again injects a second iframe and double-fires all events,
    // causing the overlay iframe to block the page with display:block !important.

    netlifyIdentity.on('init', function (user) {
      if (inviteToken) {
        // Widget has processed and stripped the token from the URL.
        // Small delay lets the widget iframe finish rendering before open().
        console.log('[Auth] init fired on ' + pathname + ' — invite token present, opening signup modal');
        setTimeout(function () {
          console.log('[Auth] netlifyIdentity.open("signup") called');
          netlifyIdentity.open('signup');
        }, 150);
        return;
      }

      // No invite token — handle page gating
      if (!isPublicPath(pathname)) {
        if (!user) {
          window.location.href = '/login.html';
        } else {
          renderUserInfo();
        }
      }
    });

    netlifyIdentity.on('login', function () {
      netlifyIdentity.close();
      window.location.href = '/dashboard.html';
    });

    netlifyIdentity.on('logout', function () {
      window.location.href = '/login.html';
    });

    // Fallback: if auto-init already fired before our listeners registered,
    // handle page gating directly from current session state.
    if (!inviteToken && !isPublicPath(pathname)) {
      if (!netlifyIdentity.currentUser()) {
        window.location.href = '/login.html';
      } else {
        renderUserInfo();
      }
    }
  }

  // Render user name in nav (dashboard, lesson pages)
  function renderUserInfo() {
    var userEl = document.getElementById('user-display');
    if (userEl) {
      userEl.textContent = getDisplayName();
    }
    var nameEl = document.getElementById('dash-user-name');
    if (nameEl) {
      var name = getDisplayName();
      // Only show first name if full_name is available, otherwise show nothing extra
      if (name && name !== 'Member') {
        nameEl.textContent = ', ' + name.split(' ')[0];
      }
    }
  }

  // Login form handler
  function initLoginForm() {
    var form = document.getElementById('login-form');
    if (!form) return;

    // Already authenticated — go to dashboard
    if (isAuthenticated()) {
      window.location.href = '/dashboard.html';
      return;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('login-email').value;
      var password = document.getElementById('login-password').value;
      var errorEl = document.getElementById('login-error');

      if (!email || !password) {
        showError(errorEl, 'Please enter your email and password.');
        return;
      }

      if (typeof netlifyIdentity !== 'undefined') {
        var gotrue = netlifyIdentity.gotrue;
        if (gotrue) {
          gotrue
            .login(email, password, true)
            .then(function () {
              window.location.href = '/dashboard.html';
            })
            .catch(function (err) {
              showError(errorEl, err.message || 'Invalid email or password.');
            });
        } else {
          netlifyIdentity.open('login');
        }
      }
    });
  }

  function showError(el, message) {
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
    }
  }

  // Logout handler (called from dashboard nav)
  window.handleLogout = function () {
    if (typeof netlifyIdentity !== 'undefined' && netlifyIdentity.currentUser()) {
      netlifyIdentity.logout();
    } else {
      window.location.href = '/login.html';
    }
  };

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    initAuth();
    initLoginForm();
  });
})();
