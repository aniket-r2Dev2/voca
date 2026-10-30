import { useCallback, useEffect, useState } from 'react';
import {
  CAREER_PROFILE_STORAGE_KEY,
  reconcileLegacyCareerProfile,
  saveCareerProfile
} from '../utils/careerProfile';
import { restoreCareerBackup } from '../utils/careerBackup';

const CHANGE_EVENT = 'voca:career-profile-changed';

const getStorage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

const readCareerProfile = () => reconcileLegacyCareerProfile(getStorage()).profile;

/**
 * All editors use this hook to read and update the same versioned profile.
 * There are no mount-time writes, so an empty editor cannot overwrite saved data.
 */
const useCareerStore = () => {
  const [careerProfile, setCareerProfile] = useState(readCareerProfile);

  useEffect(() => {
    const refresh = () => setCareerProfile(readCareerProfile());
    const onStorage = (event) => {
      if (event.key === CAREER_PROFILE_STORAGE_KEY || event.key === null) refresh();
    };

    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const write = useCallback((change) => {
    try {
      const saved = saveCareerProfile(getStorage(), change);
      setCareerProfile(saved);
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return true;
    } catch (error) {
      console.error('Failed to save Voca career profile:', error);
      window.alert('Could not save your changes. Your existing data was not overwritten. Please export a backup and check browser storage.');
      return false;
    }
  }, []);

  const restore = useCallback((candidate) => {
    try {
      const saved = restoreCareerBackup(getStorage(), candidate);
      setCareerProfile(saved);
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return true;
    } catch (error) {
      console.error('Failed to restore Voca career profile:', error);
      window.alert('Restore failed. Your existing career profile was not intentionally changed.');
      return false;
    }
  }, []);

  return { careerProfile, write, restore };
};

export default useCareerStore;
