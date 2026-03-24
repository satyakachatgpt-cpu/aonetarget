import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

console.log('Testing Razorpay Keys...');
console.log('Key ID:', key_id);
console.log('Key Secret:', key_secret ? 'EXISTS (length ' + key_secret.length + ')' : 'MISSING');

const rzp = new Razorpay({ key_id, key_secret });

try {
  const orders = await rzp.orders.all({ count: 1 });
  console.log('SUCCESS: API Call worked. Keys are valid.');
} catch (err) {
  console.error('FAILURE: Razorpay API returned error:');
  console.error(err);
}
