import { useState, useEffect } from 'react';

const STORAGE_KEY = 'work_experience_data';
const STORAGE_VERSION = '1.0';

// Load data from localStorage with validation
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { experiences: [], version: STORAGE_VERSION };

    const data = JSON.parse(stored);
    
    // Validate data structure
    if (!data.experiences || !Array.isArray(data.experiences)) {
      console.warn('Invalid data structure in localStorage, resetting...');
      return { experiences: [], version: STORAGE_VERSION };
    }

    // Validate each experience has required fields
    const validExperiences = data.experiences.filter(exp => {
      return exp.id && exp.company && exp.position;
    });

    return {
      experiences: validExperiences,
      version: data.version || STORAGE_VERSION
    };
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return { experiences: [], version: STORAGE_VERSION };
  }
};

// Save data to localStorage
const saveToStorage = (experiences) => {
  try {
    const data = {
      experiences,
      version: STORAGE_VERSION,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please export your data and clear some experiences.');
    }
  }
};

const useExperience = () => {
  // Initialize state from localStorage
  const [experiences, setExperiences] = useState(() => {
    const data = loadFromStorage();
    return data.experiences;
  });
  const [showForm, setShowForm] = useState(() => {
    const data = loadFromStorage();
    return data.experiences.length === 0;
  });

  // Auto-save to localStorage whenever experiences change
  useEffect(() => {
    saveToStorage(experiences);
  }, [experiences]);

  const addExperience = (experienceData) => {
    const newExperience = {
      ...experienceData,
      id: Date.now(),
      achievements: experienceData.achievements.filter(achievement => achievement.trim() !== '')
    };
    setExperiences(prev => [...prev, newExperience]);
    setShowForm(false);
  };

  const updateExperience = (id, experienceData) => {
    setExperiences(prev => 
      prev.map(exp => 
        exp.id === id 
          ? {
              ...experienceData,
              id: exp.id, // Preserve the original ID
              achievements: experienceData.achievements.filter(achievement => achievement.trim() !== '')
            }
          : exp
      )
    );
    setShowForm(false);
  };

  const removeExperience = (id) => {
    setExperiences(prev => prev.filter(exp => exp.id !== id));
  };

  const toggleForm = () => {
    setShowForm(!showForm);
  };

  // Export data to JSON file
  const exportData = () => {
    try {
      const dataToExport = {
        experiences,
        version: STORAGE_VERSION,
        exportedAt: new Date().toISOString(),
        appName: 'Voca'
      };
      
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `voca-experiences-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
      return false;
    }
  };

  // Import data from JSON file
  const importData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          // Validate imported data
          if (!importedData.experiences || !Array.isArray(importedData.experiences)) {
            throw new Error('Invalid data format');
          }

          // Validate each experience
          const validExperiences = importedData.experiences.filter(exp => {
            return exp.company && exp.position;
          });

          if (validExperiences.length === 0) {
            throw new Error('No valid experiences found in file');
          }

          // Ask user if they want to replace or merge
          const shouldReplace = experiences.length === 0 || 
            window.confirm(
              `Found ${validExperiences.length} experience(s) in the file.\n\n` +
              `You currently have ${experiences.length} experience(s).\n\n` +
              `Click OK to REPLACE your current data, or Cancel to MERGE with existing data.`
            );

          if (shouldReplace) {
            setExperiences(validExperiences);
          } else {
            // Merge: Add imported experiences with new IDs to avoid conflicts
            const mergedExperiences = validExperiences.map(exp => ({
              ...exp,
              id: Date.now() + Math.random() // Ensure unique IDs
            }));
            setExperiences(prev => [...prev, ...mergedExperiences]);
          }

          resolve(validExperiences.length);
        } catch (error) {
          console.error('Error parsing imported data:', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  };

  // Clear all data
  const clearAllData = () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL experiences?\n\n' +
      'This action cannot be undone. Consider exporting your data first.'
    );
    
    if (confirmed) {
      setExperiences([]);
      setShowForm(true);
      return true;
    }
    return false;
  };

  return {
    experiences,
    showForm,
    addExperience,
    updateExperience,
    removeExperience,
    toggleForm,
    exportData,
    importData,
    clearAllData
  };
};

export default useExperience;