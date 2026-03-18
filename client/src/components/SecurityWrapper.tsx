import React, { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

interface SecurityWrapperProps {
  children: React.ReactNode;
  enableWatermark?: boolean;
  enableAntiCopy?: boolean;
  enableDevToolsDetection?: boolean;
}

const SecurityWrapper: React.FC<SecurityWrapperProps> = ({
  children,
  enableWatermark = true,
  enableAntiCopy = true,
  enableDevToolsDetection = true
}) => {
  const student = useAuthStore(s => s.student);
  const watermarkRef = useRef<HTMLDivElement>(null);

  const updateWatermark = useCallback(() => {
    if (!watermarkRef.current || !student) return;
    const phone = student.phone || student.id || '';
    const masked = phone.length > 4 ? phone.slice(0, 2) + '***' + phone.slice(-2) : phone;
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const text = `${masked} • ${ts}`;

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 300, 200);
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(128, 128, 128, 0.08)';
    ctx.save();
    ctx.translate(150, 100);
    ctx.rotate(-25 * Math.PI / 180);
    ctx.textAlign = 'center';
    ctx.fillText(text, 0, 0);
    ctx.restore();

    watermarkRef.current.style.backgroundImage = `url(${canvas.toDataURL()})`;
  }, [student]);

  useEffect(() => {
    if (!enableWatermark || !student) return;
    updateWatermark();
    const interval = setInterval(updateWatermark, 60000);
    return () => clearInterval(interval);
  }, [enableWatermark, student, updateWatermark]);

  useEffect(() => {
    if (!enableAntiCopy) return;

    const preventCopy = (e: Event) => { e.preventDefault(); return false; };
    const preventKeys = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 's') ||
        e.key === 'F12' ||
        (e.ctrlKey && e.key === 'p')
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('contextmenu', preventCopy);
    document.addEventListener('keydown', preventKeys);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('contextmenu', preventCopy);
      document.removeEventListener('keydown', preventKeys);
    };
  }, [enableAntiCopy]);

  useEffect(() => {
    if (!enableDevToolsDetection) return;

    let devtoolsOpen = false;
    const threshold = 160;

    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;

      if (widthDiff || heightDiff) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          console.clear();
          console.log('%c⚠️ Developer tools detected', 'color: red; font-size: 24px; font-weight: bold;');
          console.log('%cThis is a protected application. Unauthorized access is monitored.', 'color: orange; font-size: 14px;');
        }
      } else {
        devtoolsOpen = false;
      }
    };

    const interval = setInterval(checkDevTools, 2000);
    return () => clearInterval(interval);
  }, [enableDevToolsDetection]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', userSelect: enableAntiCopy ? 'none' : 'auto', WebkitUserSelect: enableAntiCopy ? 'none' : 'auto' }}>
      {children}
      {enableWatermark && student && (
        <div
          ref={watermarkRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 99998,
            backgroundRepeat: 'repeat'
          }}
        />
      )}
    </div>
  );
};

export default SecurityWrapper;
