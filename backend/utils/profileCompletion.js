const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getMissingProfileFields(user) {
  const missing = [];
  if (!String(user?.name || '').trim()) missing.push('name');

  const email = String(user?.email || '').trim();
  if (!EMAIL_PATTERN.test(email)) missing.push('email');

  const phone = String(user?.phone || '').trim();
  if (!/^\d{7,15}$/.test(phone)) missing.push('phone');

  const cnic = String(user?.cnic || '').trim();
  if (!/^[\d-]+$/.test(cnic) || cnic.replace(/\D/g, '').length !== 13) missing.push('cnic');

  return missing;
}

function isProfileComplete(user) {
  return getMissingProfileFields(user).length === 0;
}

function profileIncompleteResponse(res, user) {
  return res.status(403).json({
    success: false,
    code: 'PROFILE_INCOMPLETE',
    message: 'Complete your profile with your name, a valid email, phone number, and 13-digit CNIC before continuing.',
    missingFields: getMissingProfileFields(user)
  });
}

module.exports = { getMissingProfileFields, isProfileComplete, profileIncompleteResponse };
