// ═══════════════════════════════════════════════════════
//  TENANT MANAGEMENT SYSTEM - Authentication Module
//  Version: 3.0
//  Framework: Vanilla JavaScript + MongoDB Atlas + Google OAuth
//  Author: Muhammad Shahzaib
// ═══════════════════════════════════════════════════════

const GOOGLE_CLIENT_ID = '1092570435598-nicfmpo6mpqo6a1h36eg614082k8994l.apps.googleusercontent.com';
const API_BASE = 'http://localhost:5000/api';

// ═══════════════════════════════════════════════════════
// LOCAL STORAGE HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Retrieve authentication token from localStorage
 * @returns {string|null} JWT token or null
 */
const getToken = () => localStorage.getItem('tms_token');

/**
 * Store authentication token in localStorage
 * @param {string} t - JWT token
 */
const setToken = (t) => localStorage.setItem('tms_token', t);

/**
 * Store user data in localStorage
 * @param {object} u - User object
 */
const setUser  = (u) => localStorage.setItem('tms_user', JSON.stringify(u));

/**
 * Retrieve user data from localStorage (with error handling)
 * @returns {object|null} User object or null
 */
const getUser  = () => {
  try {
    return JSON.parse(localStorage.getItem('tms_user'));
  } catch {
    return null;
  }
};

/**
 * Clear authentication data from localStorage
 */
const clearAuth = () => {
  localStorage.removeItem('tms_token');
  localStorage.removeItem('tms_user');
};

// ═══════════════════════════════════════════════════════
// API COMMUNICATION
// ═══════════════════════════════════════════════════════

/**
 * Make API request with authentication
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {object|null} body - Request body for POST/PUT
 * @returns {object} Response object with {ok, data}
 */
async function api(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  const t = getToken();
  if (t) opts.headers['Authorization'] = 'Bearer ' + t;
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API_BASE + endpoint, opts);
  const data = await res.json();
  return { ok: res.ok, data };
}

// ═══════════════════════════════════════════════════════
// NAVIGATION & ROUTING
// ═══════════════════════════════════════════════════════

/**
 * Redirect user to role-based dashboard
 * @param {string} role - User role (admin, landlord, tenant)
 */
function goToDashboard(role) {
  const dashboards = {
    admin: 'pages/admin-dashboard.html',
    landlord: 'pages/landlord-dashboard.html',
    tenant: 'pages/tenant-dashboard.html'
  };
  window.location.replace(dashboards[role] || 'pages/tenant-dashboard.html');
}

// ═══════════════════════════════════════════════════════
// UI HELPERS & ERROR HANDLING
// ═══════════════════════════════════════════════════════

/**
 * Display error message in UI
 * @param {string} msg - Error message
 */
function showErr(msg) {
  const b = document.getElementById('error-box');
  if (b) {
    b.textContent = msg;
    b.style.display = 'block';
  }
}

/**
 * Clear error message from UI
 */
function clearErr() {
  const b = document.getElementById('error-box');
  if (b) {
    b.textContent = '';
    b.style.display = 'none';
  }
}

/**
 * Set button loading state
 * @param {string} id - Element ID
 * @param {boolean} loading - Loading state
 * @param {string} txt - Button text when not loading
 */
function setBtnLoad(id, loading, txt) {
  const b = document.getElementById(id);
  if (b) {
    b.disabled = loading;
    b.textContent = loading ? 'Please wait…' : txt;
  }
}

// ═══════════════════════════════════════════════════════
// TAB MANAGEMENT
  clearErr();
  const si = document.getElementById('form-signin');
  const su = document.getElementById('form-signup');
  const ti = document.getElementById('tab-signin');
  const tu = document.getElementById('tab-signup');
  if (tab === 'signin') {
    si.style.display = ''; su.style.display = 'none';
    ti.classList.add('active'); tu.classList.remove('active');
  } else {
    si.style.display = 'none'; su.style.display = '';
    ti.classList.remove('active'); tu.classList.add('active');
  }
  const sf = document.getElementById('screen-forgot');
  if (sf) sf.style.display = 'none';
}

// ── Role select ───────────────────────────────────────
let selRole = '';
function selectRole(role) {
  selRole = role;
  document.getElementById('role-tenant')?.classList.remove('selected');
  document.getElementById('role-landlord')?.classList.remove('selected');
  document.getElementById('role-' + role)?.classList.add('selected');
  const e = document.getElementById('role-error');
  if (e) e.style.display = 'none';
}

// ── Password strength ─────────────────────────────────
function checkStrength(val) {
  const colors = ['#FF6B6B','#FFB347','#C9A96E','#4ECDC4'];
  let s = 0;
  if (val.length >= 8) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  ['s1','s2','s3','s4'].forEach((id,i) => {
    const el = document.getElementById(id);
    if (el) el.style.background = i < s ? colors[s-1] : '';
  });
  const lbl = document.getElementById('strength-label');
  if (lbl) { lbl.textContent = s > 0 ? ['','Weak','Fair','Good','Strong'][s] : ''; lbl.style.color = colors[s-1] || ''; }
}
function togglePass(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.style.opacity = inp.type === 'text' ? '1' : '0.5';
}

// ── Forgot password ───────────────────────────────────
function showForgot() {
  document.getElementById('form-signin').style.display = 'none';
  document.getElementById('form-signup').style.display = 'none';
  document.getElementById('main-tabs').style.display   = 'none';
  document.getElementById('screen-forgot').style.display = '';
  clearErr();
}
function showAuth() {
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = 'none';
  document.getElementById('main-tabs').style.display = '';
  switchTab('signin');
}
function handleForgot() {
  const em = document.getElementById('fp-email')?.value.trim();
  const er = document.getElementById('fp-error');
  if (!em) { if(er){er.textContent='Enter your email.';er.style.display='block';} return; }
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = '';
  document.getElementById('success-email-display').textContent = em;
}

