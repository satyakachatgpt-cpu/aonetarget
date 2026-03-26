import React from 'react';
import BlockedUsers from './BlockedUsers';

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const SecurityCenter: React.FC<Props> = ({ showToast }) => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Security Center</h1>
        <p className="text-gray-500">Manage your application security and user access.</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <BlockedUsers showToast={showToast} />
      </div>
    </div>
  );
};

export default SecurityCenter;
