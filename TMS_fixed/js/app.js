// ═══════════════════════════════════════════════════════════════
//  TMS — app.js  v3.0
//  MongoDB Atlas + Real Google OAuth 2.0 (GSI)
//  Handles: auth, session, role selection, UI helpers, Google flow
// ═══════════════════════════════════════════════════════════════

// ── Configuration ─────────────────────────────────────────────
// Google OAuth client ID registered in Google Cloud Console
const GOOGLE_CLIENT_ID = '1092570435598-nicfmpo6mpqo6a1h36eg614082k8994l.apps.googleusercontent.com';

// Backend API base URL — change to production URL when deploying
const API_BASE = 'http://localhost:5000/api';

// ── LocalStorage keys ──────────────────────────────────────────
// Centralized to prevent typo bugs across the codebase
const LS_TOKEN = 'tms_token';
const LS_USER  = 'tms_user';

// ── Role → dashboard mapping ───────────────────────────────────
// Each role has its own HTML dashboard page
const DASHBOARD_MAP = {
  admin:    'pages/admin-dashboard.html',
  landlord: 'pages/landlord-dashboard.html',
  tenant:   'pages/tenant-dashboard.html',
};

// ── Session helpers ────────────────────────────────────────────

/** Read the stored JWT from localStorage */
const getToken = () => localStorage.getItem(LS_TOKEN);

/** Persist a JWT to localStorage */
const setToken = (t) => localStorage.setItem(LS_TOKEN, t);

/** Persist a user object (serialized as JSON) */
const setUser = (u) => localStorage.setItem(LS_USER, JSON.stringify(u));

/** Read and deserialize the stored user object */
const getUser = () => {
  try   { return JSON.parse(localStorage.getItem(LS_USER)); }
  catch { return null; }
};

/** Remove token and user from localStorage (logout) */
const clearAuth = () => {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
};

// ── API helper ─────────────────────────────────────────────────

/**
 * Centralized fetch wrapper — automatically attaches the
 * Authorization header when a JWT token is available.
 *
 * @param {string} endpoint - path after API_BASE, e.g. '/auth/login'
 * @param {string} method   - HTTP method (default 'GET')
 * @param {Object} body     - request body for POST/PUT (optional)
 * @returns {{ ok: boolean, data: Object }}
 */
async function api(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  // Attach JWT bearer token if the user is already signed in
  const token = getToken();
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;

  // Serialize body for mutation requests
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API_BASE + endpoint, opts);
  const data = await res.json();
  return { ok: res.ok, data };
}

// ── Redirect by role ───────────────────────────────────────────

/**
 * Navigate the user to the correct dashboard for their role.
 * Falls back to the tenant dashboard for unknown roles.
 * @param {string} role - 'admin' | 'landlord' | 'tenant'
 */
function goToDashboard(role) {
  const path = DASHBOARD_MAP[role] || DASHBOARD_MAP.tenant;
  window.location.replace(path);
}

// ── UI helpers ─────────────────────────────────────────────────

/**
 * Display an error message in the #error-box element.
 * @param {string} msg
 */
function showErr(msg) {
  const box = document.getElementById('error-box');
  if (box) {
    box.textContent   = msg;
    box.style.display = 'block';
  }
}

/**
 * Clear and hide the error box.
 */
function clearErr() {
  const box = document.getElementById('error-box');
  if (box) {
    box.textContent   = '';
    box.style.display = 'none';
  }
}

/**
 * Toggle a button between its normal and loading state.
 * Disables the button and shows "Please wait…" while loading.
 * @param {string}  id      - button element ID
 * @param {boolean} loading - true = show spinner state
 * @param {string}  txt     - original button label to restore
 */
function setBtnLoad(id, loading, txt) {
  const btn = document.getElementById(id);
  if (btn) {
    btn.disabled    = loading;
    btn.textContent = loading ? 'Please wait…' : txt;
  }
}

// ── Tab switching ──────────────────────────────────────────────

/**
 * Switch between Sign In and Sign Up tabs.
 * Also hides the forgot-password screen if visible.
 * @param {string} tab - 'signin' | 'signup'
 */
function switchTab(tab) {
  clearErr();

  const si = document.getElementById('form-signin');
  const su = document.getElementById('form-signup');
  const ti = document.getElementById('tab-signin');
  const tu = document.getElementById('tab-signup');

  if (tab === 'signin') {
    si.style.display = '';
    su.style.display = 'none';
    ti.classList.add('active');
    tu.classList.remove('active');
  } else {
    si.style.display = 'none';
    su.style.display = '';
    ti.classList.remove('active');
    tu.classList.add('active');
  }

  // Hide forgot-password screen if it was open
  const sf = document.getElementById('screen-forgot');
  if (sf) sf.style.display = 'none';
}

// ── Role selection ─────────────────────────────────────────────

// Tracks which role the user has clicked on the signup form
let selRole = '';

/**
 * Mark a role card as selected and store the choice.
 * @param {string} role - 'tenant' | 'landlord'
 */
