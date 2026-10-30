import {
  CAREER_BACKUP_FORMAT,
  CAREER_BACKUP_MAX_BYTES,
  createCareerBackup,
  parseCareerBackup,
  restoreCareerBackup
} from '../utils/careerBackup';
import {
  CAREER_PROFILE_STORAGE_KEY,
  LEGACY_STORAGE_KEYS,
  createEmptyCareerProfile,
  reconcileLegacyCareerProfile
} from '../utils/careerProfile';

const timestamp = '2026-10-31T00:00:00.000Z';
const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key) => (values.has(key) ? values.get(key) : null)),
    setItem: jest.fn((key, value) => values.set(key, value)),
    values
  };
};

describe('career-profile backup', () => {
  test('round-trips all profile sections without removing any fields', () => {
    const profile = createEmptyCareerProfile(timestamp);
    profile.profile.fullName = 'Ada Lovelace';
    profile.experiences.push({ id: 1, company: 'Analytical Engine', position: 'Engineer' });
    profile.education.push({ id: 2, degree: 'Mathematics' });
    profile.skills.push('Research');
    profile.volunteering.push({ id: 3, organization: 'Science Club' });

    const serialized = createCareerBackup(profile, timestamp);
    expect(JSON.parse(serialized)).toMatchObject({
      format: CAREER_BACKUP_FORMAT,
      backupVersion: 1,
      exportedAt: timestamp
    });
    expect(parseCareerBackup(serialized)).toEqual(profile);
  });

  test('rejects invalid JSON, unknown formats and malformed careers', () => {
    expect(() => parseCareerBackup('{')).toThrow('not valid JSON');
    expect(() => parseCareerBackup(JSON.stringify({
      format: 'not-voca', backupVersion: 1, careerProfile: {}
    }))).toThrow('not a supported Voca');
    expect(() => parseCareerBackup(JSON.stringify({
      format: CAREER_BACKUP_FORMAT, backupVersion: 2, careerProfile: {}
    }))).toThrow('not a supported Voca');
    expect(() => parseCareerBackup(JSON.stringify({
      format: CAREER_BACKUP_FORMAT, backupVersion: 1, careerProfile: { schemaVersion: 99 }
    }))).toThrow('invalid career profile');
  });

  test('rejects backups larger than the 2 MB limit', () => {
    expect(() => parseCareerBackup('a'.repeat(CAREER_BACKUP_MAX_BYTES + 1))).toThrow('2 MB');
  });

  test('restores exact profile sections while leaving legacy records untouched', () => {
    const old = createEmptyCareerProfile(timestamp);
    old.profile.fullName = 'Old';
    const backup = createEmptyCareerProfile(timestamp);
    backup.profile.fullName = 'Restored';
    backup.projects = [{ id: 'abc', name: 'Paperkit' }];
    const oldLegacy = JSON.stringify({ fullName: 'Legacy' });
    const storage = createStorage({
      [CAREER_PROFILE_STORAGE_KEY]: JSON.stringify(old),
      [LEGACY_STORAGE_KEYS.profile]: oldLegacy
    });

    const result = restoreCareerBackup(storage, backup, () => '2026-11-01T00:00:00.000Z');
    expect(result.profile.fullName).toBe('Restored');
    expect(result.projects).toEqual(backup.projects);
    expect(result.metadata.updatedAt).toBe('2026-11-01T00:00:00.000Z');
    expect(storage.getItem(LEGACY_STORAGE_KEYS.profile)).toBe(oldLegacy);
    expect(JSON.parse(storage.getItem(CAREER_PROFILE_STORAGE_KEY))).toEqual(result);
  });

  test('explicit restore can recover from a malformed canonical record', () => {
    const backup = createEmptyCareerProfile(timestamp);
    const storage = createStorage({ [CAREER_PROFILE_STORAGE_KEY]: '{broken' });
    expect(restoreCareerBackup(storage, backup, () => timestamp)).toEqual(backup);
    expect(JSON.parse(storage.getItem(CAREER_PROFILE_STORAGE_KEY))).toEqual(backup);
  });

  test('restored older backup cannot be overwritten by legacy reconciliation', () => {
    const backup = createEmptyCareerProfile(timestamp);
    backup.profile.fullName = 'Recovered';
    backup.metadata.migration = {
      source: 'legacy-local-storage',
      completedAt: timestamp,
      sourceKeys: [LEGACY_STORAGE_KEYS.profile]
    };
    const storage = createStorage({
      [LEGACY_STORAGE_KEYS.profile]: JSON.stringify({ fullName: 'Stale' })
    });
    restoreCareerBackup(storage, backup, () => timestamp);
    const profile = reconcileLegacyCareerProfile(storage, () => timestamp).profile;
    expect(profile.profile.fullName).toBe('Recovered');
    expect(profile.metadata.migration.reconciledAt).toBe(timestamp);
  });

  test('invalid restore cannot modify existing local storage', () => {
    const before = JSON.stringify(createEmptyCareerProfile(timestamp));
    const storage = createStorage({ [CAREER_PROFILE_STORAGE_KEY]: before });
    expect(() => restoreCareerBackup(storage, { schemaVersion: 2 })).toThrow();
    expect(storage.getItem(CAREER_PROFILE_STORAGE_KEY)).toBe(before);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
