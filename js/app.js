// ═══════════════════════════════════════════════════════════════
//  TMS — app.js  v3.0
//  MongoDB Atlas + Real Google OAuth 2.0 (GSI)
//  Handles: auth, session, role selection, UI helpers, Google flow
// ═══════════════════════════════════════════════════════════════

// ── Configuration ─────────────────────────────────────────────
// Google OAuth 2.0 Client ID — registered in Google Cloud Console.
// Must match the Authorized JavaScript Origins for the current domain.
// Update this when moving from localhost to a production domain.
const GOOGLE_CLIENT_ID = '1092570435598-nicfmpo6mpqo6a1h36eg614082k8994l.apps.googleusercontent.com';

// Base URL for all backend API requests.
// Points to localhost in development — update to the deployed
// backend URL (e.g. https://your-app.onrender.com/api) in production.
const API_BASE = 'http://localhost:5000/api';

// ── LocalStorage keys ──────────────────────────────────────────
// Defined as constants so all reads and writes go through the same
// key strings — eliminates typo bugs from scattered string literals.
const LS_TOKEN = 'tms_token'; // stores the JWT string
const LS_USER  = 'tms_user';  // stores the serialized user object

// ── Role → dashboard mapping ───────────────────────────────────
// Maps each role string to the correct dashboard HTML file path.
// Used by goToDashboard() after a successful login or OAuth flow.
// 'tenant' is also the fallback for any unrecognized role.
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
 * Switch between Sign In and Sign Up tabs on the login page.
 * Shows the correct form, updates tab active states, clears errors,
 * and hides the forgot-password screen if it was open.
 *
 * Element IDs managed:
 *   form-signin / form-signup     — the form panels
 *   tab-signin  / tab-signup      — the tab buttons
 *   screen-forgot                 — forgot password screen
 *
 * @param {string} tab - 'signin' | 'signup'
 */
function switchTab(tab) {
  // Always clear the error box when switching tabs
  clearErr();

  const si = document.getElementById('form-signin');
  const su = document.getElementById('form-signup');
  const ti = document.getElementById('tab-signin');
  const tu = document.getElementById('tab-signup');

  if (tab === 'signin') {
    // Show sign-in form, hide sign-up form
    si.style.display = '';
    su.style.display = 'none';
    ti.classList.add('active');
    tu.classList.remove('active');
  } else {
    // Show sign-up form, hide sign-in form
    si.style.display = 'none';
    su.style.display = '';
    ti.classList.remove('active');
    tu.classList.add('active');
  }

  // If the user clicked a tab while on the forgot-password screen,
  // return to the main auth panel
  const sf = document.getElementById('screen-forgot');
  if (sf) sf.style.display = 'none';
}

// ── Role selection ─────────────────────────────────────────────

// Module-level variable — persists the selected role across function calls.
// Reset to '' if the page is reloaded or the user navigates away.
let selRole = '';

/**
 * Mark a role card as selected and persist the choice in selRole.
 * Clears the selection from the other card and hides the role
 * validation error message.
 *
 * Called from onclick on the Tenant / Landlord role cards in index.html.
 *
 * @param {string} role - 'tenant' | 'landlord'
 */
function selectRole(role) {
  selRole = role;

  // Remove 'selected' from both cards before applying to the chosen one
  // — prevents both cards from appearing selected simultaneously
  document.getElementById('role-tenant')?.classList.remove('selected');
  document.getElementById('role-landlord')?.classList.remove('selected');

  // Apply selected state to the clicked card
  document.getElementById('role-' + role)?.classList.add('selected');

  // Hide the inline validation error that appears when user submits
  // without selecting a role first
  const errEl = document.getElementById('role-error');
  if (errEl) errEl.style.display = 'none';
}

// ── Password strength meter ─────────────────────────────────────

/**
 * Update the 4-segment password strength bar and label.
 *
 * Scoring — one point per criterion met:
 *   1. Length ≥ 8 characters
 *   2. Contains at least one uppercase letter
 *   3. Contains at least one digit
 *   4. Contains at least one special character
 *
 * Score → label: 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong
 *
 * @param {string} val - current value of the password input
 */
function checkStrength(val) {
  // Colors correspond to score 1–4 (Weak → Strong)
  const colors = ['#FF6B6B', '#FFB347', '#C9A96E', '#4ECDC4'];

  // Count satisfied criteria
  let score = 0;
  if (val.length >= 8)           score++; // length
  if (/[A-Z]/.test(val))         score++; // uppercase
  if (/[0-9]/.test(val))         score++; // digit
  if (/[^A-Za-z0-9]/.test(val))  score++; // special char

  // Colour each segment: filled if index < score, reset otherwise
  ['s1', 's2', 's3', 's4'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.background = i < score ? colors[score - 1] : '';
  });

  // Update the text label below the bar
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const lbl = document.getElementById('strength-label');
  if (lbl) {
    lbl.textContent = score > 0 ? labels[score] : '';
    lbl.style.color = colors[score - 1] || '';
  }
}

/**
 * Toggle a password input between masked ('password') and readable ('text').
 * The eye button's opacity changes to signal the current visibility state:
 *   1.0 opacity = password is visible
 *   0.5 opacity = password is masked
 *
 * @param {string}      id  - ID of the password <input> element
 * @param {HTMLElement} btn - the eye toggle button element
 */
function togglePass(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type          = inp.type === 'password' ? 'text' : 'password';
  btn.style.opacity = inp.type === 'text' ? '1' : '0.5';
}

