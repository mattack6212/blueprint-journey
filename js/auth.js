/* ============================================
   AUTH.JS — Netlify Identity + Test Access
   ============================================ */

(function () {
  'use strict';

  var TEST_AUTH_KEY = 'blueprint_member_access';

  // Check if user is authenticated via either method
  function isAuthenticated() {
    // Check test/member access
    if (localStorage.getItem(TEST_AUTH_KEY)) {
      return true;
    }
    // Check Netlify Identity
    if (typeof netlifyIdentity !== 'undefined') {
      return !!netlifyIdentity.currentUser();
    }
    return false;
  }

  // Get display name
  function getDisplayName() {
    var testData = localStorage.getItem(TEST_AUTH_KEY);
    if (testData) {
      try { return JSON.parse(testData).name || 'Member'; } catch (e) { return 'Member'; }
    }
    if (typeof netlifyIdentity !== 'undefined') {
      var user = netlifyIdentity.currentUser();
      if (user) {
        return (user.user_metadata && user.user_metadata.full_name) || user.email;
      }
    }
    return 'Member';
  }

  // Wait for Netlify Identity to load, then init
  function initAuth() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var protectedPages = ['dashboard.html', 'lesson.html'];
    var isProtected = protectedPages.some(function (page) {
      return currentPage.includes(page);
    });

    // Protected page gate
    if (isProtected) {
      if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return;
      }
      renderUserInfo();
    }

    // Init Netlify Identity if available
    if (typeof netlifyIdentity !== 'undefined') {
      netlifyIdentity.init();

      netlifyIdentity.on('login', function () {
        netlifyIdentity.close();
        if (currentPage === 'login.html') {
          window.location.href = '/dashboard.html';
        } else {
          renderUserInfo();
        }
      });

      netlifyIdentity.on('logout', function () {
        localStorage.removeItem(TEST_AUTH_KEY);
        window.location.href = '/login.html';
      });
    }
  }

  // Render user name in nav
  function renderUserInfo() {
    var userEl = document.getElementById('user-display');
    if (userEl) {
      userEl.textContent = getDisplayName();
    }
  }

  // Login form handler (Netlify Identity)
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

  // Member Access bypass (for testing before Stripe is live)
  function initMemberAccess() {
    var btn = document.getElementById('member-access-btn');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.setItem(TEST_AUTH_KEY, JSON.stringify({
        name: 'Matt',
        granted: Date.now()
      }));
      window.location.href = '/dashboard.html';
    });
  }

  function showError(el, message) {
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
    }
  }

  // Logout handler
  window.handleLogout = function () {
    localStorage.removeItem(TEST_AUTH_KEY);
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
    initMemberAccess();
  });
})();
