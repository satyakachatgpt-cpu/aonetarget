import http from 'http';
import axios from 'axios';

// PrimeClick ONLY works on HTTP — their HTTPS drops connections (ECONNRESET)
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 3000,
});

const smsClient = axios.create({
  httpAgent,
  timeout: 15000,
  headers: {
    'Connection': 'keep-alive',
    'User-Agent': 'AoneTarget-SMS/1.0',
  },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendSMS = async (phone, message, templateId) => {
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
    try {
      console.log(`[SMS] Attempt ${attempt}/${MAX_RETRIES} → phone: ${phone}`);
      console.log('[SMS] Message being sent:', message);
      console.log('[SMS] Template ID being used:', templateId);
      
      const response = await smsClient.get(url);
      const data = response.data;
      console.log('[SMS] PrimeClick response:', data);

      if (data?.ErrorCode === '000') {
        console.log(`[SMS] ✅ Sent to ${phone}`);
        return { success: true };
      } else {
        console.error(`[SMS] ❌ API error: Code=${data?.ErrorCode}, Msg=${data?.ErrorMessage}`);
        return { success: false, error: data?.ErrorMessage || `ErrorCode: ${data?.ErrorCode}` };
      }
    } catch (error) {
      const isRetryable = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNABORTED'].includes(error.code);
      console.error(`[SMS] Attempt ${attempt} failed: ${error.code} - ${error.message}`);

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = attempt * 2000;
        console.log(`[SMS] Retrying in ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
};

export default sendSMS;
