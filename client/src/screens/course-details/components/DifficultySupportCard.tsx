import React from 'react';

interface DifficultySupportCardProps {
  studentName?: string;
  courseTitle?: string;
  supportPhone?: string;
}

export const DifficultySupportCard: React.FC<DifficultySupportCardProps> = ({
  studentName = 'Student',
  courseTitle = '',
  supportPhone = '919009008148',
}) => {
  const handleSupportClick = () => {
    const courseText = courseTitle ? ` regarding "${courseTitle}"` : '';
    const studentText = studentName && studentName !== 'Student' ? `\nStudent Name: ${studentName}` : '';
    const message = `Hello A-One Target Team,\nI have a query / need help${courseText}.${studentText}\nPlease guide me.`;
    
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${supportPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      onClick={handleSupportClick}
      className="mx-4 my-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:border-blue-200"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <span className="material-symbols-rounded text-xl">contact_support</span>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-800">
            Facing any difficulties, {studentName}?
          </p>
          <span className="text-[11px] font-bold text-primary-700 flex items-center gap-0.5">
            Talk to us <span className="material-symbols-rounded text-xs">chevron_right</span>
          </span>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
        <span className="material-symbols-rounded text-base">chat</span>
      </div>
    </div>
  );
};
