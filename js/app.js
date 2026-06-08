// ═══════════════════════════════════════════════════════
//  TMS — app.js  v3.0
//  MongoDB Atlas + Real Google OAuth
// ═══════════════════════════════════════════════════════

const GOOGLE_CLIENT_ID = '1092570435598-nicfmpo6mpqo6a1h36eg614082k8994l.apps.googleusercontent.com';
const API_BASE = 'http://localhost:5000/api';

// ── Session helpers ───────────────────────────────────
const getToken = ()    => localStorage.getItem('tms_token');
const setToken = (t)   => localStorage.setItem('tms_token', t);
const setUser  = (u)   => localStorage.setItem('tms_user', JSON.stringify(u));
const getUser  = ()    => { try { return JSON.parse(localStorage.getItem('tms_user')); } catch { return null; } };
const clearAuth= ()    => { localStorage.removeItem('tms_token'); localStorage.removeItem('tms_user'); };

// ── API helper ────────────────────────────────────────
async function api(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  const t = getToken();
  if (t) opts.headers['Authorization'] = 'Bearer ' + t;
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API_BASE + endpoint, opts);
  const data = await res.json();
  return { ok: res.ok, data };
}

// ── Redirect by role ──────────────────────────────────
function goToDashboard(role) {
  const map = { admin: 'pages/admin-dashboard.html', landlord: 'pages/landlord-dashboard.html', tenant: 'pages/tenant-dashboard.html' };
  window.location.replace(map[role] || 'pages/tenant-dashboard.html');
}

// ── UI helpers ────────────────────────────────────────
function showErr(msg) {
  const b = document.getElementById('error-box');
  if (b) { b.textContent = msg; b.style.display = 'block'; }
}
function clearErr() {
  const b = document.getElementById('error-box');
  if (b) { b.textContent = ''; b.style.display = 'none'; }
}
function setBtnLoad(id, loading, txt) {
  const b = document.getElementById(id);
  if (b) { b.disabled = loading; b.textContent = loading ? 'Please wait…' : txt; }
}

// ── Tabs ──────────────────────────────────────────────
function switchTab(tab) {
  clearErr();
  const si = document.getElementById('form-signin');
  const su = document.getElementById('form-signup');
  const ot = document.getElementById('form-otp');
  const ti = document.getElementById('tab-signin');
  const tu = document.getElementById('tab-signup');
  if (tab === 'signin') {
    si.style.display = ''; su.style.display = 'none';
    if (ot) { ot.style.display = 'none'; clearOtpTimer(); }
    ti.classList.add('active'); tu.classList.remove('active');
  } else {
    si.style.display = 'none'; su.style.display = '';
    if (ot) ot.style.display = 'none';
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
function isValidEnglishName(value) {
  return /^[A-Za-z ]+$/.test((value||'').trim());
}

function enforceLettersInput(el) {
  if (!el) return;
  el.value = el.value.replace(/[^A-Za-z ]+/g, '');
}

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
// ─── OTP SIGNUP FLOW ─────────────────────────────────────────────────────────
let _otpCountdown = null;

async function handleSignup() {
  clearErr();
  const name  = document.getElementById('signup-name')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('signup-password')?.value;
  const conf  = document.getElementById('signup-confirm')?.value;
  if (!name||!email||!pass||!conf) { showErr('Fill in all fields.'); return; }
  if (!isValidEnglishName(name)) { showErr('Full name may only contain letters and spaces.'); return; }
  if (pass !== conf) { showErr('Passwords do not match.'); return; }
  if (pass.length < 6) { showErr('Password must be at least 6 characters.'); return; }
  if (!selRole) {
    document.getElementById('role-error')?.style && (document.getElementById('role-error').style.display='block');
    showErr('Select Tenant or Landlord.'); return;
  }
  setBtnLoad('signup-btn', true, 'Sending OTP...');
  try {
    const { ok, data } = await api('/auth/send-otp', 'POST', { name, email, password: pass, role: selRole });
    if (ok && data.success) {
      // Show OTP screen
      document.getElementById('form-signup').style.display = 'none';
      document.getElementById('form-otp').style.display    = 'block';
      const disp = document.getElementById('otp-email-display');
      if (disp) disp.textContent = email;
      document.getElementById('otp-input')?.focus();
      startOtpTimer(600); // 10 min
    } else {
      showErr(data.message || 'Failed to send OTP.');
    }
  } catch { showErr('Cannot connect to server. Make sure backend is running.'); }
  finally { setBtnLoad('signup-btn', false, 'Send Verification Code'); }
}

async function verifyOTP() {
  clearErr();
  const email = document.getElementById('signup-email')?.value.trim().toLowerCase();
  const otp   = document.getElementById('otp-input')?.value.trim();
  if (!otp || otp.length !== 6) { showErr('Enter the 6-digit OTP sent to your email.'); return; }
  setBtnLoad('otp-verify-btn', true, 'Verifying...');
  try {
    const { ok, data } = await api('/auth/verify-otp', 'POST', { email, otp });
    if (ok && data.success) {
      clearOtpTimer();
      setToken(data.token); setUser(data.user);
      goToDashboard(data.user.role);
    } else {
      showErr(data.message || 'Verification failed.');
    }
  } catch { showErr('Cannot connect to server.'); }
  finally { setBtnLoad('otp-verify-btn', false, 'Verify & Create Account'); }
}

async function resendOTP() {
  clearErr();
  const name  = document.getElementById('signup-name')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('signup-password')?.value;
  const role  = selRole;
  const btn   = document.getElementById('resend-otp-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
  try {
    const { ok, data } = await api('/auth/send-otp', 'POST', { name, email, password: pass, role });
    if (ok && data.success) {
      document.getElementById('otp-input').value = '';
      startOtpTimer(600);
      showErr(''); // clear errors
      // show brief success
      const timerEl = document.getElementById('otp-timer');
      if (timerEl) { const prev = timerEl.textContent; timerEl.textContent = '✅ New OTP sent!'; setTimeout(()=>{ timerEl.textContent = prev; }, 2000); }
    } else {
      showErr(data.message || 'Failed to resend OTP.');
      if (btn) { btn.disabled = false; btn.textContent = 'Resend OTP'; }
    }
  } catch { showErr('Cannot connect to server.'); if (btn) { btn.disabled = false; btn.textContent = 'Resend OTP'; } }
}

function showOtpBack() {
  clearOtpTimer();
  document.getElementById('form-otp').style.display    = 'none';
  document.getElementById('form-signup').style.display = 'block';
}

function startOtpTimer(seconds) {
  clearOtpTimer();
  const timerEl  = document.getElementById('otp-timer');
  const resendBtn = document.getElementById('resend-otp-btn');
  if (resendBtn) { resendBtn.disabled = true; resendBtn.textContent = 'Resend OTP'; }
  let remaining = seconds;
  function tick() {
    const m = Math.floor(remaining / 60).toString().padStart(2,'0');
    const s = (remaining % 60).toString().padStart(2,'0');
    if (timerEl) timerEl.textContent = `Code expires in ${m}:${s}`;
    if (remaining <= 0) {
      clearOtpTimer();
      if (timerEl) timerEl.textContent = '⚠️ OTP expired. Please request a new one.';
      if (resendBtn) { resendBtn.disabled = false; }
      return;
    }
    if (remaining === 30 && resendBtn) resendBtn.disabled = false; // enable resend in last 30s
    remaining--;
  }
  tick();
  _otpCountdown = setInterval(tick, 1000);
}

function clearOtpTimer() {
  if (_otpCountdown) { clearInterval(_otpCountdown); _otpCountdown = null; }
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
