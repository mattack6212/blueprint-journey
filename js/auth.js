/* ============================================
   AUTH.JS — Netlify Identity Integration
   ============================================ */

(function () {
  'use strict';

  // Wait for Netlify Identity to load
  function initAuth() {
    if (typeof netlifyIdentity === 'undefined') {
      setTimeout(initAuth, 100);
      return;
    }

    netlifyIdentity.init();

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const protectedPages = ['dashboard.html', 'lesson.html'];
    const isProtected = protectedPages.some(function (page) {
      return currentPage.includes(page);
    });

    // If on a protected page, check auth status
    if (isProtected) {
      const user = netlifyIdentity.currentUser();
      if (!user) {
        window.location.href = '/login.html';
        return;
      }
      renderUserInfo(user);
    }

    // Handle login events
    netlifyIdentity.on('login', function (user) {
      netlifyIdentity.close();
      if (currentPage === 'login.html') {
        window.location.href = '/dashboard.html';
      } else {
        renderUserInfo(user);
      }
    });

    netlifyIdentity.on('logout', function () {
      window.location.href = '/login.html';
    });
  }

  // Render user name/email in nav
  function renderUserInfo(user) {
    var userEl = document.getElementById('user-display');
    if (userEl && user) {
      var name = (user.user_metadata && user.user_metadata.full_name) || user.email;
      userEl.textContent = name;
    }
  }

  // Login form handler
  function initLoginForm() {
    var form = document.getElementById('login-form');
    if (!form) return;

    // If already logged in, redirect to dashboard
    if (typeof netlifyIdentity !== 'undefined') {
      var user = netlifyIdentity.currentUser();
      if (user) {
        window.location.href = '/dashboard.html';
        return;
      }
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

      // Use Netlify Identity's GoTrue client
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
          // Fallback: open Netlify Identity widget
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

  // Logout handler
  window.handleLogout = function () {
    if (typeof netlifyIdentity !== 'undefined') {
      netlifyIdentity.logout();
    }
  };

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    initAuth();
    initLoginForm();
  });
})();
