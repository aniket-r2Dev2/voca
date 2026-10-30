import { CAREER_PROFILE_STORAGE_KEY, LEGACY_STORAGE_KEYS } from './careerProfile';

// Delete only Voca-owned browser keys. Never call localStorage.clear():
// other applications can share this origin in development.
export const VOCA_LOCAL_STORAGE_KEYS = Object.freeze([
  CAREER_PROFILE_STORAGE_KEY,
  LEGACY_STORAGE_KEYS.profile,
  LEGACY_STORAGE_KEYS.experience,
  LEGACY_STORAGE_KEYS.resumeSections,
  LEGACY_STORAGE_KEYS.jobMatch
]);

export const hasStoredCareerData = (storage) => {
  if (!storage || typeof storage.getItem !== 'function') return false;
  return VOCA_LOCAL_STORAGE_KEYS
    .filter((key) => key !== LEGACY_STORAGE_KEYS.jobMatch)
    .some((key) => storage.getItem(key) !== null);
};

export const deleteAllVocaLocalData = (storage) => {
  if (!storage || typeof storage.removeItem !== 'function') {
    throw new Error('Browser storage is unavailable.');
  }
  // All Voca keys are removed, including migration backups and saved job matches.
  // Unrelated origin keys are left untouched.
  for (const key of VOCA_LOCAL_STORAGE_KEYS) {
    storage.removeItem(key);
  }
};
