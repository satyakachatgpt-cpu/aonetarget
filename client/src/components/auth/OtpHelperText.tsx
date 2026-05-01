import React from 'react';

export const OtpHelperText: React.FC = () => {
  return (
    <p className="text-[11px] text-gray-500 font-medium mt-2 text-center leading-relaxed">
      OTP sent successfully. It may take up to 30 seconds depending on your mobile network.<br />
      Please check your SMS inbox. Do not refresh this page.
    </p>
  );
};
