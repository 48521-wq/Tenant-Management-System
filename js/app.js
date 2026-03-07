/* ============================================
   Tenant Management System — app.js
   ============================================ */

const ADMIN_EMAIL    = 'adboy768@gmail.com';
const ADMIN_PASSWORD = 'adnan123@';

let currentRole = '';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getUsers() {
  try { return JSON.parse(localStorage.getItem('tms_users') || '{}'); }
  catch(e) { return {}; }
}
function saveUsers(users) {
  localStorage.setItem('tms_users', JSON.stringify(users));
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.classList.remove('show');
  void el.offsetWidth; // force reflow for shake animation
  el.classList.add('show');
}
function hideError(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('show'); el.style.display = 'none'; }
}
function clearErrors() {
  document.querySelectorAll('.error-msg').forEach(e => {
    e.classList.remove('show'); e.style.display = 'none';
  });
  document.querySelectorAll('.role-error-msg').forEach(e => e.classList.remove('show'));
}

/* ─────────────────────────────────────────────
   TAB SWITCH
───────────────────────────────────────────── */
function switchTab(tab) {
  document.getElementById('tab-signin').classList.toggle('active', tab === 'signin');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('form-signin').style.display = tab === 'signin' ? 'block' : 'none';
  document.getElementById('form-signup').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = 'none';
  document.getElementById('main-tabs').style.display      = 'flex';
  clearErrors();
}

/* ─────────────────────────────────────────────
   ROLE SELECT
───────────────────────────────────────────── */
function selectRole(role) {
  currentRole = role;
  document.getElementById('role-tenant').classList.remove('selected');
  document.getElementById('role-landlord').classList.remove('selected');
  document.getElementById('role-' + role).classList.add('selected');
  document.getElementById('role-error').classList.remove('show');
  document.getElementById('signup-btn').className =
    role === 'tenant' ? 'btn-primary btn-blue' : 'btn-primary btn-gold';
}

/* ─────────────────────────────────────────────
   SIGN IN
   Rules:
   - Admin exact match           → admin dashboard
   - Registered email            → their role dashboard
   - Anything else               → ERROR, no redirect
───────────────────────────────────────────── */
function handleSignin() {
  const email = document.getElementById('signin-email').value.trim().toLowerCase();
  const pass  = document.getElementById('signin-password').value;

  hideError('error-box');

  if (!email) { showError('error-box', 'Please enter your email address.'); return; }
  if (!pass)  { showError('error-box', 'Please enter your password.');       return; }

  // ── Admin check (immediate, no delay needed) ──
  if (email === ADMIN_EMAIL && pass === ADMIN_PASSWORD) {
    const btn = document.getElementById('signin-btn');
    btn.textContent = 'Signing in...'; btn.disabled = true;
    setTimeout(() => { window.location.href = 'pages/admin-dashboard.html'; }, 900);
    return;
  }

  // ── Registered user check ──
  const users = getUsers();
  if (users[email]) {
    const btn = document.getElementById('signin-btn');
    btn.textContent = 'Signing in...'; btn.disabled = true;
    const dest = users[email].role === 'landlord'
      ? 'pages/landlord-dashboard.html'
      : 'pages/tenant-dashboard.html';
    setTimeout(() => { window.location.href = dest; }, 900);
    return;
  }

  // ── Not found — STOP HERE, show error ──
  showError('error-box', 'No account found with this email. Please sign up first.');
}

/* ─────────────────────────────────────────────
   GOOGLE MODAL STATE
───────────────────────────────────────────── */
let googleMode = ''; // 'signin' or 'signup'

/* ─────────────────────────────────────────────
   GOOGLE SIGN IN — opens modal
───────────────────────────────────────────── */
function handleGoogleSignin() {
  googleMode = 'signin';
  document.getElementById('g-modal-title').textContent = 'Sign in with Google';
  document.getElementById('g-modal-sub').textContent   = 'Enter the Gmail address you used to sign up.';
  document.getElementById('g-email-input').value = '';
  document.getElementById('g-email-input').placeholder = 'yourname@gmail.com';
  document.getElementById('g-error').classList.remove('show');
  document.getElementById('g-confirm-btn').textContent = 'Sign In';
  document.getElementById('g-overlay').classList.add('open');
  setTimeout(() => document.getElementById('g-email-input').focus(), 100);
}

