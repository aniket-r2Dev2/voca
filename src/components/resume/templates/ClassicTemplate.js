import React from 'react';
import { Mail, Phone, MapPin, Linkedin, Globe, Calendar, Building2, Code2, Award, GraduationCap } from 'lucide-react';
import { formatDate, calculateDuration } from '../../../utils/dateUtils';

const contactItem = (Icon, content, key) => (
  <div key={key} data-testid="resume-contact-item" className="inline-flex items-center text-sm text-gray-600 leading-5">
    <span className="inline-flex items-center justify-center w-4 h-5 shrink-0 mr-1">
      <Icon className="w-4 h-4 block" />
    </span>
    <span className="leading-5">{content}</span>
  </div>
);

const ClassicTemplate = React.forwardRef(({ profile, experiences, education = [], certifications = [] }, ref) => {
  // Sort experiences by start date (most recent first)
  const sortedExperiences = [...experiences].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateB - dateA;
  });

  // Extract all unique skills from experiences
  const allSkills = [...new Set(
    sortedExperiences
      .filter(exp => exp.skills && exp.skills.length > 0)
      .flatMap(exp => exp.skills)
  )];

  return (
    <div ref={ref} className="bg-white p-12 max-w-4xl mx-auto" style={{ minHeight: '11in', fontFamily: 'Georgia, serif' }}>
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-6 mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {profile.fullName || 'Your Name'}
        </h1>
        {profile.headline && (
          <h2 className="text-xl text-gray-700 mb-4">
            {profile.headline}
          </h2>
        )}
        
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {profile.email && contactItem(Mail, profile.email, 'email')}
          {profile.phone && contactItem(Phone, profile.phone, 'phone')}
          {profile.location && contactItem(MapPin, profile.location, 'location')}
          {profile.linkedin && contactItem(Linkedin, 'LinkedIn', 'linkedin')}
          {profile.website && contactItem(Globe, 'Portfolio', 'website')}
        </div>
      </div>

      {/* Professional Summary */}
      {profile.summary && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-300 pb-2">
            Professional Summary
          </h3>
          <p className="text-gray-700 leading-relaxed">
            {profile.summary}
          </p>
        </div>
      )}

      {/* Technical Skills */}
      {allSkills.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-300 pb-2 flex items-center">
            <Code2 className="w-5 h-5 mr-2" />
            Technical Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {allSkills.map((skill, index) => (
              <span
                key={index}
                className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Work Experience */}
      {sortedExperiences.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-300 pb-2">
            Work Experience
          </h3>
          <div className="space-y-6">
            {sortedExperiences.map((exp, index) => (
              <div key={exp.id || index} className="relative pl-8 border-l-2 border-gray-300">
                <div className="absolute left-0 top-0 w-3 h-3 bg-gray-800 rounded-full" style={{ marginLeft: '-7px' }}></div>
                
                <div className="mb-2">
                  <h4 className="text-lg font-bold text-gray-900">{exp.position}</h4>
                  <div className="flex items-center text-gray-700 font-semibold">
                    <Building2 className="w-4 h-4 mr-1" />
                    {exp.company}
                    {exp.location && (
                      <span className="mx-2 text-gray-400">•</span>
                    )}
                    {exp.location && (
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {exp.location}
                      </span>
                    )}
                  </div>
                  {exp.startDate && (exp.current || exp.endDate) && <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                    <span className="mx-2">•</span>
                    {calculateDuration(exp.startDate, exp.endDate, exp.current)}
                  </div>}
                </div>

                {exp.description && (
                  <p className="text-gray-700 mb-3 leading-relaxed">
                    {exp.description}
                  </p>
                )}

                {/* Skills for this experience */}
                {exp.skills && exp.skills.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 font-semibold mb-1">Technologies:</p>
                    <p className="text-sm text-gray-700">
                      {exp.skills.join(' • ')}
                    </p>
                  </div>
                )}

                {exp.achievements && exp.achievements.length > 0 && exp.achievements[0] !== '' && (
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {exp.achievements.map((achievement, i) => (
                      achievement && <li key={i}>{achievement}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-300 pb-2 flex items-center">
            <GraduationCap className="w-5 h-5 mr-2" />
            Education
          </h3>
          <div className="space-y-4">
            {education.map((edu, index) => (
              <div key={index}>
                <h4 className="text-lg font-bold text-gray-900">{edu.degree}</h4>
                <p className="text-gray-700 font-semibold">{edu.institution}</p>
                <p className="text-sm text-gray-600">
                  {edu.graduationYear || `${edu.startYear} - ${edu.endYear}`}
                  {edu.gpa && <span> • GPA: {edu.gpa}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-300 pb-2 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Certifications
          </h3>
          <div className="space-y-2">
            {certifications.map((cert, index) => (
              <div key={index}>
                <h4 className="font-bold text-gray-900">{cert.name}</h4>
                <p className="text-sm text-gray-700">
                  {cert.issuer}
                  {cert.issueDate && <span> • {formatDate(cert.issueDate)}</span>}
                  {cert.expiryDate && <span> • Expires: {formatDate(cert.expiryDate)}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Note */}
      {sortedExperiences.length === 0 && !profile.summary && (
        <div className="text-center text-gray-400 py-12">
          <p>Add your profile information and work experiences to generate your resume.</p>
        </div>
      )}
    </div>
  );
});

ClassicTemplate.displayName = 'ClassicTemplate';

export default ClassicTemplate;
