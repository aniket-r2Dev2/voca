import { useEffect, useState } from 'react';
import { analyzeJobDescription } from '../utils/jobMatchUtils';
import { LEGACY_STORAGE_KEYS } from '../utils/careerProfile';

const STORAGE_KEY = LEGACY_STORAGE_KEYS.jobMatch;
const EMPTY_MATCH = { jobDescription: '', analysis: null };

const loadJobMatch = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_MATCH;
    const parsed = JSON.parse(raw);
    return {
      jobDescription: typeof parsed?.jobDescription === 'string' ? parsed.jobDescription : '',
      analysis: parsed?.analysis || null
    };
  } catch (error) {
    console.error('Failed to load job match data:', error);
    return EMPTY_MATCH;
  }
};

const useJobMatch = (profileData) => {
  const [jobMatch, setJobMatch] = useState(loadJobMatch);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) setJobMatch(loadJobMatch());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setJobMatch(next);
    } catch (error) {
      console.error('Failed to save job match data:', error);
      window.alert('Could not save job match data in this browser.');
    }
  };

  const setJobDescription = (value) => {
    const description = typeof value === 'function' ? value(jobMatch.jobDescription) : value;
    persist({ ...jobMatch, jobDescription: description });
  };

  const analyze = () => {
    const trimmed = jobMatch.jobDescription.trim();
    if (!trimmed) return null;
    const result = analyzeJobDescription(trimmed, profileData);
    persist({ ...jobMatch, analysis: result });
    return result;
  };

  const clear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setJobMatch(EMPTY_MATCH);
    } catch (error) {
      console.error('Failed to delete job match data:', error);
      window.alert('Could not delete job match data.');
    }
  };

  return {
    jobDescription: jobMatch.jobDescription,
    setJobDescription,
    analysis: jobMatch.analysis,
    analyze,
    clear
  };
};

export default useJobMatch;
