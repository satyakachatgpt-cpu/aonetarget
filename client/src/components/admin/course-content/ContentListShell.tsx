import React from 'react';

interface ContentListShellProps {
  children: React.ReactNode;
}

const ContentListShell: React.FC<ContentListShellProps> = ({ children }) => {
  return (
    <div className="flex-1 min-w-0 overflow-visible">
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-visible">
        <div className="p-4 space-y-3 overflow-visible">
          {children}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ContentListShell);
