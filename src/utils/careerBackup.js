import { CAREER_PROFILE_STORAGE_KEY, isCareerProfile } from './careerProfile';

export const CAREER_BACKUP_FORMAT = 'voca-career-profile-backup';
export const CAREER_BACKUP_MAX_BYTES = 2 * 1024 * 1024;

const validateRecord = (profile) => {
  if (!isCareerProfile(profile)
      || typeof profile.metadata.createdAt !== 'string'
      || typeof profile.metadata.updatedAt !== 'string') {
    throw new Error('This backup contains an unsupported or invalid career profile.');
  }
  return profile;
};

export const createCareerBackup = (
  profile,
  exportedAt = new Date().toISOString()
) => JSON.stringify({
  format: CAREER_BACKUP_FORMAT,
  backupVersion: 1,
  exportedAt,
  careerProfile: validateRecord(profile)
}, null, 2);

export const parseCareerBackup = (content) => {
  if (typeof content !== 'string' || content.length > CAREER_BACKUP_MAX_BYTES) {
    throw new Error('The backup must be a JSON file no larger than 2 MB.');
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  if (!parsed || parsed.format !== CAREER_BACKUP_FORMAT || parsed.backupVersion !== 1) {
    throw new Error('This is not a supported Voca career-profile backup.');
  }
  return validateRecord(parsed.careerProfile);
};

/**
 * Called only after the user previews and explicitly confirms a replacement.
 * A restored backup is marked reconciled so old legacy keys cannot replay
 * over the restored profile on the next load.
 */
export const restoreCareerBackup = (
  storage,
  candidate,
  now = () => new Date().toISOString()
) => {
  if (!storage || typeof storage.setItem !== 'function') {
    throw new Error('Browser storage is unavailable.');
  }
  validateRecord(candidate);
  const stamp = now();
  const migration = candidate.metadata.migration;
  const restored = {
    ...candidate,
    metadata: {
      ...candidate.metadata,
      updatedAt: stamp,
      migration: migration && migration.source === 'legacy-local-storage'
        ? { ...migration, reconciledAt: stamp }
        : migration
    }
  };
  storage.setItem(CAREER_PROFILE_STORAGE_KEY, JSON.stringify(restored));
  return restored;
};
