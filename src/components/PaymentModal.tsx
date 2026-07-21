import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { client } from '../api/client';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  amount: number;
  currency?: string;
  reportId: string;
  onDiscountApplied?: (discountedAmount: number, discountCode: string) => void;
}

const VALID_DISCOUNT_CODES: Record<string, { type: 'percent' | 'fixed'; value: number; label: string }> = {
  'WELCOME20': { type: 'percent', value: 20, label: '20% Off' },
  'LAUNCH50': { type: 'fixed', value: 50, label: 'AED 50 Off' },
  'MEINSPECT10': { type: 'percent', value: 10, label: '10% Off' },
  'INSPECTOR': { type: 'fixed', value: 100, label: 'AED 100 Off' },
  'FREE_REPORT': { type: 'percent', value: 100, label: '100% Off — Free Report' },
};

type PaymentMethod = 'card' | 'apple_pay' | 'google_pay' | 'samsung_pay';
type PaymentStep = 'select' | 'processing' | 'success' | 'failed';

export default function PaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  amount,
  currency = 'AED',
  reportId,
  onDiscountApplied,
}: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('select');
  const [processingMsg, setProcessingMsg] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; discount: number; finalAmount: number; label: string } | null>(null);
  const [discountError, setDiscountError] = useState('');

  const finalAmount = appliedDiscount ? appliedDiscount.finalAmount : amount;

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setDiscountCode('');
      setAppliedDiscount(null);
      setDiscountError('');
    }
  }, [isOpen]);

  const handleApplyDiscount = () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) { setDiscountError('Enter a discount code'); return; }
    const offer = VALID_DISCOUNT_CODES[code];
    if (!offer) { setDiscountError('Invalid discount code'); return; }
    const discount = offer.type === 'percent' ? Math.round(amount * offer.value / 100) : offer.value;
    const final = Math.max(0, amount - discount);
    const applied = { code, discount: amount - final, finalAmount: final, label: offer.label };
    setAppliedDiscount(applied);
    setDiscountError('');
    if (onDiscountApplied) onDiscountApplied(final, code);
  };

  const simulatePayment = useCallback(async (_method: PaymentMethod) => {
    setStep('processing');
    setProcessingMsg('Connecting to payment gateway...');

    // Call backend checkout
    try {
      const res = await client.api.fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          currency: 'AED',
          inspectionId: reportId,
          discountCode: appliedDiscount?.code,
          discountAmount: appliedDiscount?.discount || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.url) {
          // Redirect to Stripe Checkout immediately
          window.location.href = data.url;
          return;
        }
        
        // Fallback for tester/dummy flow
        setProcessingMsg('Finalizing...');
        await new Promise(r => setTimeout(r, 800));
        setStep('success');
        await new Promise(r => setTimeout(r, 1200));
        onPaymentSuccess();
        onClose();
      } else {
        setStep('failed');
      }
    } catch (e) {
      console.error('Payment error:', e);
      setStep('failed');
    }
  }, [finalAmount, reportId, appliedDiscount, onPaymentSuccess, onClose]);

  const handleMethodSelect = (method: PaymentMethod) => {
    simulatePayment(method);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step !== 'processing' ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-6 pt-6 pb-8">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />

              <div className="relative z-10">
                {/* Close button */}
                {step !== 'processing' && (
                  <button
                    aria-label="Close payment modal"
                    onClick={onClose}
                    className="absolute -top-1 -right-1 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-white/60 text-xs font-medium tracking-wider uppercase">Secure Payment</span>
                </div>

                <h2 className="text-white text-xl font-bold tracking-tight">
                  {step === 'select' && 'Pay for Report'}
                  {step === 'processing' && 'Processing...'}
                  {step === 'success' && 'Payment Complete'}
                  {step === 'failed' && 'Payment Failed'}
                </h2>

                <div className="mt-3 flex items-baseline gap-1">
                  {appliedDiscount ? (
                    <>
                      <span className="text-lg text-white/40 line-through">{currency} {amount.toLocaleString()}</span>
                      <span className="text-3xl font-extrabold text-emerald-400 tracking-tight ml-2">{currency}</span>
                      <span className="text-4xl font-extrabold text-emerald-400 tracking-tight ml-1">{finalAmount.toLocaleString()}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-white tracking-tight">{currency}</span>
                      <span className="text-4xl font-extrabold text-white tracking-tight ml-1">{amount.toLocaleString()}</span>
                    </>
                  )}
                </div>
                <p className="text-white/50 text-xs mt-1">Report ID: RPT-{reportId.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <AnimatePresence mode="wait">
                {/* Step: Select Payment Method */}
                {step === 'select' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <p className="text-sm text-slate-500 text-center mb-4">
                      You will be redirected to Stripe to complete your payment securely.
                    </p>
                    
                    <button
                      onClick={() => handleMethodSelect('card')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <span className="font-bold text-slate-700">Credit or Debit Card</span>
                      </div>
                      <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          value={discountCode}
                          onChange={e => setDiscountCode(e.target.value)}
                          placeholder="Discount Code"
                          className="flex-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm outline-none focus:border-blue-300 transition-all"
                        />
                        <button
                          onClick={handleApplyDiscount}
                          className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
                        >
                          Apply
                        </button>
                      </div>
                      {discountError && <p className="text-xs text-red-500 ml-1">{discountError}</p>}
                      {appliedDiscount && (
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs text-emerald-600 font-medium">✓ {appliedDiscount.label} applied</span>
                          <button onClick={() => setAppliedDiscount(null)} className="text-[10px] text-slate-400 hover:text-slate-600 underline">Remove</button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step: Processing */}
                {step === 'processing' && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center"
                  >
                    <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
                    <p className="text-slate-600 font-medium">{processingMsg}</p>
                    <p className="text-xs text-slate-400 mt-2">Please do not close this window</p>
                  </motion.div>
                )}

                {/* Step: Success */}
                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-8 text-center"
                  >
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Successful</h3>
                    <p className="text-slate-500 text-sm">Your report is now available for download.</p>
                  </motion.div>
                )}

                {/* Step: Failed */}
                {step === 'failed' && (
                  <motion.div
                    key="failed"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-8 text-center"
                  >
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Failed</h3>
                    <p className="text-slate-500 text-sm mb-6">We couldn't process your payment. Please try again.</p>
                    <button
                      onClick={() => setStep('select')}
                      className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5 opacity-40 grayscale">
                <span className="text-[10px] font-bold tracking-tighter uppercase">Powered by</span>
                <span className="text-xs font-black tracking-tighter uppercase">Stripe</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
