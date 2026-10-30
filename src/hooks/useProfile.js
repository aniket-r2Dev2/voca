import useCareerStore from './useCareerStore';
import { createEmptyCareerProfile } from '../utils/careerProfile';

const EMPTY_PROFILE = createEmptyCareerProfile().profile;

const useProfile = () => {
  const { careerProfile, write } = useCareerStore();
  const profile = careerProfile?.profile || EMPTY_PROFILE;

  const updateProfile = (updates) => write((current) => ({
    ...current,
    profile: { ...current.profile, ...updates }
  }));

  const clearProfile = () => write((current) => ({
    ...current,
    profile: { ...EMPTY_PROFILE }
  }));

  return { profile, updateProfile, clearProfile };
};

export default useProfile;
