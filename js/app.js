/* ============================================
   Tenant Management System — Main JavaScript
   File: js/app.js
   ============================================ */

// ─── State ──────────────────────────────────
let currentRole = '';
let currentTab  = 'signin';

// ─── Screen Management ───────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── Role Selection ───────────────────────────
function selectRole(role) {
  currentRole = role;

  // Set badge
  const badge = document.getElementById('role-badge');
  badge.className = 'role-badge ' + role;
  badge.textContent = role === 'tenant' ? '🏠 Tenant' : '🏢 Landlord';

  // Set auth titles
  document.getElementById('auth-title').textContent =
    role === 'tenant' ? 'Tenant Portal' : 'Landlord Portal';
  document.getElementById('auth-sub').textContent =
    role === 'tenant' ? 'Access your rental dashboard' : 'Manage your properties';

  // Apply role focus color to inputs
  document.querySelectorAll('.form-input').forEach(inp => {
    role === 'tenant'
      ? inp.classList.add('tenant-focus')
      : inp.classList.remove('tenant-focus');
  });

  // Switch button color based on role
  const signinBtn = document.getElementById('signin-btn');
  const signupBtn = document.getElementById('signup-btn');

  if (role === 'tenant') {
    signinBtn.className = 'btn-primary btn-blue';
    signupBtn.className = 'btn-primary btn-blue';
  } else {
    signinBtn.className = 'btn-primary btn-gold';
    signupBtn.className = 'btn-primary btn-gold';
  }

  clearErrors();
  showScreen('screen-auth');
  switchTab('signin');
}

// ─── Navigation ───────────────────────────────
function goBack() {
  showScreen('screen-role');
}

function goBackToRole() {
  showScreen('screen-role');
}

function showForgot() {
  document.getElementById('fp-email').value = '';
  hideError('fp-error');
  showScreen('screen-forgot');
}

function showAuth() {
  showScreen('screen-auth');
  switchTab('signin');
}

// ─── Tab Switching ────────────────────────────
function switchTab(tab) {
  currentTab = tab;

  document.getElementById('tab-signin').classList.toggle('active', tab === 'signin');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('form-signin').style.display = tab === 'signin' ? 'block' : 'none';
  document.getElementById('form-signup').style.display = tab === 'signup' ? 'block' : 'none';

  clearErrors();
}

// ─── Error Helpers ────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}

function hideError(id) {
  document.getElementById(id).classList.remove('show');
}

function clearErrors() {
  document.querySelectorAll('.error-msg').forEach(e => e.classList.remove('show'));
}

// ─── Validation ───────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Sign In Handler ──────────────────────────
function handleSignin() {
  const email = document.getElementById('signin-email').value.trim();
  const pass  = document.getElementById('signin-password').value;

  hideError('error-box');

  if (!email)               return showError('error-box', 'Please enter your email address.');
  if (!isValidEmail(email)) return showError('error-box', 'Please enter a valid email address.');
  if (!pass)                return showError('error-box', 'Please enter your password.');
  if (pass.length < 6)      return showError('error-box', 'Password must be at least 6 characters.');

  // Simulate loading (replace with real API call)
  const btn = document.getElementById('signin-btn');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = 'Sign In';
    btn.disabled = false;
    alert(`✅ Welcome ${currentRole}!\n\n(Connect your backend API here)`);
  }, 1500);
}

// ─── Sign Up Handler ──────────────────────────
function handleSignup() {
  const name    = document.getElementById('signup-name').value.trim();
  const email   = document.getElementById('signup-email').value.trim();
  const pass    = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;

  hideError('error-box');

  if (!name)                return showError('error-box', 'Please enter your full name.');
  if (!email)               return showError('error-box', 'Please enter your email address.');
  if (!isValidEmail(email)) return showError('error-box', 'Please enter a valid email address.');
  if (!pass)                return showError('error-box', 'Please enter a password.');
  if (pass.length < 8)      return showError('error-box', 'Password must be at least 8 characters.');
  if (pass !== confirm)     return showError('error-box', 'Passwords do not match. Please try again.');

  // Simulate loading (replace with real API call)
  const btn = document.getElementById('signup-btn');
  btn.textContent = 'Creating Account...';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = 'Create Account';
    btn.disabled = false;
    alert(`✅ Account created for ${name}!\n\n(Connect your backend API here)`);
  }, 1500);
}

// ─── Forgot Password Handler ──────────────────
function handleForgot() {
  const email = document.getElementById('fp-email').value.trim();

  hideError('fp-error');

  if (!email)               return showError('fp-error', 'Please enter your email address.');
  if (!isValidEmail(email)) return showError('fp-error', 'Please enter a valid email address.');

  const btn = document.getElementById('fp-btn');
  btn.textContent = 'Sending...';
  btn.disabled = true;

  // Simulate sending reset email (replace with real API call)
  setTimeout(() => {
    btn.textContent = 'Send Reset Link';
    btn.disabled = false;

    document.getElementById('success-email-display').textContent = email;
    showScreen('screen-success');
  }, 1500);
}

// ─── Password Strength Checker ────────────────
function checkStrength(pass) {
  const segs  = ['s1', 's2', 's3', 's4'].map(id => document.getElementById(id));
  const label = document.getElementById('strength-label');

  // Reset
  segs.forEach(s => { s.className = 'strength-seg'; });

  if (!pass) {
    label.textContent = '';
    return;
  }

  let score = 0;
  if (pass.length >= 8)        score++;
  if (/[A-Z]/.test(pass))      score++;
  if (/[0-9]/.test(pass))      score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;

  const classMap  = ['weak', 'weak', 'medium', 'strong'];
  const labelMap  = ['', 'Weak', 'Medium', 'Strong', 'Very Strong'];
  const colorMap  = ['', '#FF6B6B', '#FFA500', '#4ECDC4', '#4ECDC4'];

  for (let i = 0; i < score; i++) {
    segs[i].classList.add(classMap[i < 2 ? 0 : i < 3 ? 1 : 2]);
  }

  label.textContent  = labelMap[score];
  label.style.color  = colorMap[score];
}

// ─── Password Toggle (Show/Hide) ──────────────
function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  const isHidden = inp.type === 'password';

  inp.type = isHidden ? 'text' : 'password';

  btn.innerHTML = isHidden
    ? `<svg viewBox="0 0 24 24">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94
                 M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19
                 m-6.72-1.07a3 3 0 11-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
       </svg>`
    : `<svg viewBox="0 0 24 24">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
       </svg>`;
}
