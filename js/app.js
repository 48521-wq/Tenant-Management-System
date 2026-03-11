// ═══════════════════════════════════════════════════════
//  TMS — app.js  v2.0
//  Auth: MongoDB Atlas Backend + Real Google OAuth
//  Backend API: http://localhost:5000/api
// ═══════════════════════════════════════════════════════

// ── CONFIG ────────────────────────────────────────────
// ⚠️  Replace with your actual Google Client ID
//     Get from: console.cloud.google.com → APIs & Services → Credentials
const GOOGLE_CLIENT_ID = '1092570435598-nicfmpo6mpqo6a1h36eg614082k8994l.apps.googleusercontent.com';

// ⚠️  Backend URL — change if deployed elsewhere
const API_BASE = 'http://localhost:5000/api';

// ── Token helpers (localStorage for session) ─────────
const getToken  = ()    => localStorage.getItem('tms_token');
const setToken  = (t)   => localStorage.setItem('tms_token', t);
const setUser   = (u)   => localStorage.setItem('tms_user', JSON.stringify(u));
const getUser   = ()    => JSON.parse(localStorage.getItem('tms_user') || 'null');
const clearAuth = ()    => { localStorage.removeItem('tms_token'); localStorage.removeItem('tms_user'); };

// ── API call helper ───────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  const token = getToken();
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body)  opts.body = JSON.stringify(body);

  const res  = await fetch(API_BASE + endpoint, opts);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ── Redirect based on role ────────────────────────────
function redirectByRole(role) {
  if (role === 'admin')         window.location.replace('pages/admin-dashboard.html');
  else if (role === 'landlord') window.location.replace('pages/landlord-dashboard.html');
  else                          window.location.replace('pages/tenant-dashboard.html');
}

// ── UI helpers ────────────────────────────────────────
function showError(msg) {
  const box = document.getElementById('error-box');
  if (!box) return;
  box.textContent = msg;
  box.style.display = 'block';
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function clearError() {
  const box = document.getElementById('error-box');
  if (box) { box.textContent = ''; box.style.display = 'none'; }
}
function setLoading(btnId, loading, defaultText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled  = loading;
  btn.textContent = loading ? 'Please wait…' : defaultText;
}

// ── Tab switching ─────────────────────────────────────
function switchTab(tab) {
  clearError();
  const signin = document.getElementById('form-signin');
  const signup = document.getElementById('form-signup');
  const tsIn   = document.getElementById('tab-signin');
  const tsUp   = document.getElementById('tab-signup');
  const tabs   = document.getElementById('main-tabs');
  if (tab === 'signin') {
    signin.style.display = ''; signup.style.display = 'none';
    tsIn.classList.add('active'); tsUp.classList.remove('active');
    if (tabs) tabs.style.display = '';
  } else {
    signin.style.display = 'none'; signup.style.display = '';
    tsIn.classList.remove('active'); tsUp.classList.add('active');
    if (tabs) tabs.style.display = '';
  }
  document.getElementById('screen-forgot')?.style && (document.getElementById('screen-forgot').style.display = 'none');
}

// ── Role selection ────────────────────────────────────
let selectedRole = '';
function selectRole(role) {
  selectedRole = role;
  document.getElementById('role-tenant')?.classList.remove('selected');
  document.getElementById('role-landlord')?.classList.remove('selected');
  document.getElementById('role-' + role)?.classList.add('selected');
  const err = document.getElementById('role-error');
  if (err) err.style.display = 'none';
}

// ── Password strength ─────────────────────────────────
function checkStrength(val) {
  const segs   = ['s1','s2','s3','s4'];
  const colors = ['#FF6B6B','#FFB347','#C9A96E','#4ECDC4'];
  let score = 0;
  if (val.length >= 8)          score++;
  if (/[A-Z]/.test(val))        score++;
  if (/[0-9]/.test(val))        score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const labels = ['','Weak','Fair','Good','Strong'];
  segs.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.background = i < score ? colors[score-1] : '';
  });
  const lbl = document.getElementById('strength-label');
  if (lbl) { lbl.textContent = score > 0 ? labels[score] : ''; lbl.style.color = colors[score-1] || ''; }
}

function togglePass(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.style.opacity = inp.type === 'text' ? '1' : '0.5';
}

