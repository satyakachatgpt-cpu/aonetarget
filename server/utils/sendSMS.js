import http from 'http';
import axios from 'axios';
import { performance } from 'perf_hooks';

// PrimeClick ONLY works on HTTP — their HTTPS drops connections (ECONNRESET)
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 3000,
});

const isProduction = process.env.NODE_ENV === 'production';

const smsClient = axios.create({
  httpAgent,
  timeout: 8000, // Reduced from 15s to 8s to fail faster if provider is slow
  headers: {
    'Connection': 'keep-alive',
    'User-Agent': 'AoneTarget-SMS/1.0',
  },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const maskPhone = (phone) => {
  if (!phone) return 'unknown';
  const str = String(phone);
  return str.length >= 10 ? `${str.slice(0, 2)}******${str.slice(-2)}` : '********';
};

const sendSMS = async (phone, message, templateId) => {
  const startTime = performance.now();
  const masked = maskPhone(phone);
  
  const url = 'http://sms.primeclick.in/api/mt/SendSMS?' +
    'user=' + process.env.PRIMCLICK_USERNAME +
    '&password=' + process.env.PRIMCLICK_PASSWORD +
    '&senderid=' + process.env.DLT_HEADER +
    '&channel=TRANS' +
    '&DCS=0' +
    '&flashsms=0' +
    '&number=91' + phone +
    '&text=' + encodeURIComponent(message) +
    '&route=15' +
    '&DLTTemplateId=' + templateId +
    '&PEID=' + process.env.DLT_ENTITY_ID;

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const attemptStart = performance.now();
    try {
      if (!isProduction) {
        console.log(`[SMS] Attempt ${attempt}/${MAX_RETRIES} → phone: ${masked}`);
      }
      
      const response = await smsClient.get(url);
      const data = response.data;
      const duration = (performance.now() - attemptStart).toFixed(2);

      if (!isProduction) {
        console.log(`[SMS] PrimeClick response (${duration}ms):`, data);
      }

      if (data?.ErrorCode === '000') {
        const totalDuration = (performance.now() - startTime).toFixed(2);
        console.log(`[SMS] ✅ Provider (PrimeClick) accepted request for ${masked}. Operator delivery pending. (Total: ${totalDuration}ms)`);
        return { success: true, duration: totalDuration, providerResponse: data };
      } else {
        console.error(`[SMS] ❌ Provider (PrimeClick) rejected: Code=${data?.ErrorCode}, Msg=${data?.ErrorMessage}`);
        return { success: false, error: data?.ErrorMessage || `ErrorCode: ${data?.ErrorCode}`, providerResponse: data };
      }
    } catch (error) {
      const duration = (performance.now() - attemptStart).toFixed(2);
      const isRetryable = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNABORTED'].includes(error.code) || error.message.includes('timeout');
      
      console.error(`[SMS] Attempt ${attempt} failed (${duration}ms): ${error.code || 'TIMEOUT'} - ${error.message}`);

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = attempt * 1500; // Slightly reduced delay
        if (!isProduction) {
          console.log(`[SMS] Retrying in ${delay / 1000}s...`);
        }
        await sleep(delay);
        continue;
      }
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
};

export default sendSMS;
