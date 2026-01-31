/**
 * User Type Detection Hook
 * Detects if user is individual (Gmail) or business (custom domain)
 */

import { useMemo } from 'react';

export type UserType = 'individual' | 'business' | 'unknown';

// Common free email domains that indicate individual users
const FREE_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'gmx.net',
  'yandex.com',
  'tutanota.com',
  'fastmail.com',
];

/**
 * Get the domain from an email address
 */
export function getEmailDomain(email: string): string {
  const parts = email.toLowerCase().trim().split('@');
  return parts.length === 2 ? parts[1] : '';
}

/**
 * Check if an email domain is a free/personal email provider
 */
export function isPersonalEmailDomain(domain: string): boolean {
  return FREE_EMAIL_DOMAINS.includes(domain.toLowerCase());
}

/**
 * Detect user type from email
 */
export function detectUserType(email: string | null | undefined): UserType {
  if (!email) return 'unknown';

  const domain = getEmailDomain(email);
  if (!domain) return 'unknown';

  return isPersonalEmailDomain(domain) ? 'individual' : 'business';
}

/**
 * Get user from localStorage
 */
export function getStoredUser(): { email: string; id: number } | null {
  try {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

/**
 * Hook to get current user type
 */
export function useUserType(): {
  userType: UserType;
  email: string | null;
  domain: string | null;
  isIndividual: boolean;
  isBusiness: boolean;
} {
  const user = useMemo(() => getStoredUser(), []);

  const result = useMemo(() => {
    if (!user?.email) {
      return {
        userType: 'unknown' as UserType,
        email: null,
        domain: null,
        isIndividual: false,
        isBusiness: false,
      };
    }

    const userType = detectUserType(user.email);
    const domain = getEmailDomain(user.email);

    return {
      userType,
      email: user.email,
      domain,
      isIndividual: userType === 'individual',
      isBusiness: userType === 'business',
    };
  }, [user]);

  return result;
}

export default useUserType;
