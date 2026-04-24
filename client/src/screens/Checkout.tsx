import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getImageUrl } from '../lib/utils';
import { getAuthHeaders } from '../services/apiClient';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CourseSettings {
  gstIncluded?: boolean;
  gstPercentage?: number;
  finalPrice?: number;
  disableInvoice?: boolean;
  disableCoupon?: boolean;
}

interface Course {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  thumbnail?: string;
  price?: number;
  mrp?: number;
  category?: string;
  instructor?: string;
  settings?: CourseSettings;
  content?: {
    upsell?: {
      enabled?: boolean;
      courses?: string | string[];
    };
  };
}

interface PriceBreakdown {
  basePrice: number;
  gstPercentage: number;
  gstAmount: number;
  discountAmount: number;
  totalAmount: number;
  couponCode?: string;
}

const safeParse = (val: any, fallback = 0): number => {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
};

const calcBreakdown = (course: Course, coupon: any = null): PriceBreakdown => {
  const basePrice = safeParse(course.price, 0);
  const gstIncluded = course.settings?.gstIncluded === true;
  const gstPercentage = safeParse(course.settings?.gstPercentage, 0);
  const gstAmount = gstIncluded && gstPercentage > 0 ? (basePrice * gstPercentage) / 100 : 0;

  let discountAmount = 0;
  if (coupon && coupon.status === 'active') {
    const minPurchase = safeParse(coupon.minPurchase, 0);
    if (basePrice >= minPurchase) {
      const isPercent = coupon.discountType === 'percentage' || coupon.type === 'percentage';
      const val = safeParse(coupon.discountValue ?? coupon.value, 0);
      if (isPercent) {
        discountAmount = (basePrice * val) / 100;
        const maxDisc = safeParse(coupon.maxDiscount, 0);
        if (maxDisc > 0 && discountAmount > maxDisc) discountAmount = maxDisc;
      } else {
        discountAmount = val;
      }
    }
  }

  const totalAmount = Math.max(0, basePrice + gstAmount - discountAmount);
  return { basePrice, gstPercentage, gstAmount, discountAmount, totalAmount, couponCode: coupon?.code };
};