function selectRole(role) {
  selRole = role;

  // Clear selected state from both cards first
  document.getElementById('role-tenant')?.classList.remove('selected');
  document.getElementById('role-landlord')?.classList.remove('selected');

  // Apply selected state to the chosen card
  document.getElementById('role-' + role)?.classList.add('selected');

  // Hide the "please select a role" validation error
  const errEl = document.getElementById('role-error');
  if (errEl) errEl.style.display = 'none';
}

// ── Password strength meter ─────────────────────────────────────

/**
 * Update the password strength bar and label based on the input value.
 * Checks: length ≥ 8, uppercase, number, special character.
 * @param {string} val - current password input value
 */
function checkStrength(val) {
  const colors = ['#FF6B6B', '#FFB347', '#C9A96E', '#4ECDC4'];

  // Count how many strength criteria are met
  let score = 0;
  if (val.length >= 8)             score++;
  if (/[A-Z]/.test(val))           score++;
  if (/[0-9]/.test(val))           score++;
  if (/[^A-Za-z0-9]/.test(val))    score++;

  // Update each segment's color
  ['s1', 's2', 's3', 's4'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.background = i < score ? colors[score - 1] : '';
  });

  // Update the strength label text
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const lbl = document.getElementById('strength-label');
  if (lbl) {
    lbl.textContent = score > 0 ? labels[score] : '';
    lbl.style.color = colors[score - 1] || '';
  }
}

/**
 * Toggle password field between plain text and masked input.
 * Adjusts eye icon opacity to indicate current state.
 * @param {string}      id  - input element ID
 * @param {HTMLElement} btn - the toggle button element
 */
function togglePass(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type          = inp.type === 'password' ? 'text' : 'password';
  btn.style.opacity = inp.type === 'text' ? '1' : '0.5';
}

// ── Forgot password flow ───────────────────────────────────────

/** Show the forgot-password screen, hiding auth tabs and forms */
function showForgot() {
  document.getElementById('form-signin').style.display    = 'none';
  document.getElementById('form-signup').style.display    = 'none';
  document.getElementById('main-tabs').style.display      = 'none';
  document.getElementById('screen-forgot').style.display  = '';
  clearErr();
}

/** Return to the sign-in tab from any secondary screen */
function showAuth() {
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = 'none';
  document.getElementById('main-tabs').style.display      = '';
  switchTab('signin');
}

/**
 * Handle forgot-password form submission.
 * Shows the success screen with the entered email address.
 */
function handleForgot() {
  const email = document.getElementById('fp-email')?.value.trim();
  const errEl = document.getElementById('fp-error');

  if (!email) {
    if (errEl) { errEl.textContent = 'Enter your email.'; errEl.style.display = 'block'; }
    return;
  }

  // Show the success confirmation screen
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = '';
  document.getElementById('success-email-display').textContent = email;
}

// ═══════════════════════════════════════════════════════════════
//  SIGN IN
// ═══════════════════════════════════════════════════════════════

/**
 * Handle the sign-in form submission.
 * Validates inputs, calls the login API, stores session, redirects.
 */
