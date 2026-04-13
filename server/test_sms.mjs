// Quick SMS test — run with: node test_sms.mjs
import https from 'https';
import http from 'http';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
const httpAgent = new http.Agent({ keepAlive: true });

// ← APNA PHONE NUMBER DAALO (test ke liye)
const TEST_PHONE = '9999999999'; // <-- yahan apna number daalo

const params = new URLSearchParams({
  user: process.env.PRIMCLICK_USERNAME || process.env.PRIMCLICK_API_KEY,
  password: process.env.PRIMCLICK_PASSWORD,
  senderid: process.env.DLT_HEADER,
  channel: 'Implicit',
  DCS: '0',
  flashsms: '0',
  number: '91' + TEST_PHONE,
  text: `Your OTP for AoneTarget is 123456. Valid for 10 minutes. Do not share with anyone.`,
  DLTTemplateId: process.env.DLT_OTP_TEMPLATE_ID,
  PEID: process.env.DLT_ENTITY_ID,
});

console.log('\n🔍 ENV CHECK:');
console.log('  API KEY :', process.env.PRIMCLICK_API_KEY ? '✅ Set' : '❌ MISSING');
console.log('  PASSWORD:', process.env.PRIMCLICK_PASSWORD ? '✅ Set' : '❌ MISSING');
console.log('  SENDER  :', process.env.DLT_HEADER);
console.log('  PEID    :', process.env.DLT_ENTITY_ID);
console.log('  TEMPLATE:', process.env.DLT_OTP_TEMPLATE_ID);
console.log('  PHONE   :', '91' + TEST_PHONE);

// ── Try HTTP first (PrimeClick docs use http://) ──────────────────────────────
const HTTP_URL = 'http://sms.primeclick.in/api/mt/SendSMS?' + params.toString();
const HTTPS_URL = 'https://sms.primeclick.in/api/mt/SendSMS?' + params.toString();

async function tryURL(label, url, agent) {
  console.log(`\n📤 Trying ${label}: ${url.split('?')[0]}`);
  try {
    const res = await axios.get(url, { [label === 'HTTP' ? 'httpAgent' : 'httpsAgent']: agent, timeout: 15000 });
    console.log(`✅ ${label} Response:`, res.data);
    if (res.data?.ErrorCode === '000') {
      console.log(`\n🎉 ${label} — SMS SENT SUCCESSFULLY!`);
    } else {
      console.log(`\n❌ ${label} — API error: Code=${res.data?.ErrorCode}, Msg=${res.data?.ErrorMessage}`);
      console.log('💡 Error codes: 002=Bad credentials, 007=Bad number, 025=Template mismatch, 028=PEID mismatch');
    }
    return true;
  } catch (err) {
    console.error(`❌ ${label} failed: ${err.code} - ${err.message}`);
    return false;
  }
}

// Test HTTP first
const httpOk = await tryURL('HTTP', HTTP_URL, httpAgent);

// If HTTP failed, try HTTPS
if (!httpOk) {
  await tryURL('HTTPS', HTTPS_URL, httpsAgent);
}