// ── Forgot password ───────────────────────────────────
function showForgot() {
  document.getElementById('form-signin').style.display   = 'none';
  document.getElementById('form-signup').style.display   = 'none';
  document.getElementById('main-tabs').style.display     = 'none';
  document.getElementById('screen-forgot').style.display = '';
  clearError();
}
function showAuth() {
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = 'none';
  document.getElementById('main-tabs').style.display      = '';
  switchTab('signin');
}
function handleForgot() {
  const email = document.getElementById('fp-email')?.value.trim();
  const err   = document.getElementById('fp-error');
  if (!email) { if (err) { err.textContent='Please enter your email.'; err.style.display='block'; } return; }
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = '';
  document.getElementById('success-email-display').textContent = email;
}

// ══════════════════════════════════════════════════════
//  SIGN IN — calls /api/auth/login
// ══════════════════════════════════════════════════════
async function handleSignin() {
  clearError();
  const email = document.getElementById('signin-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('signin-password')?.value;

  if (!email || !pass) { showError('Please enter email and password.'); return; }
  setLoading('signin-btn', true, 'Sign In');

  try {
    const { ok, data } = await apiCall('/auth/login', 'POST', { email, password: pass });

    if (ok && data.success) {
      setToken(data.token);
      setUser(data.user);
      redirectByRole(data.user.role);
    } else {
      showError(data.message || 'Login failed. Please try again.');
    }
  } catch (err) {
    showError('Cannot connect to server. Make sure the backend is running on port 5000.');
    console.error('Login fetch error:', err);
  } finally {
    setLoading('signin-btn', false, 'Sign In');
  }
}

// ══════════════════════════════════════════════════════
//  SIGN UP — calls /api/auth/register
// ══════════════════════════════════════════════════════
async function handleSignup() {
  clearError();
  const name  = document.getElementById('signup-name')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('signup-password')?.value;
  const conf  = document.getElementById('signup-confirm')?.value;

  if (!name || !email || !pass || !conf) { showError('Please fill in all fields.'); return; }
  if (pass !== conf)   { showError('Passwords do not match.'); return; }
  if (pass.length < 6) { showError('Password must be at least 6 characters.'); return; }
  if (!selectedRole) {
    const err = document.getElementById('role-error');
    if (err) err.style.display = 'block';
    showError('Please select a role (Tenant or Landlord).'); return;
  }

  setLoading('signup-btn', true, 'Create Account');

  try {
    const { ok, data } = await apiCall('/auth/register', 'POST', { name, email, password: pass, role: selectedRole });

    if (ok && data.success) {
      setToken(data.token);
      setUser(data.user);
      redirectByRole(data.user.role);
    } else {
      showError(data.message || 'Registration failed. Please try again.');
    }
  } catch (err) {
    showError('Cannot connect to server. Make sure the backend is running on port 5000.');
    console.error('Signup fetch error:', err);
  } finally {
    setLoading('signup-btn', false, 'Create Account');
  }
}

// ══════════════════════════════════════════════════════
//  GOOGLE OAUTH — Real Google Sign-In
//  Sends Google credential token to /api/auth/google
// ══════════════════════════════════════════════════════
let googleMode = ''; // 'signin' | 'signup'

function initGoogleAuth() {
  if (!window.google || GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) return;
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback:  handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
    ux_mode: 'popup',
  });
  console.log('✅ Google Auth initialized');
}

// Called when Google returns credential JWT
async function handleGoogleCredential(response) {
  try {
    clearError();

    // Send to our backend for verification + user creation/lookup
    const { ok, data } = await apiCall('/auth/google', 'POST', {
      credential: response.credential,
      role:       selectedRole || undefined,
      mode:       googleMode
    });

    if (ok && data.success) {
      setToken(data.token);
      setUser(data.user);
      closeGoogleModal();
      redirectByRole(data.user.role);
    } else {
      showError(data.message || 'Google sign-in failed.');
      closeGoogleModal();
    }
  } catch (err) {
    showError('Cannot connect to server. Make sure the backend is running.');
    console.error('Google credential error:', err);
  }
}

function handleGoogleSignin() {
  clearError();
  googleMode = 'signin';
  if (window.google && !GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) {
    triggerGooglePopup();
    return;
  }
  openGoogleModal('signin');
}

