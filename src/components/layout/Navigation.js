import React from 'react';
import { Briefcase, FileSearch, FileText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const linkClass = (path) => `flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isActive(path) ? 'bg-linkedin-50 dark:bg-linkedin-900 text-linkedin-700 dark:text-linkedin-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`;

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4"><div className="flex items-center justify-between h-16 gap-2">
        <Link to="/" className="flex items-center space-x-2 text-linkedin-600 hover:text-linkedin-700 transition-colors shrink-0"><Briefcase className="w-6 h-6" /><span className="font-bold text-lg hidden sm:inline">CareerWorkbench</span><span className="font-bold text-lg sm:hidden">Career</span></Link>
        <div className="flex space-x-1 overflow-x-auto">
          <Link to="/" className={linkClass('/')}><Briefcase className="w-4 h-4" /><span className="hidden sm:inline">Experiences</span></Link>
          <Link to="/resume" className={linkClass('/resume')}><FileText className="w-4 h-4" /><span className="hidden sm:inline">Resume</span></Link>
          <Link to="/job-match" className={linkClass('/job-match')}><FileSearch className="w-4 h-4" /><span className="hidden sm:inline">Job Match</span></Link>
        </div>
      </div></div>
    </nav>
  );
};

export default Navigation;
