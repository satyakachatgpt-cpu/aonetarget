import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const PurchaseSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { course, purchase } = (location.state as any) || {};

  const courseName = course?.name || course?.title || purchase?.courseName || 'Course';
  const courseId = course?.id || course?._id || '';

  const basePrice = parseFloat(purchase?.basePrice ?? purchase?.amount ?? 0);
  const gstAmount = parseFloat(purchase?.gstAmount ?? 0);
  const gstPercentage = parseFloat(purchase?.gstPercentage ?? 0);
  const discountAmount = parseFloat(purchase?.discountAmount ?? 0);
  const totalPaid = parseFloat(purchase?.amount ?? 0);
  const couponCode = purchase?.couponCode || '';

  const handleDownloadInvoice = () => {
    const invoiceDate = new Date(purchase?.createdAt || Date.now()).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - Aone Target Institute</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1A237E; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { font-size: 22px; font-weight: 900; letter-spacing: 2px; }
    .header p { font-size: 11px; opacity: 0.8; margin-top: 4px; }
    .invoice-badge { background: rgba(255,255,255,0.15); display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; margin-top: 8px; letter-spacing: 1px; font-weight: bold; }
    .body { border: 1px solid #E8EAF6; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed #ddd; }
    .meta-item label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
    .meta-item p { font-size: 13px; font-weight: bold; color: #1A237E; margin-top: 2px; }
    .course-name { font-size: 16px; font-weight: 900; color: #1A237E; margin-bottom: 20px; padding: 12px; background: #EEF2FF; border-radius: 8px; border-left: 4px solid #1A237E; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #F5F5F5; padding: 10px 12px; font-size: 11px; text-align: left; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #F0F0F0; }
    .total-row td { font-size: 15px; font-weight: 900; color: #1A237E; border-top: 2px solid #1A237E; border-bottom: none; }
    .discount-row td { color: #2E7D32; }
    .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px dashed #ddd; }
    .footer p { font-size: 10px; color: #999; }
    .stamp { display: inline-block; border: 3px solid #2E7D32; color: #2E7D32; padding: 8px 20px; border-radius: 4px; font-size: 22px; font-weight: 900; letter-spacing: 6px; transform: rotate(-12deg); margin: 12px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>AONE TARGET INSTITUTE</h1>
    <p>Educational Excellence | GST Invoice</p>
    <div class="invoice-badge">TAX INVOICE</div>
  </div>
  <div class="body">
    <div class="meta-grid">
      <div class="meta-item"><label>Invoice No.</label><p>${purchase?.id || 'ATC-' + Date.now()}</p></div>
      <div class="meta-item"><label>Invoice Date</label><p>${invoiceDate}</p></div>
      <div class="meta-item"><label>Payment ID</label><p>${purchase?.razorpayPaymentId || purchase?.id || 'N/A'}</p></div>
      <div class="meta-item"><label>Status</label><p style="color:#2E7D32">PAID ✓</p></div>
    </div>

    <div class="course-name">${courseName}</div>

    <table>
      <thead>
        <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
      </thead>
      <tbody>
        <tr><td>Batch / Course Fee</td><td style="text-align:right">₹${basePrice.toFixed(2)}</td></tr>
        ${gstAmount > 0 ? `<tr><td>GST @ ${gstPercentage}%</td><td style="text-align:right">₹${gstAmount.toFixed(2)}</td></tr>` : ''}
        ${discountAmount > 0 ? `<tr class="discount-row"><td>Coupon Discount${couponCode ? ' (' + couponCode + ')' : ''}</td><td style="text-align:right">- ₹${discountAmount.toFixed(2)}</td></tr>` : ''}
        <tr class="total-row"><td>Total Amount Paid</td><td style="text-align:right">₹${totalPaid.toFixed(2)}</td></tr>
      </tbody>
    </table>

    <div class="footer">
      <div class="stamp">PAID</div>
      <p>Thank you for choosing Aone Target Institute!</p>
      <p>This is a computer-generated invoice. No signature required.</p>
      <p style="margin-top:8px; font-weight:bold;">support@aonetarget.com</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AoneTarget_Invoice_${purchase?.id || Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Success Header */}
        <div className="bg-gradient-to-br from-[#1A237E] to-[#303F9F] p-8 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-white/30">
            <span className="material-symbols-rounded text-white text-4xl">check_circle</span>
          </div>
          <h1 className="text-xl font-black mb-1">Payment Successful!</h1>
          <p className="text-sm text-white/80">
            You're now enrolled in
          </p>
          <p className="text-sm font-bold text-white mt-1 line-clamp-2">{courseName}</p>
        </div>

        {/* Receipt / Invoice */}
        <div className="p-5">
          {purchase && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-5 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Receipt</span>
                <span className="text-[10px] bg-green-100 text-green-700 font-black px-2 py-0.5 rounded-full uppercase">Paid</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Order ID</span>
                  <span className="font-bold text-gray-600 text-[10px] font-mono truncate max-w-[55%] text-right">
                    {purchase.razorpayPaymentId || purchase.id}
                  </span>
                </div>

                <div className="border-t border-dashed border-gray-200 my-2"></div>

                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Batch Fee</span>
                  <span className="font-bold text-gray-700">₹{basePrice.toFixed(2)}</span>
                </div>

                {gstAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">GST ({gstPercentage}%)</span>
                    <span className="font-bold text-gray-700">+ ₹{gstAmount.toFixed(2)}</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600 font-bold">Coupon Discount</span>
                    <span className="font-black text-green-600">- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-gray-200 mt-2 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-gray-800 text-sm">Total Paid</span>
                    <span className="font-black text-[#1A237E] text-lg">₹{totalPaid.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {courseId && (
              <button
                onClick={() => navigate(`/course/${courseId}`)}
                className="w-full bg-[#1A237E] text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
              >
                <span className="material-symbols-rounded text-lg">play_circle</span>
                Start Learning Now
              </button>
            )}

            {purchase && !purchase.disableInvoice && (
              <button
                onClick={handleDownloadInvoice}
                className="w-full bg-indigo-50 border border-indigo-200 text-[#1A237E] py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <span className="material-symbols-rounded text-base">download</span>
                Download GST Invoice
              </button>
            )}

            <button
              onClick={() => navigate('/student-dashboard')}
              className="w-full bg-gray-100 text-gray-600 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <span className="material-symbols-rounded text-base">dashboard</span>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseSuccess;
