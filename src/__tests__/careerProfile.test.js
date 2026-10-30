import {
  CAREER_PROFILE_STORAGE_KEY,
  LEGACY_STORAGE_KEYS,
  createEmptyCareerProfile,
  isCareerProfile,
  migrateLegacyCareerProfile,
  reconcileLegacyCareerProfile,
  saveCareerProfile
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

  test('saves changes to the canonical profile without touching legacy backup data', () => {
    const legacy = JSON.stringify({ fullName: 'Original Name' });
    const storage = createStorage({ [LEGACY_STORAGE_KEYS.profile]: legacy });
    const initial = migrateLegacyCareerProfile(storage, () => timestamp).profile;

    const result = saveCareerProfile(storage, (current) => ({
      ...current,
      profile: { ...current.profile, fullName: 'New Name' }
    }), () => '2026-10-31T00:00:00.000Z');

    expect(result.profile.fullName).toBe('New Name');
    expect(result.metadata.createdAt).toBe(initial.metadata.createdAt);
    expect(result.metadata.updatedAt).toBe('2026-10-31T00:00:00.000Z');
    expect(storage.getItem(LEGACY_STORAGE_KEYS.profile)).toBe(legacy);
    expect(JSON.parse(storage.getItem(CAREER_PROFILE_STORAGE_KEY)).profile.fullName).toBe('New Name');
  });

  test('refuses to write when the canonical record is malformed', () => {
    const storage = createStorage({ [CAREER_PROFILE_STORAGE_KEY]: '{broken' });
    expect(() => saveCareerProfile(storage, (current) => current)).toThrow();
    expect(storage.getItem(CAREER_PROFILE_STORAGE_KEY)).toBe('{broken');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('refuses an invalid candidate without corrupting existing data', () => {
    const canonical = createEmptyCareerProfile(timestamp);
    const original = JSON.stringify(canonical);
    const storage = createStorage({ [CAREER_PROFILE_STORAGE_KEY]: original });
    expect(() => saveCareerProfile(storage, () => ({ schemaVersion: 2 }))).toThrow();
    expect(storage.getItem(CAREER_PROFILE_STORAGE_KEY)).toBe(original);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('reconciles legacy edits made after the initial migration exactly once', () => {
    const storage = createStorage({
      [LEGACY_STORAGE_KEYS.profile]: JSON.stringify({ fullName: 'Before' }),
      [LEGACY_STORAGE_KEYS.experience]: JSON.stringify({ experiences: [{ id: 1, company: 'Old', position: 'Dev' }] })
    });
    migrateLegacyCareerProfile(storage, () => timestamp);
    storage.setItem(LEGACY_STORAGE_KEYS.profile, JSON.stringify({ fullName: 'After' }));
    storage.setItem(LEGACY_STORAGE_KEYS.experience, JSON.stringify({
      experiences: [{ id: 2, company: 'New', position: 'Lead' }]
    }));

    const reconciled = reconcileLegacyCareerProfile(storage, () => timestamp);
    expect(reconciled.status).toBe('reconciled');
    expect(reconciled.profile.profile.fullName).toBe('After');
    expect(reconciled.profile.experiences[0].company).toBe('New');
    expect(reconciled.profile.metadata.migration.reconciledAt).toBe(timestamp);

    storage.setItem(LEGACY_STORAGE_KEYS.profile, JSON.stringify({ fullName: 'Stale copy' }));
    storage.setItem.mockClear();
    const subsequent = reconcileLegacyCareerProfile(storage, () => timestamp);
    expect(subsequent.status).toBe('existing');
    expect(subsequent.profile.profile.fullName).toBe('After');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('preserves canonical data when a legacy field is malformed during reconciliation', () => {
    const storage = createStorage({
      [LEGACY_STORAGE_KEYS.profile]: JSON.stringify({ fullName: 'Original' })
    });
    migrateLegacyCareerProfile(storage, () => timestamp);
    storage.setItem(LEGACY_STORAGE_KEYS.profile, '{invalid');
    const reconciled = reconcileLegacyCareerProfile(storage, () => timestamp);
    expect(reconciled.profile.profile.fullName).toBe('Original');
    expect(reconciled.warnings).toHaveLength(1);
    expect(storage.getItem(LEGACY_STORAGE_KEYS.profile)).toBe('{invalid');
  });

  test('propagates storage write failures without replacing a valid record', () => {
    const current = createEmptyCareerProfile(timestamp);
    const storage = createStorage({ [CAREER_PROFILE_STORAGE_KEY]: JSON.stringify(current) });
    storage.setItem.mockImplementation(() => { throw new Error('quota exceeded'); });
    expect(() => saveCareerProfile(storage, () => ({
      ...current,
      profile: { ...current.profile, fullName: 'Unsaved' }
    }))).toThrow('quota exceeded');
    expect(JSON.parse(storage.getItem(CAREER_PROFILE_STORAGE_KEY)).profile.fullName).toBe('');
  });

});
