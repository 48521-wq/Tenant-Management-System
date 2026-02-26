# Tenant Management System — Entrance Module

## Project Structure

48787



```
tenant-management-system/
│
├── index.html          ← Main HTML (structure only)
├── css/
│   └── style.css       ← All styles
├── js/
│   └── app.js          ← All JavaScript logic
├── .vscode/
│   └── settings.json   ← VS Code Live Server config
└── README.md
```

## How to Run in VS Code

1. Open this folder in **Visual Studio Code**
2. Install **Live Server** extension (if not installed):
   - Press `Ctrl+Shift+X` → Search "Live Server" → Install
3. Right-click `index.html` → **"Open with Live Server"**
4. Browser will open at `http://localhost:5500`

## Features

| Feature | Description |
|---|---|
| Role Selection | Choose Tenant or Landlord before login |
| Sign In | Email + Password with validation |
| Sign Up | Name, Email, Password, Confirm Password |
| Password Strength | Real-time strength meter |
| Forgot Password | Email input + success screen |
| Show/Hide Password | Toggle eye icon |

## Backend Integration (Future)

Replace the `setTimeout` blocks in `js/app.js` with real API calls:

```js
// Sign In — connect to your Node.js backend
async function handleSignin() {
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role: currentRole })
  });
}

// Sign Up
async function handleSignup() {
  const response = await fetch('/api/auth/signup', { ... });
}

// Forgot Password
async function handleForgot() {
  const response = await fetch('/api/auth/forgot-password', { ... });
}
```

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Fonts:** Google Fonts (Playfair Display + DM Sans)
- **No dependencies** — runs directly in browser
