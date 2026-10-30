import {
  VOCA_LOCAL_STORAGE_KEYS,
  deleteAllVocaLocalData,
  hasStoredCareerData
} from '../utils/localDataPrivacy';
import { CAREER_PROFILE_STORAGE_KEY, LEGACY_STORAGE_KEYS } from '../utils/careerProfile';

const makeStorage = (entries = {}) => {
  const values = new Map(Object.entries(entries));
  return {
    getItem: jest.fn((key) => values.has(key) ? values.get(key) : null),
    removeItem: jest.fn((key) => values.delete(key)),
    values
  };
};

describe('local privacy controls', () => {
  test('lists exactly the Voca-owned keys including job match and legacy backups', () => {
    expect(new Set(VOCA_LOCAL_STORAGE_KEYS)).toEqual(new Set([
      CAREER_PROFILE_STORAGE_KEY,
      LEGACY_STORAGE_KEYS.profile,
      LEGACY_STORAGE_KEYS.experience,
      LEGACY_STORAGE_KEYS.resumeSections,
      LEGACY_STORAGE_KEYS.jobMatch
    ]));
  });

  test('deletes every Voca key but preserves unrelated origin storage', () => {
    const originals = Object.fromEntries(VOCA_LOCAL_STORAGE_KEYS.map((key) => [key, 'private']));
    const storage = makeStorage({ ...originals, another_product: 'keep' });
    expect(hasStoredCareerData(storage)).toBe(true);

    deleteAllVocaLocalData(storage);

    for (const key of VOCA_LOCAL_STORAGE_KEYS) {
      expect(storage.getItem(key)).toBeNull();
      expect(storage.removeItem).toHaveBeenCalledWith(key);
    }
    expect(storage.getItem('another_product')).toBe('keep');
    expect(storage.values.size).toBe(1);
    expect(hasStoredCareerData(storage)).toBe(false);
  });

  test('job match alone does not count as saved career data', () => {
    const storage = makeStorage({ [LEGACY_STORAGE_KEYS.jobMatch]: '{"jobDescription":"JD"}' });
    expect(hasStoredCareerData(storage)).toBe(false);
  });

  test('empty browser storage is not considered a saved profile', () => {
    expect(hasStoredCareerData(makeStorage())).toBe(false);
    expect(() => deleteAllVocaLocalData(makeStorage())).not.toThrow();
  });

  test('refuses to delete when storage is unavailable', () => {
    expect(() => deleteAllVocaLocalData(null)).toThrow('unavailable');
  });

  test('surfaces remove failures instead of claiming the data was deleted', () => {
    const storage = makeStorage({ [CAREER_PROFILE_STORAGE_KEY]: 'sensitive' });
    storage.removeItem.mockImplementation(() => { throw new Error('blocked'); });
    expect(() => deleteAllVocaLocalData(storage)).toThrow('blocked');
    expect(storage.getItem(CAREER_PROFILE_STORAGE_KEY)).toBe('sensitive');
  });
});
