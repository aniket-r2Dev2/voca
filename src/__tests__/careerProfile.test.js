import {
  CAREER_PROFILE_STORAGE_KEY,
  LEGACY_STORAGE_KEYS,
  createEmptyCareerProfile,
  isCareerProfile,
  migrateLegacyCareerProfile
} from '../utils/careerProfile';

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key) => (values.has(key) ? values.get(key) : null)),
    setItem: jest.fn((key, value) => values.set(key, value)),
    removeItem: jest.fn((key) => values.delete(key)),
    values
  };
};

describe('careerProfile', () => {
  const timestamp = '2026-10-30T12:00:00.000Z';

  test('creates a versioned empty profile with stable collection defaults', () => {
    const profile = createEmptyCareerProfile(timestamp);

    expect(profile.schemaVersion).toBe(1);
    expect(profile.profile.fullName).toBe('');
    expect(profile.experiences).toEqual([]);
    expect(profile.education).toEqual([]);
    expect(profile.skills).toEqual([]);
    expect(profile.metadata.createdAt).toBe(timestamp);
    expect(isCareerProfile(profile)).toBe(true);
  });

  test('migrates all supported legacy career records without deleting source keys', () => {
    const legacyProfile = { fullName: 'Ada Lovelace', headline: 'Engineer' };
    const experiences = [{ id: 1, company: 'Analytical Engines', position: 'Engineer' }];
    const education = [{ id: 2, institution: 'University', degree: 'Mathematics' }];
    const projects = [{ id: 3, name: 'Notes' }];
    const storage = createStorage({
      [LEGACY_STORAGE_KEYS.profile]: JSON.stringify(legacyProfile),
      [LEGACY_STORAGE_KEYS.experience]: JSON.stringify({ experiences, version: '1.0' }),
      [LEGACY_STORAGE_KEYS.resumeSections]: JSON.stringify({ education, projects })
    });

    const result = migrateLegacyCareerProfile(storage, () => timestamp);

    expect(result.status).toBe('migrated');
    expect(result.profile.profile).toMatchObject(legacyProfile);
    expect(result.profile.experiences).toEqual(experiences);
    expect(result.profile.education).toEqual(education);
    expect(result.profile.projects).toEqual(projects);
    expect(result.profile.metadata.migration.sourceKeys).toHaveLength(3);
    expect(storage.getItem(LEGACY_STORAGE_KEYS.profile)).toBe(JSON.stringify(legacyProfile));
    expect(storage.getItem(LEGACY_STORAGE_KEYS.experience)).toBe(JSON.stringify({ experiences, version: '1.0' }));
    expect(storage.getItem(CAREER_PROFILE_STORAGE_KEY)).not.toBeNull();
  });

  test('is idempotent and never overwrites an existing valid canonical profile', () => {
    const existing = createEmptyCareerProfile(timestamp);
    existing.profile.fullName = 'Grace Hopper';
    const storage = createStorage({
      [CAREER_PROFILE_STORAGE_KEY]: JSON.stringify(existing),
      [LEGACY_STORAGE_KEYS.profile]: JSON.stringify({ fullName: 'Older record' })
    });

    const result = migrateLegacyCareerProfile(storage, () => timestamp);

    expect(result.status).toBe('existing');
    expect(result.profile.profile.fullName).toBe('Grace Hopper');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('does not overwrite a malformed canonical record', () => {
    const raw = '{broken';
    const storage = createStorage({ [CAREER_PROFILE_STORAGE_KEY]: raw });

    const result = migrateLegacyCareerProfile(storage, () => timestamp);

    expect(result.status).toBe('invalid-canonical');
    expect(storage.getItem(CAREER_PROFILE_STORAGE_KEY)).toBe(raw);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('keeps malformed legacy values and reports a warning while migrating other data', () => {
    const experiences = [{ id: 1, company: 'Acme', position: 'Developer' }];
    const storage = createStorage({
      [LEGACY_STORAGE_KEYS.profile]: '{broken',
      [LEGACY_STORAGE_KEYS.experience]: JSON.stringify({ experiences })
    });

    const result = migrateLegacyCareerProfile(storage, () => timestamp);

    expect(result.status).toBe('migrated');
    expect(result.profile.profile.fullName).toBe('');
    expect(result.profile.experiences).toEqual(experiences);
    expect(result.warnings).toHaveLength(1);
    expect(storage.getItem(LEGACY_STORAGE_KEYS.profile)).toBe('{broken');
  });

  test('does not treat job match data as career-profile content or delete it', () => {
    const jobMatch = { jobDescription: 'A role', analysis: null };
    const storage = createStorage({
      [LEGACY_STORAGE_KEYS.jobMatch]: JSON.stringify(jobMatch)
    });

    const result = migrateLegacyCareerProfile(storage, () => timestamp);

    expect(result.status).toBe('created');
    expect(result.profile.experiences).toEqual([]);
    expect(storage.getItem(LEGACY_STORAGE_KEYS.jobMatch)).toBe(JSON.stringify(jobMatch));
  });

  test('returns an error result when storage is unavailable', () => {
    expect(migrateLegacyCareerProfile(null).status).toBe('error');
  });
});
