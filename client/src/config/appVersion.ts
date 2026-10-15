export const APP_VERSION_CONFIG = {
  version: '1.3.3',
  versionCode: 7,
  appName: 'A One Target',
  packageName: 'com.aonetarget.education',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.aonetarget.education',
  marketUrl: 'market://details?id=com.aonetarget.education'
};

/**
 * Compares two semantic version strings (e.g. "1.3.3" vs "1.3.2").
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export const compareVersions = (v1: string, v2: string): number => {
  if (!v1 || !v2) return 0;
  const parts1 = v1.replace(/^v/i, '').split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = v2.replace(/^v/i, '').split('.').map(p => parseInt(p, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
};
