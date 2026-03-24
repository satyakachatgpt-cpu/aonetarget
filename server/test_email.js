import dotenv from 'dotenv';
dotenv.config();
import { sendEmail, templates } from './utils/email.js';

async function test() {
  console.log('Testing email service...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '********' : 'MISSING');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Missing credentials in .env');
    return;
  }

  const result = await sendEmail({
    to: process.env.EMAIL_USER,
    subject: 'Aone Target - Email Test',
    html: '<h1>Email Service is working!</h1>'
  });

  if (result) {
    console.log('Test email sent successfully!');
  } else {
    console.log('Test email failed to send.');
  }
}

test();
