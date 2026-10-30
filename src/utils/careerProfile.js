export const CAREER_PROFILE_STORAGE_KEY = 'voca_career_profile_v1';

export const LEGACY_STORAGE_KEYS = {
  profile: 'user_profile_data',
  experience: 'work_experience_data',
  resumeSections: 'resume_sections_data',
  jobMatch: 'job_match_data'
};

const EMPTY_PROFILE_FIELDS = {
  fullName: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  website: '',
  summary: ''
};

const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : null
);

const asArray = (value) => (Array.isArray(value) ? value : []);

export const createEmptyCareerProfile = (now = new Date().toISOString()) => ({
  schemaVersion: 1,
  profile: { ...EMPTY_PROFILE_FIELDS },
  experiences: [],
  education: [],
  certifications: [],
  projects: [],
  skills: [],
  languages: [],
  volunteering: [],
  metadata: {
    createdAt: now,
    updatedAt: now,
    migration: null
  }
});

export const isCareerProfile = (value) => {
  const data = asObject(value);
  if (!data || data.schemaVersion !== 1 || !asObject(data.profile)) return false;

  const collectionKeys = [
    'experiences',
    'education',
    'certifications',
    'projects',
    'skills',
    'languages',
    'volunteering'
  ];

  return collectionKeys.every((key) => Array.isArray(data[key]))
    && asObject(data.metadata) !== null;
};

const readLegacyValue = (storage, key, warnings) => {
  const raw = storage.getItem(key);
  if (raw === null) return null;

  try {
    return JSON.parse(raw);
  } catch {
    warnings.push(`Could not parse legacy data in "${key}". The original value was kept.`);
    return null;
  }
};

/**
 * Creates the versioned Voca profile once from the existing local records.
 * Legacy keys are deliberately retained so migration can be verified and
 * rolled back without asking users to recover data from a backup.
 */
export const migrateLegacyCareerProfile = (
  storage,
  now = () => new Date().toISOString()
) => {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    return { status: 'error', profile: null, warnings: ['Browser storage is unavailable.'] };
  }

  try {
    const current = storage.getItem(CAREER_PROFILE_STORAGE_KEY);
    if (current !== null) {
      try {
        const parsed = JSON.parse(current);
        if (isCareerProfile(parsed)) return { status: 'existing', profile: parsed, warnings: [] };
        return {
          status: 'invalid-canonical',
          profile: null,
          warnings: ['The saved Voca profile has an unsupported structure. Existing data was not changed.']
        };
      } catch {
        return {
          status: 'invalid-canonical',
          profile: null,
          warnings: ['The saved Voca profile could not be read. Existing data was not changed.']
        };
      }
    }

    const warnings = [];
    const profileData = asObject(readLegacyValue(storage, LEGACY_STORAGE_KEYS.profile, warnings));
    const experienceData = readLegacyValue(storage, LEGACY_STORAGE_KEYS.experience, warnings);
    const sectionData = asObject(readLegacyValue(storage, LEGACY_STORAGE_KEYS.resumeSections, warnings));

    const experiences = Array.isArray(experienceData)
      ? experienceData
      : asArray(asObject(experienceData)?.experiences);

    const sourceKeys = [
      LEGACY_STORAGE_KEYS.profile,
      LEGACY_STORAGE_KEYS.experience,
      LEGACY_STORAGE_KEYS.resumeSections
    ].filter((key) => storage.getItem(key) !== null);

    const timestamp = now();
    const migrated = createEmptyCareerProfile(timestamp);
    migrated.profile = { ...EMPTY_PROFILE_FIELDS, ...(profileData || {}) };
    migrated.experiences = experiences;
    migrated.education = asArray(sectionData?.education);
    migrated.certifications = asArray(sectionData?.certifications);
    migrated.projects = asArray(sectionData?.projects);
    migrated.metadata.migration = {
      source: 'legacy-local-storage',
      completedAt: timestamp,
      sourceKeys
    };

    storage.setItem(CAREER_PROFILE_STORAGE_KEY, JSON.stringify(migrated));

    return {
      status: sourceKeys.length > 0 ? 'migrated' : 'created',
      profile: migrated,
      warnings
    };
  } catch {
    return {
      status: 'error',
      profile: null,
      warnings: ['Voca could not initialize the career profile. Existing records were not intentionally removed.']
    };
  }
};


/**
 * Applies a change to the latest canonical record. Never writes to legacy keys.
 * Throws rather than overwriting an invalid or unreadable stored profile.
 */
export const saveCareerProfile = (
  storage,
  change,
  now = () => new Date().toISOString()
) => {
  const loaded = migrateLegacyCareerProfile(storage, now);
  if (!loaded.profile) {
    throw new Error(loaded.warnings[0] || 'Career profile is unavailable.');
  }

  const updated = typeof change === 'function' ? change(loaded.profile) : change;
  if (!isCareerProfile(updated)) {
    throw new Error('Refusing to save an invalid career profile.');
  }

  const saved = {
    ...updated,
    metadata: {
      ...updated.metadata,
      createdAt: loaded.profile.metadata.createdAt,
      updatedAt: now()
    }
  };
  storage.setItem(CAREER_PROFILE_STORAGE_KEY, JSON.stringify(saved));
  return saved;
};