// ── Forgot password flow ───────────────────────────────────────

/**
 * Navigate to the forgot-password screen.
 * Hides the sign-in/up forms and the tab bar so only the
 * forgot-password form is visible.
 */
function showForgot() {
  document.getElementById('form-signin').style.display   = 'none';
  document.getElementById('form-signup').style.display   = 'none';
  document.getElementById('main-tabs').style.display     = 'none';
  document.getElementById('screen-forgot').style.display = '';
  clearErr();
}

/**
 * Return to the main sign-in tab from any secondary screen
 * (forgot password, success screen, etc.).
 */
function showAuth() {
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = 'none';
  document.getElementById('main-tabs').style.display      = '';
  switchTab('signin');
}

/**
 * Handle submission of the forgot-password form.
 * Validates the email field, then shows the success confirmation screen
 * with the entered email address displayed.
 *
 * Note: TMS does not send a real password reset email — this is a UI
 * confirmation flow only. In production, connect to an email service here.
 */
function handleForgot() {
  const email = document.getElementById('fp-email')?.value.trim();
  const errEl = document.getElementById('fp-error');

  if (!email) {
    if (errEl) {
      errEl.textContent   = 'Enter your email.';
      errEl.style.display = 'block';
    }
    return;
  }

  // Swap the forgot-password screen for the success confirmation screen
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = '';

  // Show the email address the user entered so they can confirm it
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
/**
 * Programmatically trigger the Google Identity Services OAuth popup.
 *
 * Strategy:
 *   1. Create (or reuse) a hidden off-screen div: #_g_btn_box
 *   2. Ask GSI to render a button into that div
 *   3. After a 100ms delay (button needs time to render), click it
 *   4. If the button is not found, fall back to the One Tap prompt
 *   5. If One Tap is suppressed (browser policy), open the email modal
 *
 * The off-screen div is positioned at -999px so it is never visible
 * but still attached to the DOM (required for GSI to render into it).
 */
function triggerGPopup() {
  // Reuse existing hidden container or create one on first call
  let box = document.getElementById('_g_btn_box');
  if (!box) {
    box               = document.createElement('div');
    box.id            = '_g_btn_box';
    // Off-screen — invisible but still in the DOM
    box.style.cssText = 'position:fixed;top:-999px;left:-999px';
    document.body.appendChild(box);
  }

  // Clear any previously rendered button before re-rendering
  box.innerHTML = '';

  // Ask GSI to render its standard sign-in button into the hidden div
  google.accounts.id.renderButton(box, { theme: 'outline', size: 'large' });

  // 100ms delay lets the GSI script finish rendering the button
  setTimeout(() => {
    const btn = box.querySelector('[role=button]') || box.firstElementChild;

    if (btn) {
      // Simulate a click to trigger the OAuth popup
      btn.click();
    } else {
      // Button not found — try One Tap as a secondary approach
      google.accounts.id.prompt(notification => {
        // If One Tap is blocked or suppressed, fall back to email modal
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          openGModal(gMode);
        }
      });
    }
  }, 100);
}

// ── Google fallback modal ──────────────────────────────────────
// Used when the GSI popup is blocked by the browser or unavailable
// in development environments (e.g. file:// protocol).

/**
 * Open the email-only Google fallback modal.
 * Title and subtitle text adapt based on whether user is signing in or up.
 * @param {string} mode - 'signin' | 'signup'
 */
function openGModal(mode) {
  // Update modal title and subtitle to match the current flow
  document.getElementById('g-modal-title').textContent =
    mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google';
  document.getElementById('g-modal-sub').textContent =
    mode === 'signin' ? 'Enter your Gmail address.' : 'Enter Gmail to register with.';

  // Reset form state before showing
  document.getElementById('g-email-input').value = '';
  document.getElementById('g-error').classList.remove('show');

  // Show the modal overlay
  document.getElementById('g-overlay').classList.add('open');

  // 120ms delay lets the CSS open animation finish before focusing
  setTimeout(() => document.getElementById('g-email-input').focus(), 120);
}

/**
 * Close the Google fallback modal by removing the 'open' CSS class.
 * Also triggered on Escape key (see keydown listener below).
 */
function closeGModal() {
  document.getElementById('g-overlay')?.classList.remove('open');
}

/**
 * Handle submission of the Google fallback email form.
 * Validates the email format then calls /auth/google-fallback.
 * On success: stores session and navigates to the correct dashboard.
 * On error: shows the error message inside the modal.
 */
async function confirmGoogle() {
  const email = document.getElementById('g-email-input')?.value.trim().toLowerCase();
  const errEl = document.getElementById('g-error');

  // Inline error helper — shows message inside the modal, not the main error box
  const gErr = (msg) => {
    if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
  };

  // Basic email format check before hitting the server
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) { gErr('Enter valid email.'); return; }

  try {
    const { ok, data } = await api('/auth/google-fallback', 'POST', {
      email,
      role: selRole,  // needed for signup mode
      mode: gMode,    // 'signin' | 'signup'
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

// Close the fallback modal when the user presses Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeGModal(); });

// ── Load Google GSI script dynamically ────────────────────────
// Injected at runtime rather than a static <script> tag in HTML —
// keeps the HTML clean and lets us set onload = initGoogleAuth.
(function () {
  const script   = document.createElement('script');
  script.src     = 'https://accounts.google.com/gsi/client';
  script.async   = true;
  script.defer   = true;
  script.onload  = initGoogleAuth;  // initialise GSI once the library loads
  document.head.appendChild(script);
})();
