import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/layout/Navigation';
import Dashboard from './pages/Dashboard';
import Resume from './pages/Resume';
import JobMatch from './pages/JobMatch';

const App = () => {
  return (
    <Router basename={process.env.PUBLIC_URL || "/"}>
      <div className="min-h-screen bg-gradient-to-br from-linkedin-50 via-white to-linkedin-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
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
