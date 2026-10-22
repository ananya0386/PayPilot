// Client-side form checks. They give instant feedback; the backend repeats
// every check, so the server is always the final authority.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email.trim()) return 'Email is required.';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use at least one letter and one number.';
  return null;
}

export function validateName(name, label = 'Name') {
  if (!name.trim()) return `${label} is required.`;
  if (name.trim().length > 60) return `${label} must be at most 60 characters.`;
  return null;
}

export function validateAmount(text, label = 'Amount') {
  if (String(text).trim() === '') return `${label} is required.`;
  const value = Number(text);
  if (!Number.isFinite(value)) return `${label} must be a number.`;
  if (value <= 0) return `${label} must be greater than zero.`;
  if (value > 1000000) return `${label} is too large.`;
  return null;
}

export function validateUrl(text) {
  if (!text.trim()) return null; // optional
  if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(text.trim())) return 'Enter a full link starting with https://';
  return null;
}

// Removes empty entries so `Object.keys(errors).length` tells us if the form is valid.
export function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value));
}