/* ─────────────────────────────────────────────
   GOOGLE SIGN UP — opens modal
───────────────────────────────────────────── */
function handleGoogleSignup() {
  if (!currentRole) {
    document.getElementById('role-error').classList.add('show');
    document.getElementById('role-tenant').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  googleMode = 'signup';
  document.getElementById('g-modal-title').textContent = 'Sign up with Google';
  document.getElementById('g-modal-sub').textContent   = 'Enter your Gmail address to create your account.';
  document.getElementById('g-email-input').value = '';
  document.getElementById('g-email-input').placeholder = 'yourname@gmail.com';
  document.getElementById('g-error').classList.remove('show');
  document.getElementById('g-confirm-btn').textContent = 'Create Account';
  document.getElementById('g-overlay').classList.add('open');
  setTimeout(() => document.getElementById('g-email-input').focus(), 100);
}

/* ─────────────────────────────────────────────
   CONFIRM GOOGLE — modal button
───────────────────────────────────────────── */
function confirmGoogle() {
  const email = document.getElementById('g-email-input').value.trim().toLowerCase();
  const errEl = document.getElementById('g-error');
  errEl.classList.remove('show');

  // Validate
  if (!email) {
    errEl.textContent = 'Please enter your Gmail address.';
    errEl.classList.add('show'); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'Please enter a valid email address.';
    errEl.classList.add('show'); return;
  }

  const btn = document.getElementById('g-confirm-btn');
  btn.textContent = 'Please wait...'; btn.disabled = true;

  setTimeout(() => {
    btn.disabled = false;

    if (googleMode === 'signup') {
      // Save user with current role
      const users = getUsers();
      users[email] = { name: email.split('@')[0], role: currentRole, google: true };
      saveUsers(users);
      closeGoogleModal();
      const dest = currentRole === 'landlord'
        ? 'pages/landlord-dashboard.html'
        : 'pages/tenant-dashboard.html';
      window.location.href = dest;

    } else {
      // Sign in — check if registered
      if (email === ADMIN_EMAIL) {
        errEl.textContent = 'Admin cannot use Google sign in.';
        errEl.classList.add('show');
        btn.textContent = 'Sign In'; return;
      }
      const users = getUsers();
      if (users[email]) {
        closeGoogleModal();
        const dest = users[email].role === 'landlord'
          ? 'pages/landlord-dashboard.html'
          : 'pages/tenant-dashboard.html';
        window.location.href = dest;
      } else {
        errEl.textContent = 'No account found with this Gmail. Please sign up first.';
        errEl.classList.add('show');
        btn.textContent = 'Sign In';
      }
    }
  }, 900);
}

/* Close modal */
function closeGoogleModal() {
  document.getElementById('g-overlay').classList.remove('open');
  googleMode = '';
}

/* ESC to close */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeGoogleModal();
});

let originalGoogleSigninHTML = '';
let originalGoogleSignupHTML = '';

/* ─────────────────────────────────────────────
   SIGN UP
───────────────────────────────────────────── */
function handleSignup() {
  const name    = document.getElementById('signup-name').value.trim();
  const email   = document.getElementById('signup-email').value.trim().toLowerCase();
  const pass    = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  hideError('error-box');

  if (!name)            { showError('error-box', 'Please enter your full name.');           return; }
  if (!email)           { showError('error-box', 'Please enter your email address.');       return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                        { showError('error-box', 'Please enter a valid email address.');    return; }
  if (!pass)            { showError('error-box', 'Please enter a password.');               return; }
  if (pass.length < 8)  { showError('error-box', 'Password must be at least 8 characters.'); return; }
  if (pass !== confirm) { showError('error-box', 'Passwords do not match.');                return; }
  if (!currentRole) {
    document.getElementById('role-error').classList.add('show');
    document.getElementById('role-tenant').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = document.getElementById('signup-btn');
  btn.textContent = 'Creating Account...'; btn.disabled = true;

  setTimeout(() => {
    btn.textContent = 'Create Account'; btn.disabled = false;
    const users = getUsers();
    users[email] = { name, role: currentRole };
    saveUsers(users);
    const dest = currentRole === 'landlord'
      ? 'pages/landlord-dashboard.html'
      : 'pages/tenant-dashboard.html';
    window.location.href = dest;
  }, 1000);
}

/* ─────────────────────────────────────────────
   FORGOT PASSWORD
───────────────────────────────────────────── */
function showForgot() {
  document.getElementById('form-signin').style.display   = 'none';
  document.getElementById('form-signup').style.display   = 'none';
  document.getElementById('main-tabs').style.display     = 'none';
  document.getElementById('screen-forgot').style.display = 'block';
  document.getElementById('fp-email').value = '';
  hideError('fp-error');
}
function showAuth() {
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = 'none';
  document.getElementById('main-tabs').style.display      = 'flex';
  switchTab('signin');
}
function handleForgot() {
  const email = document.getElementById('fp-email').value.trim();
  hideError('fp-error');
  if (!email) { showError('fp-error', 'Please enter your email address.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('fp-error', 'Please enter a valid email address.'); return; }
  const btn = document.getElementById('fp-btn');
  btn.textContent = 'Sending...'; btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Send Reset Link'; btn.disabled = false;
    document.getElementById('success-email-display').textContent = email;
    document.getElementById('screen-forgot').style.display  = 'none';
    document.getElementById('screen-success').style.display = 'block';
  }, 1000);
}

/* ─────────────────────────────────────────────
   PASSWORD STRENGTH
───────────────────────────────────────────── */
function checkStrength(pass) {
  const segs  = ['s1','s2','s3','s4'].map(id => document.getElementById(id));
  const label = document.getElementById('strength-label');
  segs.forEach(s => { s.className = 'strength-seg'; });
  if (!pass) { label.textContent = ''; return; }
  let score = 0;
  if (pass.length >= 8)          score++;
  if (/[A-Z]/.test(pass))        score++;
  if (/[0-9]/.test(pass))        score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  const cls = ['weak','weak','medium','strong'];
  const lbl = ['','Weak','Medium','Strong','Very Strong'];
  const col = ['','#FF6B6B','#FFA500','#4ECDC4','#4ECDC4'];
  for (let i = 0; i < score; i++) segs[i].classList.add(cls[Math.min(i,2)]);
  label.textContent = lbl[score]; label.style.color = col[score];
}

/* ─────────────────────────────────────────────
   TOGGLE PASSWORD
───────────────────────────────────────────── */
function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  const hidden = inp.type === 'password'; inp.type = hidden ? 'text' : 'password';
  btn.innerHTML = hidden
    ? `<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

/* ─────────────────────────────────────────────
   INIT — store original Google btn HTML
───────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  const gsi = document.getElementById('google-signin-btn');
  const gsu = document.getElementById('google-signup-btn');
  if (gsi) originalGoogleSigninHTML = gsi.innerHTML;
  if (gsu) originalGoogleSignupHTML = gsu.innerHTML;
});
