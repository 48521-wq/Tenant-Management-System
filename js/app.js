/* ============================================
   Tenant Management System — app.js
   ============================================ */

const ADMIN_EMAIL    = 'adboy768@gmail.com';
const ADMIN_PASSWORD = 'adnan123@';

let currentRole = '';

/* ── Tab Switch ── */
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

/* ── Role Select ── */
function selectRole(role) {
  currentRole = role;
  document.getElementById('role-tenant').classList.remove('selected');
  document.getElementById('role-landlord').classList.remove('selected');
  document.getElementById('role-' + role).classList.add('selected');
  document.getElementById('role-error').classList.remove('show');
  document.getElementById('signup-btn').className =
    role === 'tenant' ? 'btn-primary btn-blue' : 'btn-primary btn-gold';
}

/* ── Sign In ──
   Priority:
   1. Admin credentials (exact match) → admin dashboard
   2. Email exists in registered users → correct role dashboard
   3. Anything else → tenant dashboard (default)
*/
function handleSignin() {
  const email = document.getElementById('signin-email').value.trim().toLowerCase();
  const pass  = document.getElementById('signin-password').value;
  hideError('error-box');

  if (!email) return showError('error-box', 'Please enter your email address.');
  if (!pass)  return showError('error-box', 'Please enter your password.');

  const btn = document.getElementById('signin-btn');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = 'Sign In';
    btn.disabled = false;

    // 1. Admin check
    if (email === ADMIN_EMAIL && pass === ADMIN_PASSWORD) {
      window.location.href = 'pages/admin-dashboard.html';
      return;
    }

    // 2. Check registered users (saved in localStorage during signup)
    const users = JSON.parse(localStorage.getItem('tms_users') || '{}');
    if (users[email]) {
      const role = users[email].role;
      if (role === 'landlord') {
        window.location.href = 'pages/landlord-dashboard.html';
      } else {
        window.location.href = 'pages/tenant-dashboard.html';
      }
      return;
    }

    // 3. Default → tenant dashboard
    window.location.href = 'pages/tenant-dashboard.html';

  }, 1200);
}

/* ── Sign Up ── saves user role to localStorage ── */
function handleSignup() {
  const name    = document.getElementById('signup-name').value.trim();
  const email   = document.getElementById('signup-email').value.trim().toLowerCase();
  const pass    = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  hideError('error-box');

  if (!name)           return showError('error-box', 'Please enter your full name.');
  if (!email)          return showError('error-box', 'Please enter your email address.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('error-box', 'Please enter a valid email address.');
  if (!pass)           return showError('error-box', 'Please enter a password.');
  if (pass.length < 8) return showError('error-box', 'Password must be at least 8 characters.');
  if (pass !== confirm) return showError('error-box', 'Passwords do not match.');
  if (!currentRole) {
    document.getElementById('role-error').classList.add('show');
    document.getElementById('role-tenant').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = document.getElementById('signup-btn');
  btn.textContent = 'Creating Account...';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = 'Create Account';
    btn.disabled = false;

    // Save user role to localStorage
    const users = JSON.parse(localStorage.getItem('tms_users') || '{}');
    users[email] = { name, role: currentRole };
    localStorage.setItem('tms_users', JSON.stringify(users));

    // Redirect based on role
    if (currentRole === 'landlord') {
      window.location.href = 'pages/landlord-dashboard.html';
    } else {
      window.location.href = 'pages/tenant-dashboard.html';
    }
  }, 1200);
}

/* ── Forgot Password ── */
function showForgot() {
  document.getElementById('form-signin').style.display  = 'none';
  document.getElementById('form-signup').style.display  = 'none';
  document.getElementById('main-tabs').style.display    = 'none';
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
  if (!email) return showError('fp-error', 'Please enter your email address.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('fp-error', 'Please enter a valid email address.');
  const btn = document.getElementById('fp-btn');
  btn.textContent = 'Sending...'; btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Send Reset Link'; btn.disabled = false;
    document.getElementById('success-email-display').textContent = email;
    document.getElementById('screen-forgot').style.display  = 'none';
    document.getElementById('screen-success').style.display = 'block';
  }, 1200);
}

/* ── Helpers ── */
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return; el.textContent = msg; el.classList.add('show');
}
function hideError(id) {
  const el = document.getElementById(id); if (el) el.classList.remove('show');
}
function clearErrors() {
  document.querySelectorAll('.error-msg').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('.role-error-msg').forEach(e => e.classList.remove('show'));
}

/* ── Password Strength ── */
function checkStrength(pass) {
  const segs  = ['s1','s2','s3','s4'].map(id => document.getElementById(id));
  const label = document.getElementById('strength-label');
  segs.forEach(s => { s.className = 'strength-seg'; });
  if (!pass) { label.textContent = ''; return; }
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  const cls = ['weak','weak','medium','strong'];
  const lbl = ['','Weak','Medium','Strong','Very Strong'];
  const col = ['','#FF6B6B','#FFA500','#4ECDC4','#4ECDC4'];
  for (let i = 0; i < score; i++) segs[i].classList.add(cls[Math.min(i, 2)]);
  label.textContent = lbl[score]; label.style.color = col[score];
}

/* ── Toggle Password Visibility ── */
function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  const hidden = inp.type === 'password'; inp.type = hidden ? 'text' : 'password';
  btn.innerHTML = hidden
    ? `<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
