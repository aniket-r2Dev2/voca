import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/layout/Navigation';
import Dashboard from './pages/Dashboard';
import Resume from './pages/Resume';
import JobMatch from './pages/JobMatch';
import { migrateLegacyCareerProfile } from './utils/careerProfile';

const getBrowserStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch (error) {
    return null;
  }
};

const App = () => {
  const [profileBootstrap] = useState(() => migrateLegacyCareerProfile(getBrowserStorage()));

  return (
    <Router basename="/work-exp-app">
      <div className="min-h-screen bg-gradient-to-br from-linkedin-50 via-white to-linkedin-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        {(profileBootstrap.status === 'error' || profileBootstrap.status === 'invalid-canonical') && (
          <div className="mx-auto mt-4 max-w-4xl px-4" role="alert">
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
              Voca could not load its new career profile. Your existing browser data has been left untouched.
              Please export a backup before making further changes.
            </p>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/job-match" element={<JobMatch />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
