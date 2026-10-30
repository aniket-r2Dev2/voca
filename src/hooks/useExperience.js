import { useState } from 'react';
import useCareerStore from './useCareerStore';

const STORAGE_VERSION = '1.0';
const EMPTY_EXPERIENCES = [];

const useExperience = () => {
  const { careerProfile, write } = useCareerStore();
  const experiences = careerProfile?.experiences || EMPTY_EXPERIENCES;
  const [showForm, setShowForm] = useState(() => !careerProfile?.experiences?.length);

  const updateExperiences = (transform) => write((current) => ({
    ...current,
    experiences: transform(current.experiences)
  }));

  const addExperience = (experienceData) => {
    const newExperience = {
      ...experienceData,
      id: Date.now() + Math.random(),
      achievements: (experienceData.achievements || []).filter((achievement) => achievement.trim() !== '')
    };
    if (updateExperiences((current) => [...current, newExperience])) setShowForm(false);
  };

  const updateExperience = (id, experienceData) => {
    if (updateExperiences((current) => current.map((exp) => exp.id === id
      ? {
          ...experienceData,
          id: exp.id,
          achievements: (experienceData.achievements || []).filter((achievement) => achievement.trim() !== '')
        }
      : exp
    ))) setShowForm(false);
  };

  const removeExperience = (id) => {
    updateExperiences((current) => current.filter((exp) => exp.id !== id));
  };

  const toggleForm = () => setShowForm((current) => !current);

  const exportData = () => {
    try {
      const dataToExport = {
        experiences,
        version: STORAGE_VERSION,
        exportedAt: new Date().toISOString(),
        appName: 'Voca'
      };
      const dataBlob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'voca-experiences-' + new Date().toISOString().split('T')[0] + '.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Error exporting data:', error);
      window.alert('Failed to export data. Please try again.');
      return false;
    }
  };

  const importData = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData.experiences)) throw new Error('Invalid data format');
        const validExperiences = importedData.experiences.filter((exp) => exp && exp.company && exp.position);
        if (validExperiences.length === 0) throw new Error('No valid experiences found in file');

        const shouldReplace = experiences.length === 0 || window.confirm(
          'Found ' + validExperiences.length + ' experience(s) in the file.\n\n' +
          'You currently have ' + experiences.length + ' experience(s).\n\n' +
          'Click OK to REPLACE your current data, or Cancel to MERGE with existing data.'
        );

        const updated = updateExperiences((current) => {
          if (shouldReplace) {
            return validExperiences.map((exp) => ({ ...exp, id: exp.id || Date.now() + Math.random() }));
          }
          return [
            ...current,
            ...validExperiences.map((exp) => ({ ...exp, id: Date.now() + Math.random() }))
          ];
        });
        if (!updated) throw new Error('Could not save imported experiences');
        setShowForm(false);
        resolve(validExperiences.length);
      } catch (error) {
        console.error('Error parsing imported data:', error);
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });

  const clearAllData = () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL experiences?\n\n' +
      'This action cannot be undone. Consider exporting your data first.'
    );
    if (!confirmed) return false;
    if (updateExperiences(() => [])) {
      setShowForm(true);
      return true;
    }
    return false;
  };

  return {
    experiences, showForm, addExperience, updateExperience, removeExperience,
    toggleForm, exportData, importData, clearAllData
  };
};

export default useExperience;
