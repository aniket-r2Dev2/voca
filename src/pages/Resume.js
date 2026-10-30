import React, { useRef, useState } from 'react';
import { Download, Edit, Eye, FileText, Layout, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import useProfile from '../hooks/useProfile';
import useExperience from '../hooks/useExperience';
import useResumeSections from '../hooks/useResumeSections';
import ProfileForm from '../components/forms/ProfileForm';
import ResumeSectionsForm from '../components/forms/ResumeSectionsForm';
import ClassicTemplate from '../components/resume/templates/ClassicTemplateV2';
import ModernTemplate from '../components/resume/templates/ModernTemplateV2';
import MinimalTemplate from '../components/resume/templates/MinimalTemplate';
import Button from '../components/common/Button';

const TEMPLATES = [
  { id: 'classic', name: 'Classic', description: 'Traditional serif design', component: ClassicTemplate },
  { id: 'modern', name: 'Modern', description: 'Contemporary with colors', component: ModernTemplate },
  { id: 'minimal', name: 'Minimal', description: 'Clean and simple', component: MinimalTemplate },
];

const Resume = () => {
  const { profile, updateProfile } = useProfile();
  const { experiences } = useExperience();
  const { education, certifications, projects, updateSections } = useResumeSections();
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showSectionsForm, setShowSectionsForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [isExporting, setIsExporting] = useState(false);
  const resumeRef = useRef(null);
  const hasProfile = Boolean(profile.fullName || profile.email);
  const currentTemplate = TEMPLATES.find((template) => template.id === selectedTemplate) || TEMPLATES[0];
  const TemplateComponent = currentTemplate.component;

  const handleProfileUpdate = (updatedProfile) => { if (updateProfile(updatedProfile)) setShowProfileForm(false); };
  const handlePrint = useReactToPrint({ content: () => resumeRef.current, documentTitle: `Resume_${profile.fullName || 'MyResume'}` });

  const handleDownloadPDF = async () => {
    if (!resumeRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(resumeRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const pageWidth = 210;
      const pageHeight = 297;
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const image = canvas.toDataURL('image/png');
      let remaining = imageHeight;
      let offset = 0;
      while (remaining > 0) {
        pdf.addImage(image, 'PNG', 0, offset, pageWidth, imageHeight);
        remaining -= pageHeight;
        if (remaining > 0) { pdf.addPage(); offset = -(imageHeight - remaining); }
      }
      pdf.save(`Resume_${profile.fullName || 'MyResume'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      window.alert('Failed to generate PDF. Please try printing instead.');
    } finally { setIsExporting(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10"><div className="inline-flex items-center justify-center w-16 h-16 bg-linkedin-600 rounded-full mb-4"><FileText className="w-8 h-8 text-white" /></div><h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">Resume Builder</h1><p className="text-gray-600 dark:text-gray-300">Build, preview and export a complete professional resume.</p></div>
        <div className="mb-8"><div className="flex items-center justify-center mb-4"><Layout className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" /><h2 className="text-lg font-semibold text-gray-800 dark:text-white">Choose Template</h2></div><div className="flex flex-wrap justify-center gap-4">{TEMPLATES.map((template) => <button key={template.id} onClick={() => setSelectedTemplate(template.id)} className={`px-6 py-3 rounded-lg border-2 transition-all duration-200 ${selectedTemplate === template.id ? 'border-linkedin-600 bg-linkedin-50 dark:bg-linkedin-900/20 text-linkedin-700 dark:text-linkedin-400' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-linkedin-400'}`}><div className="font-semibold">{template.name}</div><div className="text-xs mt-1 opacity-75">{template.description}</div></button>)}</div></div>

        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Button onClick={() => setShowProfileForm((value) => !value)} variant={showProfileForm ? 'secondary' : 'primary'}><Edit className="w-4 h-4 mr-2" />{hasProfile ? 'Edit Profile' : 'Add Profile Info'}</Button>
          <Button onClick={() => setShowSectionsForm((value) => !value)} variant={showSectionsForm ? 'secondary' : 'primary'}><Layout className="w-4 h-4 mr-2" />{showSectionsForm ? 'Hide Resume Sections' : 'Add Resume Sections'}</Button>
          {hasProfile && <><Button onClick={handleDownloadPDF} variant="primary" disabled={isExporting}><Download className="w-4 h-4 mr-2" />{isExporting ? 'Generating PDF...' : 'Download PDF'}</Button><Button onClick={handlePrint} variant="secondary"><Printer className="w-4 h-4 mr-2" />Print</Button></>}
        </div>

        {showProfileForm && <ProfileForm profile={profile} onUpdate={handleProfileUpdate} onCancel={() => setShowProfileForm(false)} />}
        {showSectionsForm && <ResumeSectionsForm education={education} certifications={certifications} projects={projects} onChange={(key, value) => updateSections({ [key]: value })} />}

        <div data-testid="resume-preview" className="print:shadow-none bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"><TemplateComponent ref={resumeRef} profile={profile} experiences={experiences} education={education} certifications={certifications} projects={projects} /></div>

        {!hasProfile && !showProfileForm && <div className="text-center mt-12 p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl"><Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Get Started</h3><p className="text-gray-600 dark:text-gray-300 mb-6">Add your profile information to see your resume preview.</p><Button onClick={() => setShowProfileForm(true)}><Edit className="w-4 h-4 mr-2" />Add Profile Info</Button></div>}
      </div>
    </div>
  );
};

export default Resume;
