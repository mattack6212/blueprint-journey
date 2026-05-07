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

  // Initialize auth — gates protected pages, handles invite tokens
  function initAuth() {
    var pathname = window.location.pathname;
    var inviteToken = getInviteToken();

    if (typeof netlifyIdentity !== 'undefined') {
      netlifyIdentity.init();

      // If an invite token is present, open the signup modal immediately
      if (inviteToken) {
        netlifyIdentity.on('init', function () {
          netlifyIdentity.open('signup');
        });
      }

      netlifyIdentity.on('login', function () {
        netlifyIdentity.close();
        window.location.href = '/dashboard.html';
      });

      netlifyIdentity.on('logout', function () {
        window.location.href = '/login.html';
      });
    }

    // Gate protected pages — redirect to login if not authenticated
    if (!isPublicPath(pathname)) {
      // Use init event so we wait for Netlify Identity to restore session
      if (typeof netlifyIdentity !== 'undefined') {
        netlifyIdentity.on('init', function (user) {
          if (!user) {
            window.location.href = '/login.html';
          } else {
            renderUserInfo();
          }
        });
      } else {
        // Widget not loaded at all — redirect to be safe
        window.location.href = '/login.html';
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
