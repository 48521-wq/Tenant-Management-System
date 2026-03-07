<<<<<<< HEAD
// ═══════════════════════════════════════════════════════
//  TMS — app.js
//  Auth: Strict login, Google One Tap OAuth, Register only
// ═══════════════════════════════════════════════════════
=======
/* ============================================
   Tenant Management System — app.js
   ===========================================
>>>>>>> 3414f9ea58c36df2694be57f05d7e6b493594df8

const ADMIN_EMAIL    = 'adboy768@gmail.com';
const ADMIN_PASSWORD = 'adnan123@';

<<<<<<< HEAD
// Google OAuth Client ID — replace with your own from
// console.cloud.google.com → APIs & Services → Credentials
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// ── localStorage helpers ─────────────────────────────
function getUsers() {
  return JSON.parse(localStorage.getItem('tms_users') || '{}');
=======
let currentRole = '';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getUsers() {
  try { return JSON.parse(localStorage.getItem('tms_users') || '{}'); }
  catch(e) { return {}; }
>>>>>>> 3414f9ea58c36df2694be57f05d7e6b493594df8
}
function saveUsers(users) {
  localStorage.setItem('tms_users', JSON.stringify(users));
}
<<<<<<< HEAD

// ── UI helpers ───────────────────────────────────────
function showError(msg) {
  const box = document.getElementById('error-box');
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
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait…' : defaultText;
}

// ── Tab switching ────────────────────────────────────
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

// ── Role selection ───────────────────────────────────
let selectedRole = '';
function selectRole(role) {
  selectedRole = role;
  document.getElementById('role-tenant')?.classList.remove('selected');
  document.getElementById('role-landlord')?.classList.remove('selected');
  document.getElementById('role-' + role)?.classList.add('selected');
  const err = document.getElementById('role-error');
  if (err) err.style.display = 'none';
}

// ── Password strength ────────────────────────────────
function checkStrength(val) {
  const segs = ['s1','s2','s3','s4'];
  const colors = ['#FF6B6B','#FFB347','#C9A96E','#4ECDC4'];
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const labels = ['','Weak','Fair','Good','Strong'];
  segs.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.background = i < score ? colors[score-1] : '';
  });
  const lbl = document.getElementById('strength-label');
  if (lbl) { lbl.textContent = score > 0 ? labels[score] : ''; lbl.style.color = colors[score-1] || ''; }
}

// ── Toggle password visibility ───────────────────────
function togglePass(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.style.opacity = inp.type === 'text' ? '1' : '0.5';
}

// ── Forgot password ──────────────────────────────────
function showForgot() {
  document.getElementById('form-signin').style.display  = 'none';
  document.getElementById('form-signup').style.display  = 'none';
  document.getElementById('main-tabs').style.display    = 'none';
  document.getElementById('screen-forgot').style.display = '';
  clearError();
}
function showAuth() {
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = 'none';
  document.getElementById('main-tabs').style.display = '';
  switchTab('signin');
}
function handleForgot() {
  const email = document.getElementById('fp-email')?.value.trim();
  const err   = document.getElementById('fp-error');
  if (!email) { if (err) { err.textContent='Please enter your email.'; err.style.display='block'; } return; }
  const users = getUsers();
  if (!users[email] && email !== ADMIN_EMAIL) {
    if (err) { err.textContent='No account found with this email.'; err.style.display='block'; } return;
  }
  document.getElementById('screen-forgot').style.display  = 'none';
  document.getElementById('screen-success').style.display = '';
  document.getElementById('success-email-display').textContent = email;
}

// ── STRICT SIGN IN ───────────────────────────────────
// Only registered users + admin can login. No defaults.
function handleSignin() {
  clearError();
  const email = document.getElementById('signin-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('signin-password')?.value;
  if (!email || !pass) { showError('Please enter email and password.'); return; }

  setLoading('signin-btn', true, 'Sign In');

  setTimeout(() => {
    setLoading('signin-btn', false, 'Sign In');

    // Admin check
    if (email === ADMIN_EMAIL && pass === ADMIN_PASSWORD) {
      window.location.href = 'pages/admin-dashboard.html'; return;
    }

    // Registered user check
    const users = getUsers();
    if (users[email]) {
      const u = users[email];
      if (u.password && u.password !== pass) {
        showError('Incorrect password. Please try again.'); return;
      }
      const dest = u.role === 'landlord' ? 'pages/landlord-dashboard.html' : 'pages/tenant-dashboard.html';
      window.location.href = dest; return;
    }

    // Not registered
    showError('No account found with this email. Please sign up first.');
  }, 600);
}

// ── SIGN UP ──────────────────────────────────────────
function handleSignup() {
  clearError();
  const name  = document.getElementById('signup-name')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('signup-password')?.value;
  const conf  = document.getElementById('signup-confirm')?.value;

  if (!name || !email || !pass || !conf) { showError('Please fill in all fields.'); return; }
  if (pass !== conf)  { showError('Passwords do not match.'); return; }
  if (pass.length < 6) { showError('Password must be at least 6 characters.'); return; }
  if (!selectedRole) {
    const err = document.getElementById('role-error');
    if (err) err.style.display = 'block';
    showError('Please select a role (Tenant or Landlord).'); return;
  }

  const users = getUsers();
  if (users[email] || email === ADMIN_EMAIL) {
    showError('An account with this email already exists. Please sign in.'); return;
  }

  setLoading('signup-btn', true, 'Create Account');
  setTimeout(() => {
    setLoading('signup-btn', false, 'Create Account');
    users[email] = { name, role: selectedRole, password: pass };
    saveUsers(users);
    const dest = selectedRole === 'landlord' ? 'pages/landlord-dashboard.html' : 'pages/tenant-dashboard.html';
    window.location.href = dest;
  }, 600);
}

// ═══════════════════════════════════════════════════════
//  GOOGLE OAUTH — Real Google Sign-In via GSI library
//  Uses Google Identity Services (accounts.google.com/gsi)
//  Shows a Google popup with the user's actual Google accounts
// ═══════════════════════════════════════════════════════

let googleMode = ''; // 'signin' | 'signup'

// Called when Google GSI library loads
function initGoogleAuth() {
  if (!window.google || GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) return;
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
}

// Called when Google returns a credential (JWT)
function handleGoogleCredential(response) {
  try {
    // Decode JWT payload (base64)
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const email   = payload.email?.toLowerCase() || '';
    const name    = payload.name  || email.split('@')[0];

    if (!email) { showError('Could not retrieve email from Google.'); return; }

    const users = getUsers();

    if (googleMode === 'signin') {
      // Admin via Google
      if (email === ADMIN_EMAIL) { window.location.href = 'pages/admin-dashboard.html'; return; }
      // Registered user
      if (users[email]) {
        const dest = users[email].role === 'landlord' ? 'pages/landlord-dashboard.html' : 'pages/tenant-dashboard.html';
        window.location.href = dest; return;
      }
      showError('No account found for ' + email + '. Please sign up first.');

    } else if (googleMode === 'signup') {
      if (users[email] || email === ADMIN_EMAIL) {
        showError('Account already exists for ' + email + '. Please sign in instead.'); return;
      }
      if (!selectedRole) {
        const err = document.getElementById('role-error');
        if (err) err.style.display = 'block';
        showError('Please select a role first, then try Google sign-up again.'); return;
      }
      users[email] = { name, role: selectedRole, google: true };
      saveUsers(users);
      const dest = selectedRole === 'landlord' ? 'pages/landlord-dashboard.html' : 'pages/tenant-dashboard.html';
      window.location.href = dest;
    }
  } catch(e) {
    console.error('Google credential error:', e);
    showError('Google sign-in failed. Please try email/password instead.');
  }
}

// ── Trigger Google popup (Sign In) ───────────────────
function handleGoogleSignin() {
  clearError();
  googleMode = 'signin';

  // If real GSI is loaded, use it
  if (window.google && !GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) {
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: popup button flow
        triggerGooglePopup();
      }
    });
    return;
  }

  // Fallback: open Google email modal
  openGoogleModal('signin');
}

// ── Trigger Google popup (Sign Up) ───────────────────
function handleGoogleSignup() {
  clearError();
  googleMode = 'signup';

  if (window.google && !GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) {
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        triggerGooglePopup();
      }
    });
    return;
  }

  openGoogleModal('signup');
}

// ── Google OAuth popup (when One Tap is blocked) ─────
function triggerGooglePopup() {
  if (!window.google || GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) return;
  google.accounts.oauth2.initCodeClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'email profile',
    callback: (response) => {
      if (response.error) { showError('Google sign-in was cancelled.'); return; }
    }
  }).requestCode();
}

// ── Google email fallback modal ──────────────────────
//  Shown when real OAuth isn't configured yet
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
  document.getElementById('g-overlay').classList.remove('open');
}

// ── Confirm Google modal (fallback) ─────────────────
function confirmGoogle() {
  const email = document.getElementById('g-email-input')?.value.trim().toLowerCase();
  const errEl = document.getElementById('g-error');
  const showGErr = (msg) => { errEl.textContent = msg; errEl.classList.add('show'); };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showGErr('Please enter a valid email address.'); return;
  }

  const users = getUsers();

  if (googleMode === 'signin') {
    if (email === ADMIN_EMAIL) { closeGoogleModal(); window.location.href = 'pages/admin-dashboard.html'; return; }
    if (users[email]) {
      closeGoogleModal();
      const dest = users[email].role === 'landlord' ? 'pages/landlord-dashboard.html' : 'pages/tenant-dashboard.html';
      window.location.href = dest; return;
    }
    showGErr('No account found. Please sign up first.');

  } else {
    if (users[email] || email === ADMIN_EMAIL) {
      showGErr('Account already exists. Please sign in instead.'); return;
    }
    if (!selectedRole) {
      closeGoogleModal();
      const err = document.getElementById('role-error');
      if (err) err.style.display = 'block';
      showError('Please select a role first, then use Google sign-up.'); return;
    }
    users[email] = { name: email.split('@')[0], role: selectedRole, google: true };
    saveUsers(users);
    closeGoogleModal();
    const dest = selectedRole === 'landlord' ? 'pages/landlord-dashboard.html' : 'pages/tenant-dashboard.html';
    window.location.href = dest;
  }
}

// ── Keyboard shortcut ────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeGoogleModal();
});

// ── Load Google GSI script dynamically ──────────────
(function loadGSI() {
  if (GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) return; // skip until real ID is set
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true; s.defer = true;
  s.onload = initGoogleAuth;
  document.head.appendChild(s);
})();
=======
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
>>>>>>> 3414f9ea58c36df2694be57f05d7e6b493594df8
