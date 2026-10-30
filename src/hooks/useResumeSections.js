import useCareerStore from './useCareerStore';

const EMPTY_SECTIONS = {
  education: [],
  certifications: [],
  projects: []
};

const useResumeSections = () => {
  const { careerProfile, write } = useCareerStore();
  const sections = careerProfile || EMPTY_SECTIONS;

  const updateSections = (updates) => write((current) => ({
    ...current,
    ...Object.fromEntries(
      Object.entries(updates)
        .filter(([key]) => Object.prototype.hasOwnProperty.call(EMPTY_SECTIONS, key))
        .map(([key, value]) => [key, Array.isArray(value) ? value : []])
    )
  }));

  const clearSections = () => write((current) => ({
    ...current,
    education: [],
    certifications: [],
    projects: []
  }));

  return {
    education: sections.education,
    certifications: sections.certifications,
    projects: sections.projects,
    updateSections,
    clearSections
  };
};

export default useResumeSections;