const Checkout: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [upsellData, setUpsellData] = useState<Course[]>([]);
  const [availableCoins, setAvailableCoins] = useState(0);
  const [coinsToUse, setCoinsToUse] = useState(0);
  const [useCoins, setUseCoins] = useState(false);

  const legalContent = {
    terms: {
      title: 'Terms & Conditions',
      content: `Welcome to Aone Target Institute. By enrolling in our courses, you agree to:\n1. Course Access: Access is limited to the registered student and is non-transferable.\n2. Content Usage: All study materials, videos, and tests are intellectual property of Aone Target. Recording or sharing content is strictly prohibited.\n3. Account Security: You are responsible for maintaining the confidentiality of your login credentials.\n4. Termination: We reserve the right to terminate access for any violation of these terms without refund.`
    },
    privacy: {
      title: 'Privacy Policy',
      content: `Your privacy is important to us. We collect and use your data as follows:\n1. Personal Information: We collect your name, phone, and email for account management and communication.\n2. Payment Data: All payments are processed through secure third-party gateways (Razorpay). We do not store your card details.\n3. Data Usage: Your data is used to provide course updates, performance reports, and personalized recommendations.\n4. Data Protection: We implement industry-standard security measures to protect your information.`
    }
  };

  const getStudentData = () => {
    try {
      const data = localStorage.getItem('studentData');
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  };

  const getResolvedStudentId = (student: any) => {
    if (!student) return null;
    return student.id || student._id || student.userId;
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

    const fetchCoins = async () => {
      const student = getStudentData();
      const resolvedId = getResolvedStudentId(student);
      if (!resolvedId) {
        console.warn('[CHECKOUT] Missing student identifier for coin fetch');
        return;
      }
      try {
        const res = await fetch(`/api/referrals/${resolvedId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        // Backend returns availableCoins as source of truth
        setAvailableCoins(data.availableCoins || data.coins || 0);
      } catch (e) {
        console.error('[CHECKOUT] Failed to fetch coins:', e);
      }
    };
    fetchCoins();
  }, [id]);

  // Set initial breakdown whenever course changes
  useEffect(() => {
    if (course) {
      setBreakdown(calcBreakdown(course));
    }
  }, [course]);

  // Load upsell courses
  useEffect(() => {
    if (!course?.content?.upsell?.enabled) return;
    const upsellCourses = course.content.upsell.courses;
    if (!upsellCourses) return;
    // Handle both string and array
    const courseList = Array.isArray(upsellCourses)
      ? upsellCourses
      : [String(upsellCourses)];
    if (courseList.length === 0) return;

    const fetchUpsell = async () => {
      try {
        const res = await fetch('/api/courses');
        if (res.ok) {
          const allData = await res.json();
          const allCourses: Course[] = Array.isArray(allData) ? allData : (allData.courses || []);
          const courseIdStr = String(course.id || course._id || '');
          const recommended = allCourses.filter((c: Course) => {
            const cTitle = String(c.title || c.name || '');
            const cId = String(c.id || c._id || '');
            return courseList.some(uc => String(uc).trim() === cTitle.trim()) && cId !== courseIdStr;
          });
          setUpsellData(recommended.slice(0, 3));
        }
      } catch (e) { /* ignore */ }
    };
    fetchUpsell();
  }, [course]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !course) return;
    if (course.settings?.disableCoupon) {
      setCouponError('Coupons are not applicable for this batch');
      return;
    }
    setIsApplyingCoupon(true);
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code: couponCode, courseId: course.id || course._id || id })
      });
      const data = await res.json();
      if (data.success) {
        setBreakdown({
          basePrice: safeParse(data.basePrice),
          gstPercentage: safeParse(data.gstPercentage),
          gstAmount: safeParse(data.gstAmount),
          discountAmount: safeParse(data.discountAmount),
          totalAmount: safeParse(data.totalAmount),
          couponCode: data.couponCode
        });
      } else {
        setCouponError(data.error || 'Invalid or expired coupon code');
      }
    } catch {
      setCouponError('Failed to validate coupon. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    if (course) setBreakdown(calcBreakdown(course));
    setCouponCode('');
    setCouponError('');
  };

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
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          courseId: course?.id || course?._id || id,
          studentId: getResolvedStudentId(student),
          couponCode: breakdown?.couponCode || undefined,
          coinsUsed: useCoins ? coinsToUse : 0
        })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

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
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId: course?.id || course?._id || id,
                studentId: getResolvedStudentId(student),
                referralCode: referralCode || undefined,
                couponCode: breakdown?.couponCode || undefined,
                coinsUsed: useCoins ? coinsToUse : 0
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              navigate('/purchase-success', { state: { course, purchase: verifyData.purchase } });
            } else {
              alert('Payment verification failed. Please contact support.');
              setProcessing(false);
            }
          } catch {
            alert('Payment verification failed. Please contact support.');
            setProcessing(false);
          }
        },
        prefill: {
          name: student.name || '',
          email: student.email || '',
          contact: student.phone || ''
        },
        theme: { color: '#1A237E' },
        modal: { ondismiss: () => setProcessing(false) },
        config: {
          display: {
            sequence: ['block.upi', 'card', 'netbanking', 'wallet'],
            preferences: { show_default_blocks: true }
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: any) => {
        alert(`Payment failed: ${response.error?.description || 'Please try again'}`);
        setProcessing(false);
      });
      razorpay.open();
    } catch (error: any) {
      alert(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  const handleFreePurchase = async () => {
    const student = getStudentData();
    if (!student) { navigate('/student-login'); return; }
    if (!agreed) {
      alert('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          studentId: getResolvedStudentId(student),
          courseId: course?.id || course?._id || id,
          amount: 0,
          paymentMethod: 'free',
          referralCode: referralCode || undefined,
          coinsUsed: useCoins ? coinsToUse : 0
        })
      });
      const data = await res.json();
      if (data.success) {
        navigate('/purchase-success', { state: { course, purchase: data.purchase } });
      } else {
        alert(data.error || 'Enrollment failed. Please try again.');
      }
    } catch {
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
  const basePrice = breakdown?.basePrice ?? safeParse(course.price, 0);
  const gstPercentage = breakdown?.gstPercentage ?? 0;
  const gstAmount = breakdown?.gstAmount ?? 0;
  const discountAmount = breakdown?.discountAmount ?? 0;
  const mrp = safeParse(course.mrp, 0);
  const mrpDiscount = mrp > basePrice ? mrp - basePrice : 0;
  
  const coinDiscount = useCoins ? (coinsToUse / 10) : 0;
  const totalAmount = Math.max(0, (breakdown?.totalAmount ?? basePrice) - coinDiscount);
  const isFree = totalAmount <= 0;

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
        {/* Course Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Batch Details</p>
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#303F9F] to-[#1A237E] flex items-center justify-center">
              {(course.imageUrl || course.thumbnail) ? (
                <img
                  src={getImageUrl(course.imageUrl || course.thumbnail)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <span className="text-white text-2xl font-bold opacity-60">{courseName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm leading-tight text-gray-800 line-clamp-2">{courseName}</h3>
              {course.instructor && <p className="text-xs text-gray-400 mt-1">{course.instructor}</p>}
              <div className="flex flex-wrap items-center text-[10px] text-gray-400 gap-3 mt-2">
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

        {/* Coupon Code */}
        {!course.settings?.disableCoupon && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-3">
              <span className="material-symbols-rounded text-[#303F9F]">confirmation_number</span>
              Coupon Code
            </h2>
            {breakdown?.couponCode ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-green-600 text-base">check_circle</span>
                  <div>
                    <p className="text-xs font-black text-green-700">{breakdown.couponCode}</p>
                    <p className="text-[10px] text-green-600">You save ₹{discountAmount.toFixed(2)}</p>
                  </div>
                </div>
                <button onClick={handleRemoveCoupon} className="text-red-400 text-[10px] font-bold underline">Remove</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    className={`flex-1 bg-gray-50 border ${couponError ? 'border-red-300' : 'border-gray-200'} rounded-xl text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#303F9F]/10 font-bold uppercase`}
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (couponError) setCouponError(''); }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponCode.trim()}
                    className="bg-[#1A237E] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {isApplyingCoupon ? '...' : 'Apply'}
                  </button>
                </div>
                {couponError && <p className="text-[10px] text-red-500 mt-2 ml-1 font-bold">{couponError}</p>}
              </>
            )}
          </div>
        )}

        {/* Coin Redemption */}
        {availableCoins > 0 && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-rounded text-amber-500">monetization_on</span>
                Redeem Coins
              </h2>
              <div 
                className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${useCoins ? 'bg-green-500' : 'bg-gray-200'}`}
                onClick={() => {
                  if (!useCoins) {
                    // Safe calculation based on current totalAmount
                    const currentTotal = breakdown?.totalAmount ?? basePrice;
                    const maxCoinsUsable = Math.floor(currentTotal * 10);
                    setCoinsToUse(Math.min(availableCoins, maxCoinsUsable));
                  }
                  setUseCoins(!useCoins);
                }}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useCoins ? 'right-1' : 'left-1'}`}></div>
              </div>
            </div>
            
            {useCoins ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Using Coins</p>
                    <p className="text-sm font-black text-amber-900">{coinsToUse} Coins = ₹{(coinsToUse/10).toFixed(2)} Off</p>
                  </div>
                  <button 
                    onClick={() => setUseCoins(false)}
                    className="text-amber-700 text-[10px] font-bold underline"
                  >
                    Change
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">Available: {availableCoins} coins</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">You have {availableCoins} coins available. Use them to get a discount!</p>
            )}
          </div>
        )}



        {/* Upsell */}
        {upsellData.length > 0 && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
              <span className="material-symbols-rounded text-indigo-600">recommend</span>
              Recommended for you
            </h2>
            <div className="space-y-3">
              {upsellData.map((up) => (
                <div
                  key={String(up.id || up._id)}
                  className="flex items-center gap-3 p-2 border border-gray-50 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                  onClick={() => navigate(`/course/${up.id || up._id}`)}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0">
                    {(up.thumbnail || up.imageUrl) ? (
                      <img src={getImageUrl(up.thumbnail || up.imageUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-indigo-600 font-bold text-xs">{(up.title || up.name || 'C').charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-800 line-clamp-1">{up.title || up.name}</p>
                    <p className="text-[10px] text-green-600 font-black">₹{safeParse(up.price)}</p>
                  </div>
                  <span className="material-symbols-rounded text-gray-300 text-sm">chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold mb-4">Payment Summary</h2>
          <div className="space-y-3 text-sm">

            <div className="flex justify-between">
              <span className="text-gray-400">Batch Price</span>
              <span className="text-gray-700 font-bold">₹{basePrice.toFixed(2)}</span>
            </div>

            {mrpDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">MRP</span>
                <span className="text-gray-400 line-through">₹{mrp.toFixed(2)}</span>
              </div>
            )}

            {gstAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">GST ({gstPercentage}%)</span>
                <span className="text-gray-600 font-bold">+ ₹{gstAmount.toFixed(2)}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-green-600 font-bold">Coupon Discount ({breakdown?.couponCode})</span>
                <span className="text-green-600 font-black">- ₹{discountAmount.toFixed(2)}</span>
              </div>
            )}

            {useCoins && coinsToUse > 0 && (
              <div className="flex justify-between">
                <span className="text-amber-600 font-bold">Coins Redeemed ({coinsToUse} coins)</span>
                <span className="text-amber-600 font-black">- ₹{(coinsToUse/10).toFixed(2)}</span>
              </div>
            )}

            {mrpDiscount > 0 && discountAmount === 0 && (
              <div className="flex justify-between">
                <span className="text-green-600">Instant Discount</span>
                <span className="text-green-600 font-bold">- ₹{mrpDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="h-px bg-gray-100 my-1"></div>

            <div className="flex justify-between items-center">
              <span className="font-black text-gray-800">Total Payable</span>
              <span className="font-black text-xl text-[#1A237E]">
                {isFree ? 'FREE' : `₹${totalAmount.toFixed(2)}`}
              </span>
            </div>

            {gstAmount > 0 && (
              <p className="text-[9px] text-gray-400 text-right">*Inclusive of GST</p>
            )}
          </div>
        </div>

        {/* Secure payment badge */}
        {!isFree && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
            <span className="material-symbols-rounded text-blue-600">verified_user</span>
            <div>
              <p className="text-xs font-bold text-blue-800">Secure Payment via Razorpay</p>
              <p className="text-[10px] text-blue-600">UPI, Cards, Net Banking, Wallets supported</p>
            </div>
          </div>
        )}

        {/* CTA Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg flex flex-col gap-5 mt-2">
          <div className="flex justify-between items-center border-b border-gray-50 pb-4">
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Payable</span>
              <p className="text-3xl font-[900] text-[#1A237E] tracking-tight">
                {isFree ? 'FREE' : `₹${totalAmount.toFixed(2)}`}
              </p>
              {gstAmount > 0 && (
                <p className="text-[9px] text-gray-400 mt-0.5">Base ₹{basePrice} + GST ₹{gstAmount.toFixed(2)}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                <span className="material-symbols-rounded text-[14px] text-green-600">verified_user</span>
                <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">Secure Pay</span>
              </div>
              <span className="text-[8px] text-gray-400 uppercase tracking-widest leading-none">Verified Transaction</span>
            </div>
          </div>

          {/* Terms agree checkbox */}
          <div
            className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer transition-all active:scale-[0.99]"
            onClick={() => setAgreed(!agreed)}
          >
            <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${agreed ? 'bg-[#1A237E] border-[#1A237E]' : 'border-gray-300 bg-white'}`}>
              {agreed && <span className="material-symbols-rounded text-white text-sm">check</span>}
            </div>
            <p className="text-[11px] text-gray-600 leading-snug">
              I have read and agree to the{' '}
              <span
                className="text-[#1A237E] font-bold underline cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setLegalModal('terms'); }}
              >Terms & Conditions</span>{' '}and{' '}
              <span
                className="text-[#1A237E] font-bold underline cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setLegalModal('privacy'); }}
              >Privacy Policy</span>.
            </p>
          </div>

          {/* Pay button */}
          {!isFree ? (
            <button
              onClick={handleRazorpayPayment}
              disabled={processing}
              className={`w-full font-black py-5 px-6 rounded-2xl text-lg shadow-lg flex items-center justify-center gap-3 active:scale-[0.97] transition-all group ${!agreed ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#1A237E] text-white hover:bg-[#283593]'}`}
            >
              {processing ? (
                <>
                  <span className="animate-spin material-symbols-rounded text-lg">progress_activity</span>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-xl">lock</span>
                  <span>Pay ₹{totalAmount.toFixed(2)}</span>
                  <span className="material-symbols-rounded group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleFreePurchase}
              disabled={processing}
              className={`w-full font-bold py-5 px-6 rounded-2xl text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform ${!agreed ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
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

      {/* Legal Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl">
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
              <div className="space-y-4">
                {legalContent[legalModal].content.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-gray-600 leading-relaxed font-medium">{line.trim()}</p>
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
