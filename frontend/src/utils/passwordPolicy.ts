export const PASSWORD_POLICY_HINT =
  'At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.';

/** Mirrors validate_password_strength() in backend/app/core/auth.py — keep both in sync. */
export function passwordPolicyError(password: string): string | null {
  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return PASSWORD_POLICY_HINT;
  }
  return null;
}