function handleGoogleSignup() {
  clearError();
  googleMode = 'signup';
  if (!selectedRole) {
    const err = document.getElementById('role-error');
    if (err) err.style.display = 'block';
    showError('Please select Tenant or Landlord first, then use Google sign-up.');
    return;
  }
  if (window.google && !GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) {
    triggerGooglePopup();
    return;
  }
  openGoogleModal('signup');
}

function triggerGooglePopup() {
  if (!window.google || GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) return;
  // Use a hidden container for Google button click trigger
  let container = document.getElementById('g-btn-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'g-btn-container';
    container.style.cssText = 'position:fixed;top:-999px;left:-999px;z-index:-1';
    document.body.appendChild(container);
  }
  container.innerHTML = '';
  google.accounts.id.renderButton(container, {
    theme: 'outline', size: 'large', type: 'standard'
  });
  // Click the rendered button
  setTimeout(() => {
    const btn = container.querySelector('[role=button]') || container.firstElementChild;
    if (btn) btn.click();
    else {
      // Fallback to One Tap
      google.accounts.id.prompt((n) => {
        if (n.isNotDisplayed() || n.isSkippedMoment()) openGoogleModal(googleMode);
      });
    }
  }, 100);
}

// ── Fallback Google modal (when OAuth not configured) ─
function openGoogleModal(mode) {
  const isSignin = mode === 'signin';
  document.getElementById('g-modal-title').textContent = isSignin ? 'Sign in with Google' : 'Sign up with Google';
  document.getElementById('g-modal-sub').textContent   = isSignin
    ? 'Enter the Gmail address linked to your account.'
    : 'Enter the Gmail address you want to register with.';
  document.getElementById('g-email-input').value = '';
  document.getElementById('g-error').classList.remove('show');
  document.getElementById('g-overlay').classList.add('open');
  setTimeout(() => document.getElementById('g-email-input').focus(), 120);
}
function closeGoogleModal() {
  document.getElementById('g-overlay')?.classList.remove('open');
}

// Fallback modal confirm — simulates Google, goes to backend
async function confirmGoogle() {
  const email = document.getElementById('g-email-input')?.value.trim().toLowerCase();
  const errEl = document.getElementById('g-error');
  const showGErr = (msg) => { if(errEl){ errEl.textContent = msg; errEl.classList.add('show'); } };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showGErr('Please enter a valid email address.'); return;
  }

  // When real Google Client ID not set: simulate a credential call
  // Send email directly (backend will handle admin check + user lookup)
  // NOTE: This fallback uses a simplified flow for development only.
  //       With real Google OAuth, the credential JWT is verified server-side.
  try {
    // For fallback: we simulate sign in/up with just email (no password)
    if (googleMode === 'signin') {
      const { ok, data } = await apiCall('/auth/login-google-fallback', 'POST', { email });
      if (ok && data.success) {
        setToken(data.token); setUser(data.user);
        closeGoogleModal(); redirectByRole(data.user.role);
      } else {
        showGErr(data.message || 'No account found. Please sign up first.');
      }
    } else {
      if (!selectedRole) {
        closeGoogleModal();
        const err = document.getElementById('role-error');
        if (err) err.style.display = 'block';
        showError('Please select a role first, then use Google sign-up.'); return;
      }
      const { ok, data } = await apiCall('/auth/register', 'POST', {
        name: email.split('@')[0],
        email,
        password: 'google_' + Math.random().toString(36).slice(2),
        role: selectedRole
      });
      if (ok && data.success) {
        setToken(data.token); setUser(data.user);
        closeGoogleModal(); redirectByRole(data.user.role);
      } else {
        showGErr(data.message || 'Registration failed.');
      }
    }
  } catch(err) {
    showGErr('Cannot connect to server.');
  }
}

// ── Keyboard ──────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeGoogleModal();
  if (e.key === 'Enter') {
    const active = document.getElementById('form-signin')?.style.display !== 'none';
    if (active) handleSignin();
  }
});

// ── Load Google GSI script ────────────────────────────
(function loadGSI() {
  if (GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) {
    console.log('ℹ️  Google OAuth not configured. Using fallback modal.');
    return;
  }
  const s = document.createElement('script');
  s.src   = 'https://accounts.google.com/gsi/client';
  s.async = true; s.defer = true;
  s.onload = initGoogleAuth;
  document.head.appendChild(s);
})();

// ── No auto-login — user must always sign in manually after logout ──
