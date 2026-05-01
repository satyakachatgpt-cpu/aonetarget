import React from 'react';

const TestsEmptyState: React.FC = () => {
  return (
    <tr>
      <td colSpan={6} className="px-8 py-20 text-center">
        <span className="material-symbols-outlined text-6xl text-gray-200 mb-2 block">
          quiz
        </span>
        <p className="text-gray-400 font-medium font-bold italic">
          No records found
        </p>
      </td>
    </tr>
  );
};

export default TestsEmptyState;
