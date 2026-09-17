/**
 * StayMessage Engine — Profile Registry
 * Central registry of all active and available establishment profiles
 */

import { SENHOR_DOS_TRILHOS_PROFILE } from './clients/senhor-dos-trilhos.profile.js';
import { VILA_VERDE_PROFILE } from './clients/vila-verde.profile.js';

export const PROFILE_REGISTRY = {
  senhor_dos_trilhos: SENHOR_DOS_TRILHOS_PROFILE,
  vila_verde: VILA_VERDE_PROFILE
};

export const DEFAULT_PROFILE_ID = 'senhor_dos_trilhos';

/**
 * Retrieves a profile by its slug ID with fallback to default
 * @param {string} profileId
 * @returns {Object}
 */
export function getProfileById(profileId) {
  return PROFILE_REGISTRY[profileId] || PROFILE_REGISTRY[DEFAULT_PROFILE_ID];
}
