/**
 * Email validation utilities for access control
 */

/**
 * Parses the ALLOWED_USER_EMAILS environment variable and returns a set of allowed emails
 * @returns Set of allowed email addresses (lowercase for case-insensitive comparison)
 */
export function getAllowedEmails(): Set<string> {
  const allowedEmailsEnv = process.env.ALLOWED_USER_EMAILS;
  
  if (!allowedEmailsEnv || allowedEmailsEnv.trim() === "") {
    // Fail-secure: if not configured, deny all
    return new Set<string>();
  }
  
  // Parse comma-separated list, trim whitespace, convert to lowercase
  const emails = allowedEmailsEnv
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
  
  return new Set(emails);
}

/**
 * Checks if an email address is in the allowed list
 * @param email - Email address to check
 * @returns true if email is allowed, false otherwise
 */
export function isEmailAllowed(email: string): boolean {
  if (!email || email.trim() === "") {
    return false;
  }
  
  const allowedEmails = getAllowedEmails();
  
  // If no emails are configured, deny all (fail-secure)
  if (allowedEmails.size === 0) {
    return false;
  }
  
  // Case-insensitive comparison
  return allowedEmails.has(email.trim().toLowerCase());
}