async function handleSignin() {
  clearErr();

  const email = document.getElementById('signin-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('signin-password')?.value;

  // Validate required fields
  if (!email || !pass) { showErr('Enter email and password.'); return; }

  setBtnLoad('signin-btn', true, 'Sign In');
  try {
    const { ok, data } = await api('/auth/login', 'POST', { email, password: pass });

    if (ok && data.success) {
      setToken(data.token);
      setUser(data.user);
      goToDashboard(data.user.role);
    } else {
      showErr(data.message || 'Login failed.');
    }
  } catch {
    showErr('Cannot connect to server. Make sure backend is running (npm start).');
  } finally {
    setBtnLoad('signin-btn', false, 'Sign In');
  }
}

// ═══════════════════════════════════════════════════════════════
//  SIGN UP
// ═══════════════════════════════════════════════════════════════

/**
 * Handle the sign-up form submission.
 * Validates all fields, calls the register API, stores session, redirects.
 */
async function handleSignup() {
  clearErr();

  const name  = document.getElementById('signup-name')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('signup-password')?.value;
  const conf  = document.getElementById('signup-confirm')?.value;

  // Validate required fields
  if (!name || !email || !pass || !conf) { showErr('Fill in all fields.'); return; }

  // Validate passwords match
  if (pass !== conf) { showErr('Passwords do not match.'); return; }

  // Enforce minimum password length
  if (pass.length < 6) { showErr('Password must be at least 6 characters.'); return; }

  // Enforce role selection
  if (!selRole) {
    const roleErr = document.getElementById('role-error');
    if (roleErr) roleErr.style.display = 'block';
    showErr('Select Tenant or Landlord.');
    return;
  }

  setBtnLoad('signup-btn', true, 'Create Account');
  try {
    const { ok, data } = await api('/auth/register', 'POST', {
      name, email, password: pass, role: selRole,
    });

    if (ok && data.success) {
      setToken(data.token);
      setUser(data.user);
      goToDashboard(data.user.role);
    } else {
      showErr(data.message || 'Registration failed.');
    }
  } catch {
    showErr('Cannot connect to server.');
  } finally {
    setBtnLoad('signup-btn', false, 'Create Account');
  }
}

// ═══════════════════════════════════════════════════════════════
//  GOOGLE OAUTH 2.0
// ═══════════════════════════════════════════════════════════════

// Tracks whether the user clicked "Sign in" or "Sign up" via Google
let gMode = '';

/**
 * Initialize the Google Identity Services library.
 * Called once the GSI script has loaded.
 */
function initGoogleAuth() {
  if (!window.google) return;
  google.accounts.id.initialize({
    client_id:   GOOGLE_CLIENT_ID,
    callback:    handleGoogleCred,
    auto_select: false,
    ux_mode:     'popup',
  });
}

/**
 * Callback fired by Google after the user completes OAuth.
 * Sends the credential to the backend for verification.
 * @param {{ credential: string }} response - Google GSI response object
 */
async function handleGoogleCred(response) {
  try {
    clearErr();
    const { ok, data } = await api('/auth/google', 'POST', {
      credential: response.credential,
      role:       selRole || undefined,
      mode:       gMode,
    });

    if (ok && data.success) {
      setToken(data.token);
      setUser(data.user);
      closeGModal();
      goToDashboard(data.user.role);
    } else {
      showErr(data.message || 'Google sign-in failed.');
    }
  } catch {
    showErr('Cannot connect to server.');
  }
}

/**
 * Trigger Google sign-in flow from the Sign In tab.
 * Falls back to the email-only modal if GSI is unavailable.
 */
function handleGoogleSignin() {
  clearErr();
  gMode = 'signin';
  if (window.google) { triggerGPopup(); return; }
  openGModal('signin');
}

/**
 * Trigger Google sign-up flow from the Sign Up tab.
 * Requires a role to be selected first.
 */
function handleGoogleSignup() {
  clearErr();
  gMode = 'signup';

  if (!selRole) {
    const roleErr = document.getElementById('role-error');
    if (roleErr) roleErr.style.display = 'block';
    showErr('Select Tenant or Landlord first.');
    return;
  }

  if (window.google) { triggerGPopup(); return; }
  openGModal('signup');
}

/**
 * Programmatically trigger the GSI popup by rendering a hidden
 * button and clicking it. Falls back to the prompt API on failure.
 */
function triggerGPopup() {
  let box = document.getElementById('_g_btn_box');
  if (!box) {
    box           = document.createElement('div');
    box.id        = '_g_btn_box';
    box.style.cssText = 'position:fixed;top:-999px;left:-999px';
    document.body.appendChild(box);
  }
  box.innerHTML = '';

  google.accounts.id.renderButton(box, { theme: 'outline', size: 'large' });

  setTimeout(() => {
    const btn = box.querySelector('[role=button]') || box.firstElementChild;
    if (btn) {
      btn.click();
    } else {
      // Fall back to the One Tap prompt if button not found
      google.accounts.id.prompt(notification => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          openGModal(gMode);
        }
      });
    }
  }, 100);
}

// ── Google fallback modal ──────────────────────────────────────
// Used when GSI popup is blocked or unavailable (dev environments)

/**
 * Open the email-only Google fallback modal.
 * @param {string} mode - 'signin' | 'signup'
 */
function openGModal(mode) {
  document.getElementById('g-modal-title').textContent =
    mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google';
  document.getElementById('g-modal-sub').textContent =
    mode === 'signin' ? 'Enter your Gmail address.' : 'Enter Gmail to register with.';

  document.getElementById('g-email-input').value = '';
  document.getElementById('g-error').classList.remove('show');
  document.getElementById('g-overlay').classList.add('open');

  // Auto-focus the email input after the modal animates in
  setTimeout(() => document.getElementById('g-email-input').focus(), 120);
}

/** Close the Google fallback modal */
function closeGModal() {
  document.getElementById('g-overlay')?.classList.remove('open');
}

/**
 * Submit the Google fallback modal (email-only authentication).
 * Calls the /auth/google-fallback endpoint with the email.
 */
async function confirmGoogle() {
  const email = document.getElementById('g-email-input')?.value.trim().toLowerCase();
  const errEl = document.getElementById('g-error');

  // Helper to show an error inside the modal
  const gErr = (msg) => {
    if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
  };

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) { gErr('Enter valid email.'); return; }

  try {
    const { ok, data } = await api('/auth/google-fallback', 'POST', {
      email,
      role: selRole,
      mode: gMode,
    });

    if (ok && data.success) {
      setToken(data.token);
      setUser(data.user);
      closeGModal();
      goToDashboard(data.user.role);
    } else {
      gErr(data.message || 'Failed.');
    }
  } catch {
    gErr('Cannot connect to server.');
  }
}

// Close modal on Escape key
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeGModal(); });

// ── Load Google GSI script dynamically ────────────────────────
// Injected at runtime to keep the HTML clean
(function () {
  const script   = document.createElement('script');
  script.src     = 'https://accounts.google.com/gsi/client';
  script.async   = true;
  script.defer   = true;
  script.onload  = initGoogleAuth;
  document.head.appendChild(script);
})();
