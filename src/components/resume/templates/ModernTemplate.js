import React from 'react';
import { Mail, Phone, MapPin, Linkedin, Globe, Calendar, Building2, Code2, Award, GraduationCap } from 'lucide-react';
import { formatDate, calculateDuration } from '../../../utils/dateUtils';

const contactItem = (Icon, content, key) => (
  <div key={key} data-testid="resume-contact-item" className="inline-flex items-center text-sm text-blue-100 leading-5">
    <span className="inline-flex items-center justify-center w-4 h-5 shrink-0 mr-1">
      <Icon className="w-4 h-4 block" />
    </span>
    <span className="leading-5">{content}</span>
  </div>
);

const ModernTemplate = React.forwardRef(({ profile, experiences, education = [], certifications = [] }, ref) => {
  const sortedExperiences = [...experiences].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateB - dateA;
  });

  const allSkills = [...new Set(
    sortedExperiences
      .filter(exp => exp.skills && exp.skills.length > 0)
      .flatMap(exp => exp.skills)
  )];

  return (
    <div ref={ref} className="bg-white max-w-4xl mx-auto" style={{ minHeight: '11in', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header with accent color */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-12 pb-8">
        <h1 className="text-5xl font-bold mb-2">
          {profile.fullName || 'Your Name'}
        </h1>
        {profile.headline && (
          <h2 className="text-2xl font-light mb-6 text-blue-100">
            {profile.headline}
          </h2>
        )}
        
        <div className="flex flex-wrap gap-4 text-sm text-blue-100">
          {profile.email && contactItem(Mail, profile.email, 'email')}
          {profile.phone && contactItem(Phone, profile.phone, 'phone')}
          {profile.location && contactItem(MapPin, profile.location, 'location')}
          {profile.linkedin && contactItem(Linkedin, 'LinkedIn', 'linkedin')}
          {profile.website && contactItem(Globe, 'Portfolio', 'website')}
        </div>
      </div>

      <div className="p-12 pt-8">
        {/* Professional Summary */}
        {profile.summary && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-4">
              About Me
            </h3>
            <p className="text-gray-700 leading-relaxed pl-6">
              {profile.summary}
            </p>
          </div>
        )}

        {/* Technical Skills */}
        {allSkills.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-4 flex items-center">
              <Code2 className="w-6 h-6 mr-2" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-2 pl-6">
              {allSkills.map((skill, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-200"
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
            <h3 className="text-2xl font-bold text-gray-900 mb-6 border-l-4 border-blue-600 pl-4">
              Experience
            </h3>
            <div className="space-y-8 pl-6">
              {sortedExperiences.map((exp, index) => (
                <div key={exp.id || index} className="border-l-2 border-gray-200 pl-6 pb-4">
                  <div className="mb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">{exp.position}</h4>
                        <div className="flex items-center text-blue-700 font-semibold mt-1">
                          <Building2 className="w-4 h-4 mr-1" />
                          {exp.company}
                        </div>
                      </div>
                      {exp.startDate && (exp.current || exp.endDate) && <div className="text-right text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                        </div>
                        <div className="font-medium text-blue-600 mt-1">
                          {calculateDuration(exp.startDate, exp.endDate, exp.current)}
                        </div>
                      </div>}
                    </div>
                    {exp.location && (
                      <div className="flex items-center text-gray-600 text-sm mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {exp.location}
                      </div>
                    )}
                  </div>

                  {exp.description && (
                    <p className="text-gray-700 mb-3 leading-relaxed">
                      {exp.description}
                    </p>
                  )}

                  {exp.skills && exp.skills.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {exp.skills.map((skill, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {exp.achievements && exp.achievements.length > 0 && exp.achievements[0] !== '' && (
                    <ul className="space-y-1.5 text-gray-700">
                      {exp.achievements.map((achievement, i) => (
                        achievement && (
                          <li key={i} className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                            <span>{achievement}</span>
                          </li>
                        )
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
            <h3 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-4 flex items-center">
              <GraduationCap className="w-6 h-6 mr-2" />
              Education
            </h3>
            <div className="space-y-4 pl-6">
              {education.map((edu, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-bold text-gray-900">{edu.degree}</h4>
                  <p className="text-blue-700 font-semibold">{edu.institution}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {edu.graduationYear || `${edu.startYear} - ${edu.endYear}`}
                    {edu.gpa && <span className="ml-3">• GPA: {edu.gpa}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-4 flex items-center">
              <Award className="w-6 h-6 mr-2" />
              Certifications
            </h3>
            <div className="space-y-3 pl-6">
              {certifications.map((cert, index) => (
                <div key={index} className="border-l-2 border-blue-200 pl-4">
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
      </div>

      {/* Footer */}
      {sortedExperiences.length === 0 && !profile.summary && (
        <div className="text-center text-gray-400 py-12">
          <p>Add your profile information and work experiences to generate your resume.</p>
        </div>
      )}
    </div>
  );
});

ModernTemplate.displayName = 'ModernTemplate';

export default ModernTemplate;
