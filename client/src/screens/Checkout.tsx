import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Course {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  thumbnail?: string;
  price?: number;
  mrp?: number;
  category?: string;
  instructor?: string;
}

const Checkout: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const legalContent = {
    terms: {
      title: 'Terms & Conditions',
      content: `Welcome to Aone Target Institute. By enrolling in our courses, you agree to:
      1. Course Access: Access is limited to the registered student and is non-transferable.
      2. Content Usage: All study materials, videos, and tests are intellectual property of Aone Target. Recording or sharing content is strictly prohibited.
      3. Account Security: You are responsible for maintaining the confidentiality of your login credentials.
      4. Termination: We reserve the right to terminate access for any violation of these terms without refund.`
    },
    privacy: {
      title: 'Privacy Policy',
      content: `Your privacy is important to us. We collect and use your data as follows:
      1. Personal Information: We collect your name, phone, and email for account management and communication.
      2. Payment Data: All payments are processed through secure third-party gateways (Razorpay). We do not store your card details.
      3. Data Usage: Your data is used to provide course updates, performance reports, and personalized recommendations.
      4. Data Protection: We implement industry-standard security measures to protect your information.`
    }
  };

  const getStudentData = () => {
    try {
      const data = localStorage.getItem('studentData');
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  };

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const res = await fetch(`/api/courses/${id}`);
        if (res.ok) {
          const data = await res.json();
          setCourse(data);
        }
      } catch (error) {
        console.error('Failed to load course:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCourse();
  }, [id]);

  const handleRazorpayPayment = async () => {
    const student = getStudentData();
    if (!student) {
      alert('Please login first');
      navigate('/student-login');
      return;
    }

    if (!agreed) {
      alert('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setProcessing(true);
    try {
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course?.id || id,
          studentId: student.id
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Aone Target Institute',
        description: course?.name || course?.title || 'Course Purchase',
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId: course?.id || id,
                studentId: student.id,
                referralCode: referralCode || undefined
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              navigate('/purchase-success', { state: { course, purchase: verifyData.purchase } });
            } else {
              alert('Payment verification failed. Please contact support.');
              setProcessing(false);
            }
          } catch (error) {
            console.error('Verification error:', error);
            alert('Payment verification failed. Please contact support.');
            setProcessing(false);
          }
        },
        prefill: {
          name: student.name || '',
          email: student.email || '',
          contact: student.phone || ''
        },
        theme: {
          color: '#1A237E'
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        alert(`Payment failed: ${response.error.description}`);
        setProcessing(false);
      });
      razorpay.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  const handleFreePurchase = async () => {
    const student = getStudentData();
    if (!student) {
      alert('Please login first');
      navigate('/student-login');
      return;
    }

    if (!agreed) {
      alert('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          courseId: course?.id || id,
          amount: 0,
          paymentMethod: 'free',
          referralCode: referralCode || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        navigate('/purchase-success', { state: { course, purchase: data.purchase } });
      } else {
        alert(data.error || 'Enrollment failed. Please try again.');
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Enrollment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <span className="material-symbols-rounded text-5xl text-gray-300">error</span>
          <p className="text-gray-500 mt-3">Course not found</p>
          <button onClick={() => navigate(-1)} className="mt-3 text-[#303F9F] font-bold">Go Back</button>
        </div>
      </div>
    );
  }

  const courseName = course.name || course.title || 'Course';
  const coursePrice = course.price || 0;
  const courseMrp = course.mrp || coursePrice;
  const discount = courseMrp > coursePrice ? courseMrp - coursePrice : 0;

  return (
    <div className="bg-gray-50 min-h-screen pb-6">
      <header className="bg-[#1A237E] text-white sticky top-0 z-50 shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-base font-bold flex-1 text-center">Order Summary</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Course Details</p>
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#303F9F] to-[#1A237E] flex items-center justify-center">
              {(course.imageUrl || course.thumbnail) ? (
                <img src={course.imageUrl || course.thumbnail} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <span className="text-white text-2xl font-bold opacity-60">{courseName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm leading-tight text-gray-800">{courseName}</h3>
              {course.instructor && <p className="text-xs text-gray-400 mt-1">{course.instructor}</p>}
              <div className="flex items-center text-[10px] text-gray-400 gap-3 mt-2">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-rounded text-xs">schedule</span> Lifetime Access
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-rounded text-xs">language</span> Hinglish
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold flex items-center gap-2 mb-3">
            <span className="material-symbols-rounded text-[#D32F2F]">local_offer</span>
            Referral Code
          </h2>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#303F9F]/10 font-bold"
              placeholder="Enter referral code (optional)"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold mb-4">Payment Summary</h2>
          <div className="space-y-3 text-sm">
            {courseMrp > coursePrice && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Course Price (MRP)</span>
                  <span className="text-gray-500">₹{courseMrp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Discount</span>
                  <span className="text-green-600 font-bold">- ₹{discount}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Taxes (GST)</span>
              <span className="text-gray-500">Included</span>
            </div>
            <div className="h-px bg-gray-100 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800">Total Amount</span>
              <span className="font-black text-xl text-[#1A237E]">
                {coursePrice > 0 ? `₹${coursePrice}` : 'FREE'}
              </span>
            </div>
          </div>
        </div>

        {coursePrice > 0 && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
            <span className="material-symbols-rounded text-blue-600">verified_user</span>
            <div>
              <p className="text-xs font-bold text-blue-800">Secure Payment via Razorpay</p>
              <p className="text-[10px] text-blue-600">UPI, Cards, Net Banking, Wallets supported</p>
            </div>
          </div>
        )}

        {/* Payment Action Card */}
        <div className="bg-white p-6 rounded-3xl shadow-premium border border-gray-100 flex flex-col gap-5 mt-4 animate-fade-in-up">
          <div className="flex justify-between items-center border-b border-gray-50 pb-4">
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Payable</span>
              <p className="text-3xl font-[900] text-[#1A237E] tracking-tight">
                {coursePrice > 0 ? `₹${coursePrice}` : 'FREE'}
              </p>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                  <span className="material-symbols-rounded text-[14px] text-green-600">verified_user</span>
                  <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">Secure Pay</span>
                </div>
                <span className="text-[8px] text-gray-400 mt-1 uppercase tracking-widest leading-none">Verified Transaction</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-2 cursor-pointer transition-all active:scale-[0.99]" onClick={() => setAgreed(!agreed)}>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${agreed ? 'bg-[#1A237E] border-[#1A237E]' : 'border-gray-300 bg-white'}`}>
              {agreed && <span className="material-symbols-rounded text-white text-sm">check</span>}
            </div>
            <p className="text-[11px] text-gray-600 leading-snug">
              I have read and agree to the{' '}
              <span
                className="text-[#1A237E] font-bold underline cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setLegalModal('terms'); }}
              >
                Terms & Conditions
              </span>{' '}
              and{' '}
              <span
                className="text-[#1A237E] font-bold underline cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setLegalModal('privacy'); }}
              >
                Privacy Policy
              </span>.
            </p>
          </div>

          {coursePrice > 0 ? (
            <button
              onClick={handleRazorpayPayment}
              disabled={processing}
              className={`w-full font-black py-5 px-6 rounded-2xl text-lg shadow-lg flex items-center justify-center gap-3 active:scale-[0.97] transition-all group ${!agreed ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1A237E] text-white hover:bg-[#283593]'}`}
            >
              {processing ? (
                <>
                  <span className="animate-spin material-symbols-rounded text-lg">progress_activity</span>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Pay ₹{coursePrice}</span>
                  <span className="material-symbols-rounded group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleFreePurchase}
              disabled={processing}
              className={`w-full font-bold py-5 px-6 rounded-2xl text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform ${!agreed ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {processing ? 'Enrolling...' : 'Enroll for Free'}
              <span className="material-symbols-rounded">check_circle</span>
            </button>
          )}

          <p className="text-[10px] text-center text-gray-400 px-4 leading-relaxed">
            By confirming, you agree to our{' '}
            <span className="underline italic cursor-pointer" onClick={() => setLegalModal('terms')}>Terms of Service</span>,{' '}
            <span className="underline italic">Refund Policy</span> and{' '}
            <span className="underline italic cursor-pointer" onClick={() => setLegalModal('privacy')}>Privacy Policy</span>.
          </p>
        </div>
      </main>

      {legalModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl animate-slide-in-up sm:animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#1A237E] text-white">
              <h3 className="font-black uppercase tracking-widest text-sm">{legalContent[legalModal].title}</h3>
              <button
                onClick={() => setLegalModal(null)}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                {legalContent[legalModal].content.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-gray-600 leading-relaxed font-medium">
                    {line.trim()}
                  </p>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-black text-center tracking-widest">Aone Target Institute Pvt. Ltd.</p>
              </div>
            </div>
            <div className="p-6 bg-gray-50">
              <button
                onClick={() => setLegalModal(null)}
                className="w-full bg-[#1A237E] text-white font-black py-4 rounded-2xl text-sm shadow-xl active:scale-95 transition-all"
              >
                I UNDERSTAND
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