// ═══════════════════════════════════════════════════════
//  SIGN IN
// ═══════════════════════════════════════════════════════
async function handleSignin() {
  clearErr();
  const email = document.getElementById('signin-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('signin-password')?.value;
  if (!email || !pass) { showErr('Enter email and password.'); return; }
  setBtnLoad('signin-btn', true, 'Sign In');
  try {
    const { ok, data } = await api('/auth/login', 'POST', { email, password: pass });
    if (ok && data.success) {
      setToken(data.token); setUser(data.user);
      goToDashboard(data.user.role);
    } else {
      showErr(data.message || 'Login failed.');
    }
  } catch { showErr('Cannot connect to server. Make sure backend is running (npm start).'); }
  finally { setBtnLoad('signin-btn', false, 'Sign In'); }
}

// ═══════════════════════════════════════════════════════
//  SIGN UP
// ═══════════════════════════════════════════════════════
async function handleSignup() {
  clearErr();
  const name  = document.getElementById('signup-name')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('signup-password')?.value;
  const conf  = document.getElementById('signup-confirm')?.value;
  if (!name||!email||!pass||!conf) { showErr('Fill in all fields.'); return; }
  if (pass !== conf) { showErr('Passwords do not match.'); return; }
  if (pass.length < 6) { showErr('Password must be at least 6 characters.'); return; }
  if (!selRole) {
    document.getElementById('role-error')?.style && (document.getElementById('role-error').style.display='block');
    showErr('Select Tenant or Landlord.'); return;
  }
  setBtnLoad('signup-btn', true, 'Create Account');
  try {
    const { ok, data } = await api('/auth/register', 'POST', { name, email, password: pass, role: selRole });
    if (ok && data.success) {
      setToken(data.token); setUser(data.user);
      goToDashboard(data.user.role);
    } else {
      showErr(data.message || 'Registration failed.');
    }
  } catch { showErr('Cannot connect to server.'); }
  finally { setBtnLoad('signup-btn', false, 'Create Account'); }
}

// ═══════════════════════════════════════════════════════
//  GOOGLE OAUTH
// ═══════════════════════════════════════════════════════
let gMode = '';

function initGoogleAuth() {
  if (!window.google) return;
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback:  handleGoogleCred,
    auto_select: false,
    ux_mode: 'popup',
  });
}

async function handleGoogleCred(response) {
  try {
    clearErr();
    const { ok, data } = await api('/auth/google', 'POST', {
      credential: response.credential,
      role: selRole || undefined,
      mode: gMode
    });
    if (ok && data.success) {
      setToken(data.token); setUser(data.user);
      closeGModal();
      goToDashboard(data.user.role);
    } else {
      showErr(data.message || 'Google sign-in failed.');
    }
  } catch { showErr('Cannot connect to server.'); }
}

function handleGoogleSignin() {
  clearErr(); gMode = 'signin';
  if (window.google) { triggerGPopup(); return; }
  openGModal('signin');
}
function handleGoogleSignup() {
  clearErr(); gMode = 'signup';
  if (!selRole) {
    document.getElementById('role-error')?.style && (document.getElementById('role-error').style.display='block');
    showErr('Select Tenant or Landlord first.'); return;
  }
  if (window.google) { triggerGPopup(); return; }
  openGModal('signup');
}

function triggerGPopup() {
  let box = document.getElementById('_g_btn_box');
  if (!box) {
    box = document.createElement('div');
    box.id = '_g_btn_box';
    box.style.cssText = 'position:fixed;top:-999px;left:-999px';
    document.body.appendChild(box);
  }
  box.innerHTML = '';
  google.accounts.id.renderButton(box, { theme:'outline', size:'large' });
  setTimeout(() => {
    const btn = box.querySelector('[role=button]') || box.firstElementChild;
    if (btn) btn.click();
    else google.accounts.id.prompt(n => { if(n.isNotDisplayed()||n.isSkippedMoment()) openGModal(gMode); });
  }, 100);
}

// ── Google fallback modal ─────────────────────────────
function openGModal(mode) {
  document.getElementById('g-modal-title').textContent = mode==='signin' ? 'Sign in with Google' : 'Sign up with Google';
  document.getElementById('g-modal-sub').textContent   = mode==='signin' ? 'Enter your Gmail address.' : 'Enter Gmail to register with.';
  document.getElementById('g-email-input').value = '';
  document.getElementById('g-error').classList.remove('show');
  document.getElementById('g-overlay').classList.add('open');
  setTimeout(() => document.getElementById('g-email-input').focus(), 120);
}
function closeGModal() { document.getElementById('g-overlay')?.classList.remove('open'); }

async function confirmGoogle() {
  const email  = document.getElementById('g-email-input')?.value.trim().toLowerCase();
  const errEl  = document.getElementById('g-error');
  const gErr   = (msg) => { if(errEl){errEl.textContent=msg;errEl.classList.add('show');} };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { gErr('Enter valid email.'); return; }

  try {
    const { ok, data } = await api('/auth/google-fallback', 'POST', { email, role: selRole, mode: gMode });
    if (ok && data.success) {
      setToken(data.token); setUser(data.user);
      closeGModal(); goToDashboard(data.user.role);
    } else { gErr(data.message || 'Failed.'); }
  } catch { gErr('Cannot connect to server.'); }
}

document.addEventListener('keydown', e => { if(e.key==='Escape') closeGModal(); });

// ── Load Google GSI ───────────────────────────────────
(function() {
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true; s.defer = true;
  s.onload = initGoogleAuth;
  document.head.appendChild(s);
})();
