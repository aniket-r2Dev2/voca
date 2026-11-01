import React from 'react';
import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';
import { formatDate, calculateDuration } from '../../../utils/dateUtils';
import ResumeAdditionalSections from '../ResumeAdditionalSections';

const contactItem = (Icon, content, key) => (
  <div key={key} data-testid="resume-contact-item" className="inline-flex items-center text-sm text-gray-600 font-light leading-5">
    <span className="inline-flex items-center justify-center w-3.5 h-5 shrink-0 mr-1.5">
      <Icon className="w-3.5 h-3.5 block" />
    </span>
    <span className="leading-5">{content}</span>
  </div>
);

const MinimalTemplate = React.forwardRef(({ profile, experiences, education = [], certifications = [], projects = [] }, ref) => {
  const sortedExperiences = [...experiences].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  const allSkills = [...new Set(sortedExperiences.filter(exp => exp.skills?.length).flatMap(exp => exp.skills))];

  return (
    <div ref={ref} className="bg-white p-16 max-w-4xl mx-auto" style={{ minHeight: '11in', fontFamily: '\'Helvetica Neue\', Arial, sans-serif' }}>
      <div className="mb-12">
        <h1 className="text-5xl font-light text-gray-900 mb-1 tracking-tight">{profile.fullName || 'Your Name'}</h1>
        {profile.headline && <p className="text-lg text-gray-600 font-light mb-4">{profile.headline}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 font-light border-t border-b border-gray-200 py-3 mt-4">
          {profile.email && contactItem(Mail, profile.email, 'email')}
          {profile.phone && contactItem(Phone, profile.phone, 'phone')}
          {profile.location && contactItem(MapPin, profile.location, 'location')}
          {profile.linkedin && contactItem(Linkedin, 'LinkedIn', 'linkedin')}
          {profile.website && contactItem(Globe, 'Portfolio', 'website')}
        </div>
      </div>

      {profile.summary && <div className="mb-10"><h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Summary</h3><p className="text-gray-700 leading-relaxed font-light">{profile.summary}</p></div>}
      {allSkills.length > 0 && <div className="mb-10"><h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Skills</h3><p className="text-gray-700 font-light">{allSkills.join(' • ')}</p></div>}

      {sortedExperiences.length > 0 && <div className="mb-10">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Experience</h3>
        <div className="space-y-6">
          {sortedExperiences.map((exp, index) => <div key={exp.id || index}>
            <div className="flex justify-between items-baseline mb-1 gap-4"><h4 className="text-lg font-medium text-gray-900">{exp.position}</h4>{exp.startDate && (exp.current || exp.endDate) && <span className="text-sm text-gray-600 font-light whitespace-nowrap">{formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}</span>}</div>
            <div className="flex justify-between items-baseline mb-2 gap-4"><p className="text-gray-700 font-light">{exp.company}{exp.location && <span className="text-gray-500"> • {exp.location}</span>}</p>{exp.startDate && (exp.current || exp.endDate) && <span className="text-sm text-gray-500 font-light whitespace-nowrap">{calculateDuration(exp.startDate, exp.endDate, exp.current)}</span>}</div>
            {exp.description && <p className="text-gray-700 mb-2 leading-relaxed font-light">{exp.description}</p>}
            {exp.skills?.length > 0 && <p className="text-sm text-gray-600 mb-2 italic font-light">{exp.skills.join(', ')}</p>}
            {exp.achievements?.length > 0 && exp.achievements[0] !== '' && <ul className="space-y-1 text-gray-700 font-light">{exp.achievements.map((achievement, i) => achievement && <li key={i} className="flex items-start"><span className="mr-2">—</span><span>{achievement}</span></li>)}</ul>}
          </div>)}
        </div>
      </div>}

      {education.length > 0 && <div className="mb-10"><h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Education</h3><div className="space-y-4">{education.map((edu, index) => <div key={edu.id || index}><div className="flex justify-between items-baseline gap-4"><h4 className="text-lg font-medium text-gray-900">{edu.degree}</h4><span className="text-sm text-gray-600 font-light">{edu.graduationYear || edu.endYear || `${edu.startYear || ''}`}</span></div><p className="text-gray-700 font-light">{edu.institution}{edu.location && ` • ${edu.location}`}{edu.gpa && <span className="text-gray-600"> • GPA: {edu.gpa}</span>}</p></div>)}</div></div>}
      {certifications.length > 0 && <div className="mb-10"><h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Certifications</h3><div className="space-y-2">{certifications.map((cert, index) => <div key={cert.id || index}><h4 className="font-medium text-gray-900">{cert.name}</h4><p className="text-sm text-gray-700 font-light">{cert.issuer}{cert.issueDate && <span> • {formatDate(cert.issueDate)}</span>}{cert.expiryDate && <span> • Expires: {formatDate(cert.expiryDate)}</span>}{cert.credentialId && <span> • ID: {cert.credentialId}</span>}</p></div>)}</div></div>}
      <ResumeAdditionalSections projects={projects} variant="minimal" />

      {sortedExperiences.length === 0 && !profile.summary && !projects.length && <div className="text-center text-gray-400 py-12"><p className="font-light">Add your profile information and work experiences to generate your resume.</p></div>}
    </div>
  );
});

MinimalTemplate.displayName = 'MinimalTemplate';
export default MinimalTemplate;
