import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useInspectionStore } from '../store/inspectionStore';
import { useAuthStore } from '../store/authStore';
import { client } from '../api/client';
import PaymentModal from '../components/PaymentModal';
import EmailReportModal from '../components/EmailReportModal';
import {
  identifyReport,
  hasPurchasedReport,
  purchaseReport,
  isRevenueCatPlatform,
} from '../utils/revenuecat';
import {
  formatDate,
  formatDateTime,
  generateReportHash,
  safeGoBack,
} from '../utils/helpers';
import {
  getPropertyTypeLabel,
  getConditionLabel,
  getConditionColor,
} from '../data/propertyTemplates';

// A4 Page dimensions at 96 DPI
const A4_WIDTH_PX = 794;
const A4_PAGE_HEIGHT = 1040;
const A4_CONTENT_HEIGHT = 960;

// ============================================
// Page Header — appears on every page
// ============================================
function PageHeader({ inspection, reportHash }: { inspection: any; reportHash: string }) {
  const shortHash = reportHash ? reportHash.slice(0, 16) : '—';
  return (
    <div style={{
      borderBottom: '1.5px solid #2563eb',
      padding: '6px 30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#ffffff',
      fontSize: '8px',
      color: '#64748b',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <img src="/meinspect-logo.png" alt="MeInspect" style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '4px', display: 'block' }} />
        <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '9px' }}>MeInspect</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>
          🔖 RPT-{inspection.id.slice(0, 8).toUpperCase()}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '7.5px', color: '#94a3b8' }}>
          ⏱ {formatDateTime(inspection.completedAt || inspection.updatedAt || new Date().toISOString())}
        </span>
        {reportHash && (
          <span style={{ fontFamily: 'monospace', fontSize: '6.5px', color: '#94a3b8' }}>
            🔒 {shortHash}…
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Page Footer — appears on every page
// ============================================
function PageFooter({ inspection, pageNumber, totalPages }: { inspection: any; pageNumber: number; totalPages?: number }) {
  const location = inspection.meta.location;
  const gpsCoords = location && typeof location.latitude === 'number' && typeof location.longitude === 'number'
    ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
    : null;
    
  return (
    <div style={{
      borderTop: '1px solid #e2e8f0',
      padding: '5px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '7.5px',
      color: '#94a3b8',
      background: '#f8fafc',
      marginTop: 'auto',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span>📍 GPS: {gpsCoords || 'Not Available'}</span>
        <span>🌐 IP: {inspection.meta.ipAddress || 'Not Available'}</span>
      </div>
      <div style={{ fontWeight: '600' }}>
        Page {pageNumber}{totalPages ? ` of ${totalPages}` : ''}
      </div>
    </div>
  );
}

// ============================================
// Main Report Page Component
// ============================================
export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getInspection } = useInspectionStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [reportHash, setReportHash] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [reportScale, setReportScale] = useState(1);
  const [reportHeight, setReportHeight] = useState<number | null>(null);

  // iOS native in-app purchase state (RevenueCat). Web/Android are untouched
  // and continue to use the Stripe PaymentModal flow below.
  const isIOSNative = Capacitor.getPlatform() === 'ios';
  const [iapState, setIapState] = useState<'idle' | 'checking' | 'purchasing' | 'confirming' | 'error'>('idle');
  const [iapError, setIapError] = useState('');
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuthStore();
  const inspection = id ? getInspection(id) : useInspectionStore.getState().currentInspection;
  const [isPaid, setIsPaid] = useState(inspection?.payment?.paid || false);

  // Reactively update isPaid when inspection.payment.paid changes (e.g., after store sync)
  useEffect(() => {
    if (inspection?.payment?.paid && !isPaid) {
      setIsPaid(true);
    }
  }, [inspection?.payment?.paid]);

  // Check backend for authoritative payment status (server is source of truth)
  // This handles the case where user comes from history and local data is stale
  useEffect(() => {
    if (!inspection?.id || isPaid) return;
    const checkBackendPayment = async () => {
      try {
        const res = await client.api.fetch(`/api/inspections/${inspection.id}`);
        if (res.ok) {
          const { data } = await res.json();
          // GET /api/inspections/:id returns raw DB row; paymentData is a JSON string
          let paymentStatus: any = {};
          if (data.paymentData && typeof data.paymentData === 'string') {
            try { paymentStatus = JSON.parse(data.paymentData); } catch {}
          } else if (data.payment && typeof data.payment === 'object') {
            paymentStatus = data.payment;
          }
          if (paymentStatus?.paid === true) {
            setIsPaid(true);
            // Update local store so future navigations reflect payment
            const { recordPayment } = useInspectionStore.getState();
            recordPayment(inspection.id, {
              paid: true,
              amount: paymentStatus.amount || 0,
              currency: paymentStatus.currency || 'AED',
              method: paymentStatus.method || 'card',
              paidAt: paymentStatus.paidAt,
              sessionId: paymentStatus.sessionId,
            });
          }
        }
      } catch (e) {
        // Silent fail — user can still see the report page
      }
    };
    checkBackendPayment();
  }, [inspection?.id]);

  // --- iOS RevenueCat purchase confirmation polling ---
  // The backend webhook (/api/webhooks/revenuecat) is the ONLY thing that ever
  // flips paymentData.paid for an in-app purchase. This helper repeatedly asks
  // the backend for the authoritative status; it never unlocks anything itself.
  const pollBackendForUnlock = useCallback((maxAttempts = 20, intervalMs = 3000) => {
    if (!inspection?.id) return;
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      try {
        const res = await client.api.fetch(`/api/inspections/${inspection.id}`);
        if (res.ok) {
          const { data } = await res.json();
          let paymentStatus: any = {};
          if (data.paymentData && typeof data.paymentData === 'string') {
            try { paymentStatus = JSON.parse(data.paymentData); } catch {}
          } else if (data.payment && typeof data.payment === 'object') {
            paymentStatus = data.payment;
          }
          if (paymentStatus?.paid === true) {
            setIsPaid(true);
            setIapState('idle');
            setIapError('');
            const { recordPayment } = useInspectionStore.getState();
            recordPayment(inspection.id, {
              paid: true,
              amount: paymentStatus.amount || 0,
              currency: paymentStatus.currency || 'AED',
              method: 'apple_pay',
              paidAt: paymentStatus.paidAt,
            });
            return;
          }
        }
      } catch (e) {
        console.warn('[ReportPage] Backend unlock poll failed:', e);
      }
      if (attempts < maxAttempts) {
        pollTimerRef.current = setTimeout(tick, intervalMs);
      } else {
        // SAFETY NET: the webhook never confirmed within the poll window. Ask
        // the backend to reconcile directly against RevenueCat's own record of
        // this purchase before showing an error — so the user is never
        // permanently stuck if the webhook path had an issue.
        let reconciled = false;
        try {
          const rec = await client.api.fetch(`/api/inspections/${inspection.id}/reconcile-purchase`, {
            method: 'POST',
          });
          if (rec.ok) {
            const recData = await rec.json().catch(() => ({}));
            if (recData?.paid === true) {
              setIsPaid(true);
              setIapState('idle');
              setIapError('');
              const { recordPayment } = useInspectionStore.getState();
              recordPayment(inspection.id, {
                paid: true,
                amount: 0,
                currency: 'AED',
                method: 'apple_pay',
                paidAt: new Date().toISOString(),
              });
              reconciled = true;
            }
          }
        } catch (e) {
          console.warn('[ReportPage] RevenueCat reconciliation failed:', e);
        }
        if (!reconciled) {
          // Never fail silently — give the user a clear, retry-able state.
          setIapState('error');
          setIapError('Still confirming your purchase with Apple. This can take a moment — please try again shortly.');
        }
      }
    };
    tick();
  }, [inspection?.id]);

  // Clean up any pending poll timer on unmount.
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // On iOS, identify this report to RevenueCat (appUserID = inspectionId) and
  // check whether it was already purchased before showing a purchase button —
  // this alone never unlocks the report, it just avoids a redundant charge.
  useEffect(() => {
    if (!isIOSNative || !inspection?.id || isPaid) return;
    let cancelled = false;
    (async () => {
      setIapState('checking');
      try {
        await identifyReport(inspection.id);
        const alreadyPurchased = await hasPurchasedReport();
        if (cancelled) return;
        if (alreadyPurchased) {
          // RevenueCat already has a transaction for this report — wait for
          // the backend webhook to confirm and unlock (never trust the client).
          setIapState('confirming');
          pollBackendForUnlock();
        } else {
          setIapState('idle');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[ReportPage] RevenueCat identify/check failed:', err);
        setIapState('idle');
      }
    })();
    return () => { cancelled = true; };
  }, [isIOSNative, inspection?.id, isPaid, pollBackendForUnlock]);

  const handleNativePurchase = useCallback(async () => {
    setIapState('purchasing');
    setIapError('');
    const outcome = await purchaseReport();
    if (outcome.status === 'success') {
      // Purchase accepted by Apple/RevenueCat — but the client NEVER unlocks
      // the report itself. Show a confirming state and wait for the verified
      // backend webhook to flip paymentData.paid.
      setIapState('confirming');
      pollBackendForUnlock();
    } else if (outcome.status === 'cancelled') {
      setIapState('error');
      setIapError('Purchase was cancelled.');
    } else {
      setIapState('error');
      setIapError(outcome.message);
    }
  }, [pollBackendForUnlock]);

  // Unified "unlock" entry point used by every CTA below. iOS uses the native
  // RevenueCat purchase flow; web/Android keep the existing Stripe flow
  // completely unchanged.
  const handleUnlockClick = useCallback(() => {
    if (isIOSNative) {
      if (iapState === 'purchasing' || iapState === 'confirming') return;
      handleNativePurchase();
    } else {
      setShowPaymentModal(true);
    }
  }, [isIOSNative, iapState, handleNativePurchase]);

  // Handle payment redirect success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    
    if (params.get('payment') === 'success' && sessionId) {
      // Verify with backend instead of trusting URL
      const verifyPayment = async () => {
        try {
          const res = await client.api.fetch(`/api/checkout/${sessionId}`);
          if (res.ok) {
            const { data } = await res.json();
            if (data.status === 'paid') {
              setIsPaid(true);
              // Update local store
              if (inspection) {
                useInspectionStore.getState().recordPayment(inspection.id, {
                  paid: true,
                  amount: 199,
                  currency: 'AED',
                  method: 'card',
                  sessionId,
                });
              }
            }
          }
        } catch (err) {
          console.error('Payment verification failed:', err);
        } finally {
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      };
      verifyPayment();
    }
  }, [inspection?.id]);

  // Sync inspector name from profile if generic
  useEffect(() => {
    if (inspection && user?.name && (!inspection.meta.inspectorName || inspection.meta.inspectorName === 'Inspector')) {
      inspection.meta.inspectorName = user.name;
    }
  }, [inspection, user?.name]);

  // Generate data integrity hash
  useEffect(() => {
    if (!inspection) return;
    generateReportHash(inspection).then(setReportHash);
  }, [inspection?.id]);

  // Responsive scaling — fit A4 report into mobile viewport
  useEffect(() => {
    const calculateScale = () => {
      const viewportWidth = window.innerWidth;
      const padding = 32; // 16px each side
      const availableWidth = viewportWidth - padding;
      if (availableWidth < A4_WIDTH_PX) {
        setReportScale(availableWidth / A4_WIDTH_PX);
      } else {
        setReportScale(1);
      }
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // Calculate total pages and report height after render
  useEffect(() => {
    if (!printRef.current || !inspection) return;
    const timer = setTimeout(() => {
      if (printRef.current) {
        const height = printRef.current.scrollHeight;
        setTotalPages(Math.ceil(height / A4_CONTENT_HEIGHT));
        setReportHeight(height);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [inspection, reportHash]);

  // Retry fetching location and IP if missing (e.g., permission was slow)
  useEffect(() => {
    if (!inspection) return;
    const meta: Partial<typeof inspection.meta> = inspection.meta || {};
    const needsLocation = !meta.location || typeof meta.location.latitude !== 'number';
    const needsIp = !meta.ipAddress;
    if (!needsLocation && !needsIp) return;

    const retryMetadata = async () => {
      try {
        const { getLocation, getIPAddress } = await import('../utils/helpers');
        const [loc, ip] = await Promise.all([
          needsLocation ? getLocation() : Promise.resolve(null),
          needsIp ? getIPAddress() : Promise.resolve(null),
        ]);
        if ((loc || ip) && inspection) {
          const updatedMeta = { ...inspection.meta };
          if (loc) updatedMeta.location = loc;
          if (ip) updatedMeta.ipAddress = ip;
          const updatedInspection = { ...inspection, meta: updatedMeta };
          useInspectionStore.getState().setCurrentInspection(updatedInspection);
        }
      } catch (e) {
        console.warn('[ReportPage] Failed to fetch location/IP:', e);
      }
    };
    retryMetadata();
  }, [inspection?.id]);

  // Sync inspection to backend on load
  useEffect(() => {
    if (!inspection) return;
    const syncToBackend = async () => {
      try {
        const stripPhotos = (data: any): any => {
          if (!data) return data;
          if (Array.isArray(data)) return data.map(stripPhotos);
          if (typeof data === 'object') {
            const r: any = {};
            for (const [k, v] of Object.entries(data)) {
              if ((k === 'url' || k === 'dataUrl') && typeof v === 'string' && v.startsWith('data:')) {
                r[k] = '';
              } else {
                r[k] = stripPhotos(v);
              }
            }
            return r;
          }
          return data;
        };

        const payload = stripPhotos({
          id: inspection.id,
          propertyType: inspection.propertyType,
          status: inspection.status,
          generalNotes: inspection.generalNotes,
          property: inspection.property,
          tenant: inspection.tenant,
          landlord: inspection.landlord,
          agent: inspection.agent,
          tenancy: inspection.tenancy,
          rooms: inspection.rooms,
          propertyItems: inspection.propertyItems,
          signatures: inspection.signatures,
          overallPhotos: inspection.overallPhotos,
          payment: inspection.payment,
          reportGenerated: inspection.reportGenerated,
          meta: inspection.meta,
        });

        const putRes = await client.api.fetch(`/api/inspections/${inspection.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!putRes.ok) {
          const postRes = await client.api.fetch('/api/inspections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      } catch (e) {
        console.warn('[ReportPage] Failed to sync inspection to backend:', e);
      }
    };
    syncToBackend();
  }, [inspection?.id]);

  if (!inspection) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Inspection not found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 hover:text-blue-700 font-medium">
          Go to Dashboard
        </button>
      </div>
    );
  }

  // Computed stats
  const totalItems = inspection.rooms.reduce((acc, r) => acc + r.items.length, 0);
  const checkedItems = inspection.rooms.reduce((acc, r) => acc + r.items.filter(i => i.checked).length, 0);
  const damagedItems = inspection.rooms.reduce(
    (acc, r) => acc + r.items.filter(i => i.condition === 'poor').length, 0
  );
  const goodItems = inspection.rooms.reduce(
    (acc, r) => acc + r.items.filter(i => i.condition === 'very_good' || i.condition === 'good').length, 0
  );
  const totalPhotos = inspection.rooms.reduce((acc, r) => acc + r.items.reduce((a, i) => a + i.photos.length, 0), 0) + inspection.overallPhotos.length;

  const REPORT_PRICE = 199;

  const propertyDisplayName = [
    inspection.property.buildingName,
    inspection.property.unitNumber ? `Unit ${inspection.property.unitNumber}` : '',
  ].filter(Boolean).join(' ') || inspection.property.makaniNumber || 'Property';

  const propertyAddress = [
    inspection.property.area,
    inspection.property.city,
  ].filter(Boolean).join(', ') || '—';

  // Owner's name for report title/filename (landlord is treated as the property owner)
  const ownerName = inspection.landlord?.name || 'Owner';
  const reportDateStr = formatDate(inspection.completedAt || inspection.updatedAt || new Date().toISOString());

  const sanitizeFilename = (s: string) => s
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '-');

  // Report title/filename: Address, Owner's name, Date — short identifiable string
  const reportTitleString = sanitizeFilename(
    `${propertyDisplayName}-${propertyAddress}-${ownerName}-${reportDateStr}`.replace(/—/g, '-')
  );

  // Group rooms into page-groups so short rooms share a page instead of
  // each room forcing its own (mostly blank) full page.
  const ROOM_PAGE_BUDGET = A4_CONTENT_HEIGHT - 80;
  const estimateRoomHeight = (room: typeof inspection.rooms[number]) => {
    let h = 46; // section title + room header row
    room.items.forEach((item) => {
      h += 34;
      if (item.comments) h += 14;
      if (item.photos && item.photos.length > 0) h += 92;
    });
    if (room.overallComments) h += 32;
    return h;
  };
  const roomGroups: Array<typeof inspection.rooms> = [];
  {
    let current: typeof inspection.rooms = [];
    let currentHeight = 0;
    inspection.rooms.forEach((room) => {
      const h = estimateRoomHeight(room);
      if (current.length > 0 && currentHeight + h > ROOM_PAGE_BUDGET) {
        roomGroups.push(current);
        current = [];
        currentHeight = 0;
      }
      current.push(room);
      currentHeight += h;
    });
    if (current.length > 0) roomGroups.push(current);
  }

  const handleDownloadClick = () => {
    if (!isPaid) {
      handleUnlockClick();
      return;
    }
    generatePDF();
  };

  const handlePaymentSuccess = useCallback(() => {
    setIsPaid(true);
    if (inspection) {
      const { recordPayment } = useInspectionStore.getState();
      recordPayment(inspection.id, { paid: true, amount: REPORT_PRICE, currency: 'AED', method: 'card' });
    }
    setTimeout(() => { generatePDF(); }, 1500);
    setTimeout(() => { setShowEmailModal(true); }, 4000);
  }, [inspection]);

  // ============================================
  // PDF Generation
  // ============================================
  const generatePDF = useCallback(async () => {
    if (!printRef.current) {
      setProgress('Report content not ready. Please wait a moment and try again.');
      return;
    }
    setGenerating(true);
    setProgress('Generating PDF... Please wait.');

    try {
      // Temporarily reset the scale for PDF generation to get full-res output
      const element = printRef.current;
      const originalTransform = element.style.transform;
      const originalTransformOrigin = element.style.transformOrigin;
      const originalMarginLeft = element.style.marginLeft;
      const originalBorder = element.style.border;
      const originalBorderRadius = element.style.borderRadius;
      const originalBoxShadow = element.style.boxShadow;

      element.style.transform = 'none';
      element.style.transformOrigin = 'top left';
      element.style.marginLeft = 'auto';
      element.style.border = 'none';
      element.style.borderRadius = '0';
      element.style.boxShadow = 'none';

      // Small delay to let the browser repaint after removing transform
      await new Promise(resolve => setTimeout(resolve, 200));

      const opt = {
        margin: [8, 0, 8, 0] as [number, number, number, number],
        filename: `${reportTitleString}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.92 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: A4_WIDTH_PX,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const,
        },
        pagebreak: { mode: ['css', 'legacy'] },
      };

      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');

      // Restore the scale and styles
      element.style.transform = originalTransform;
      element.style.transformOrigin = originalTransformOrigin;
      element.style.marginLeft = originalMarginLeft;
      element.style.border = originalBorder;
      element.style.borderRadius = originalBorderRadius;
      element.style.boxShadow = originalBoxShadow;

      const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        setProgress('Saving PDF to device...');
        const base64Data = await blobToBase64(pdfBlob);
        const savedFile = await Filesystem.writeFile({
          path: opt.filename,
          data: base64Data,
          directory: Directory.Documents,
        });
        setProgress('PDF saved to Documents folder!');
        try {
          const uri = await Filesystem.getUri({
            path: opt.filename,
            directory: Directory.Documents,
          });
          await Share.share({
            title: 'Property Inspection Report',
            text: 'Your property inspection report is ready',
            url: uri.uri,
            dialogTitle: 'Share Report PDF',
          });
        } catch (shareErr) { /* user cancelled share dialog */ }
      } else {
        setProgress('Downloading PDF...');
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = opt.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setProgress(isNative ? 'PDF saved! Uploading to cloud...' : 'PDF downloaded! Uploading to cloud...');

      try {
        const res = await client.api.fetch('/api/upload/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inspectionId: inspection.id }),
        });
        if (res.ok) {
          const { uploadUrl, path } = await res.json();
          await fetch(uploadUrl, {
            method: 'PUT',
            body: pdfBlob,
            headers: { 'Content-Type': 'application/pdf' },
          });
          const updateRes = await client.api.fetch(`/api/inspections/${inspection.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfUrl: path }),
          });
          if (updateRes.ok) {
            const { setCurrentInspection, currentInspection } = useInspectionStore.getState();
            if (currentInspection && currentInspection.id === inspection.id) {
              setCurrentInspection({ ...currentInspection, pdfUrl: path });
            }
            setProgress('PDF saved to cloud! ✓');
          } else {
            setProgress('PDF downloaded! (Cloud save failed)');
          }
        } else {
          setProgress('PDF downloaded! (Cloud save unavailable)');
        }
      } catch (uploadErr) {
        setProgress('PDF downloaded! (Cloud save failed)');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      setProgress(`PDF generation failed: ${err instanceof Error ? err.message : 'Unknown error'}. Using print fallback...`);
      // Fallback: try window.print
      try {
        setTimeout(() => {
          window.print();
        }, 500);
      } catch (printErr) {
        setProgress('PDF generation failed. Please try the Print button instead.');
      }
    } finally {
      setTimeout(() => { setGenerating(false); setProgress(''); }, 3000);
    }
  }, [inspection]);

  const handlePrint = () => {
    if (!isPaid) {
      handleUnlockClick();
      return;
    }
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      generatePDF();
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow || !printRef.current) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitleString}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; color: #1e293b; line-height: 1.5; font-size: 13px; width: ${A4_WIDTH_PX}px; margin: 0 auto; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${printRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 600);
  };

  const getConditionBg = (condition: string | null) => {
    switch (condition) {
      case 'very_good': return 'background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #065f46;';
      case 'good': return 'background: linear-gradient(135deg, #dcfce7, #bbf7d0); color: #166534;';
      case 'fair': return 'background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e;';
      case 'poor': return 'background: linear-gradient(135deg, #fee2e2, #fecaca); color: #991b1b;';
      default: return 'background: #f8fafc; color: #94a3b8; border: 1px dashed #cbd5e1;';
    }
  };

  const parseInlineStyle = (styleStr: string) => {
    const style: any = {};
    styleStr.split(';').forEach(s => {
      const [k, v] = s.split(':');
      if (k && v) {
        const key = k.trim().replace(/-./g, x => x[1].toUpperCase());
        style[key] = v.trim();
      }
    });
    return style;
  };

  const coverPhoto = (inspection.overallPhotos && inspection.overallPhotos.length > 0)
    ? inspection.overallPhotos[0]
    : (inspection.rooms.flatMap(r => r.items.flatMap(i => i.photos)) || []).find(p => p.url) || null;

  const createdAt = inspection.createdAt && !isNaN(new Date(inspection.createdAt).getTime())
    ? inspection.createdAt
    : inspection.updatedAt || new Date().toISOString();

  const hdr = <PageHeader inspection={inspection} reportHash={reportHash} />;
  const ftr = (n: number) => <PageFooter inspection={inspection} pageNumber={n} totalPages={totalPages} />;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4 no-print flex-wrap gap-2">
        <button onClick={() => safeGoBack(navigate, '/history')} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {progress && <span className="text-xs text-blue-600 font-medium animate-pulse">{progress}</span>}
          <button
            onClick={handleDownloadClick}
            disabled={generating}
            className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
              generating
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25'
            }`}
          >
            {generating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating PDF...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {isPaid ? 'Download PDF' : (isIOSNative ? 'Unlock to Download' : 'Pay to Download')}
              </>
            )}
          </button>
          <button
            onClick={() => isPaid ? setShowEmailModal(true) : handleUnlockClick()}
            className="px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isPaid ? 'Email Report' : (isIOSNative ? 'Unlock to Email' : 'Pay to Email')}
          </button>
          <button
            onClick={handlePrint}
            className="px-3 sm:px-5 py-2 sm:py-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {!isPaid && (
        <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/20">
            💳
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-blue-900">Report Locked</h3>
            <p className="text-sm text-blue-700">
              {isIOSNative
                ? 'Complete your in-app purchase to download the full professional PDF report and email it to all parties.'
                : 'Complete your payment to download the full professional PDF report and email it to all parties.'}
            </p>
            {isIOSNative && iapState === 'error' && iapError && (
              <p className="text-sm text-red-600 font-medium mt-2">{iapError}</p>
            )}
          </div>
          {isIOSNative ? (
            <button
              onClick={handleUnlockClick}
              disabled={iapState === 'purchasing' || iapState === 'confirming' || iapState === 'checking'}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {iapState === 'checking' && 'Checking...'}
              {iapState === 'purchasing' && 'Processing...'}
              {iapState === 'confirming' && 'Confirming purchase...'}
              {(iapState === 'idle' || iapState === 'error') && (iapError ? 'Try Again' : 'Unlock Report')}
            </button>
          ) : (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 whitespace-nowrap"
            >
              Pay AED {REPORT_PRICE}
            </button>
          )}
        </div>
      )}

      {/* REPORT CONTENT — A4 WIDTH, scaled to fit */}
      <div
        className="report-wrapper"
        style={{
          width: '100%',
          overflowX: 'hidden',
          overflowY: 'visible',
          height: reportScale < 1 && reportHeight ? `${reportHeight * reportScale + 20}px` : 'auto',
          filter: !isPaid ? 'blur(4px) grayscale(50%)' : 'none',
          pointerEvents: !isPaid ? 'none' : 'auto',
          userSelect: !isPaid ? 'none' : 'auto',
        }}
      >
        <div
          ref={printRef}
          id="report-content"
          style={{
            width: `${A4_WIDTH_PX}px`,
            background: '#ffffff',
            overflow: 'hidden',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            transformOrigin: 'top left',
            transform: reportScale < 1 ? `scale(${reportScale})` : undefined,
            marginLeft: reportScale < 1 ? '0' : 'auto',
            marginRight: 'auto',
          }}
        >
          {/* Cover Page */}
          <div style={{ pageBreakAfter: 'always', display: 'flex', flexDirection: 'column' }}>
            {hdr}
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '18px 40px 16px', textAlign: 'center' }}>
              <h1 style={{ color: '#ffffff', fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px', lineHeight: '1.2', marginBottom: '2px' }}>
                Property Condition Report
              </h1>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '10px', fontWeight: '500' }}>
                {getPropertyTypeLabel(inspection.propertyType)} — Condition Assessment
              </div>
            </div>
            <div style={{ padding: '14px 40px 0', textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '2px' }}>{propertyDisplayName}</h2>
              <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{propertyAddress}</p>
            </div>
            {coverPhoto && coverPhoto.url && (
              <div style={{ padding: '10px 40px', textAlign: 'center' }}>
                <div style={{ width: '100%', maxWidth: '380px', height: '180px', backgroundImage: `url(${coverPhoto.url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', borderRadius: '10px', border: '1px solid #e2e8f0', margin: '0 auto' }} />
                <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '4px' }}>📷 {formatDateTime(coverPhoto.timestamp)}</div>
              </div>
            )}
            <div style={{ padding: '6px 40px 0' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Property Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px 16px' }}>
                  <InfoRowCompact label="Type" value={getPropertyTypeLabel(inspection.propertyType)} />
                  <InfoRowCompact label="Area" value={inspection.property.area || '—'} />
                  <InfoRowCompact label="City" value={inspection.property.city || '—'} />
                  {inspection.property.buildingName && <InfoRowCompact label="Building" value={inspection.property.buildingName} />}
                  {inspection.property.unitNumber && <InfoRowCompact label="Unit" value={inspection.property.unitNumber} />}
                  {inspection.property.makaniNumber && <InfoRowCompact label="Makani" value={inspection.property.makaniNumber} />}
                  {inspection.property.totalAreaSqft && <InfoRowCompact label="Area (sqft)" value={String(inspection.property.totalAreaSqft)} />}
                  {inspection.property.bedrooms !== undefined && <InfoRowCompact label="Beds" value={String(inspection.property.bedrooms)} />}
                  {inspection.property.bathrooms !== undefined && <InfoRowCompact label="Baths" value={String(inspection.property.bathrooms)} />}
                  <InfoRowCompact label="Furnished" value={inspection.property.furnished ? 'Yes' : 'No'} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>🏢 Landlord</div>
                  <div style={{ fontSize: '10px', lineHeight: '1.6', color: '#78350f' }}>
                    <div><span style={{ fontWeight: '600' }}>Name:</span> {inspection.landlord.name || '—'}</div>
                    <div><span style={{ fontWeight: '600' }}>Phone:</span> {inspection.landlord.phone || '—'}</div>
                    <div><span style={{ fontWeight: '600' }}>Email:</span> {inspection.landlord.email || '—'}</div>
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>👤 Tenant</div>
                  <div style={{ fontSize: '10px', lineHeight: '1.6', color: '#1e3a8a' }}>
                    <div><span style={{ fontWeight: '600' }}>Name:</span> {inspection.tenant.name || '—'}</div>
                    <div><span style={{ fontWeight: '600' }}>Phone:</span> {inspection.tenant.phone || '—'}</div>
                    <div><span style={{ fontWeight: '600' }}>Email:</span> {inspection.tenant.email || '—'}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>📊 Inspection Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <MiniStat label="Rooms" value={String(inspection.rooms.length)} color="#2563eb" />
                    <MiniStat label="Items" value={`${checkedItems}/${totalItems}`} color="#059669" />
                    <MiniStat label="Good" value={String(goodItems)} color="#0891b2" />
                    <MiniStat label="Issues" value={String(damagedItems)} color={damagedItems > 0 ? '#dc2626' : '#64748b'} />
                  </div>
                </div>
                <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>📄 Tenancy Details</div>
                  <div style={{ fontSize: '10px', lineHeight: '1.8', color: '#581c87' }}>
                    <InfoRowCompact label="Lease Start" value={formatDate(inspection.tenancy.leaseStartDate) || '—'} />
                    <InfoRowCompact label="Lease End" value={formatDate(inspection.tenancy.leaseEndDate) || '—'} />
                    {inspection.tenancy.contractNumber && <InfoRowCompact label="Contract" value={inspection.tenancy.contractNumber} />}
                  </div>
                </div>
              </div>
            </div>
            {ftr(1)}
          </div>

          {/* Disclaimer Page */}
          <div style={{ pageBreakAfter: 'always', display: 'flex', flexDirection: 'column' }}>
            {hdr}
            <div style={{ padding: '16px 40px', flex: 1 }}>
              <div style={{ marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid #2563eb' }}>
                <h2 style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Disclaimer &amp; Terms / إخلاء المسؤولية والشروط</h2>
              </div>

              {/* English Disclaimer */}
              <div style={{ marginBottom: '10px' }}>
                <h3 style={{ fontSize: '9.5px', fontWeight: '700', color: '#1e3a8a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ENGLISH</h3>
                <div style={{ background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: '8px', padding: '10px 12px', fontSize: '8px', lineHeight: '1.65', color: '#334155' }}>
                  <p style={{ marginBottom: '5px' }}><strong>1. Purpose &amp; Scope:</strong> This Property Condition Report ("Report") has been prepared using the MeInspect application ("Application") for informational and documentation purposes only. The Report provides a general assessment of the observable condition of the property at the date and time of inspection. It does not constitute a structural survey, engineering assessment, legal opinion, or valuation.</p>
                  <p style={{ marginBottom: '5px' }}><strong>2. Limitations:</strong> The inspection is limited to visually accessible areas and items. Concealed, inaccessible, or underground components are excluded. The inspector does not move furniture, lift flooring, or inspect inside walls, ceilings, or enclosed spaces unless otherwise stated.</p>
                  <p style={{ marginBottom: '5px' }}><strong>3. No Warranty:</strong> The Report does not imply any warranty or guarantee regarding the condition, fitness for purpose, or safety of the property. MeInspect and the inspector make no representations that the property is free from defects not identified in this Report.</p>
                  <p style={{ marginBottom: '5px' }}><strong>4. Liability:</strong> To the maximum extent permitted by applicable law, MeInspect, its directors, employees, and agents shall not be liable for any direct, indirect, incidental, or consequential loss or damage arising from reliance on this Report. The total liability of MeInspect shall not exceed the fee paid for this inspection.</p>
                  <p style={{ marginBottom: '5px' }}><strong>5. Digital Integrity:</strong> This Report contains a cryptographic hash and geolocation metadata to verify its authenticity. Any alteration of this document invalidates its authenticity. The digital signatures appended herein constitute legally binding consent by all signing parties.</p>
                  <p style={{ marginBottom: '5px' }}><strong>6. Governing Law:</strong> This Report and any disputes arising from it shall be governed by the laws of the United Arab Emirates. Any disputes shall be subject to the exclusive jurisdiction of the courts of the UAE.</p>
                  <p><strong>7. Privacy:</strong> Personal data collected in this Report is processed in accordance with UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection. Data is used solely for property inspection documentation and will not be shared with third parties without consent.</p>
                </div>
              </div>

              {/* Arabic Disclaimer */}
              <div>
                <h3 style={{ fontSize: '9.5px', fontWeight: '700', color: '#1e3a8a', marginBottom: '4px', direction: 'rtl', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' }}>العربية</h3>
                <div style={{ background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: '8px', padding: '10px 12px', fontSize: '8px', lineHeight: '1.75', color: '#334155', direction: 'rtl', textAlign: 'right' }}>
                  <p style={{ marginBottom: '5px' }}><strong>١. الغرض والنطاق:</strong> تم إعداد تقرير حالة العقار هذا ("التقرير") باستخدام تطبيق MeInspect ("التطبيق") لأغراض المعلومات والتوثيق فحسب. يقدّم التقرير تقييمًا عامًا للحالة الظاهرية للعقار في تاريخ ووقت الفحص، ولا يُعدّ مسحًا هيكليًا أو تقييمًا هندسيًا أو رأيًا قانونيًا أو تقييمًا للقيمة السوقية.</p>
                  <p style={{ marginBottom: '5px' }}><strong>٢. القيود:</strong> يقتصر الفحص على المناطق والعناصر المرئية والمتاحة. تُستثنى الأجزاء المخفية أو غير القابلة للوصول أو تحت الأرض. لا يقوم المفتش بتحريك الأثاث أو رفع الأرضيات أو فحص داخل الجدران والأسقف والمساحات المغلقة إلا إذا نُصَّ على ذلك.</p>
                  <p style={{ marginBottom: '5px' }}><strong>٣. لا ضمان:</strong> لا يعني التقرير أي ضمان أو كفالة تتعلق بحالة العقار أو صلاحيته أو سلامته. لا يُقدّم MeInspect والمفتش أي تأكيدات بخلو العقار من عيوب لم يُشر إليها في هذا التقرير.</p>
                  <p style={{ marginBottom: '5px' }}><strong>٤. المسؤولية:</strong> في أقصى الحدود التي يسمح بها القانون المعمول به، لن يتحمل MeInspect أو مديروه أو موظفوه أو وكلاؤه أي مسؤولية عن خسائر أو أضرار مباشرة أو غير مباشرة أو عرضية أو تبعية ناجمة عن الاعتماد على هذا التقرير.</p>
                  <p style={{ marginBottom: '5px' }}><strong>٥. النزاهة الرقمية:</strong> يتضمن هذا التقرير تجزئة تشفيرية وبيانات تعريف جغرافية للتحقق من صحته. أي تعديل على هذه الوثيقة يُبطل أصالتها. تُشكّل التوقيعات الرقمية المرفقة موافقة قانونية ملزمة من جميع الأطراف الموقّعة.</p>
                  <p><strong>٦. القانون الحاكم:</strong> يخضع هذا التقرير وأي نزاعات تنشأ عنه لقوانين دولة الإمارات العربية المتحدة، وتختص محاكم الدولة حصرًا بالنظر في أي نزاعات تتعلق به.</p>
                </div>
              </div>
            </div>
            {ftr(2)}
          </div>

          {/* Room Assessments — grouped to minimize blank page space */}
          {roomGroups.map((group, gIdx) => (
            <div key={`room-group-${gIdx}`} style={{ pageBreakAfter: 'always', display: 'flex', flexDirection: 'column' }}>
              {hdr}
              <div style={{ padding: '16px 40px', flex: 1 }}>
                {group.map((room) => (
                <ReportSection key={room.id} title={`${room.name} Assessment`} icon="🔍" accentColor="#ea580c">
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '1px solid #e2e8f0', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{room.icon}</span>
                        <div style={{ fontWeight: '700', fontSize: '12px', color: '#1e293b' }}>{room.name}</div>
                      </div>
                    </div>
                    <div style={{ padding: '10px 14px' }}>
                      {room.items.map((item, idx) => (
                        <div key={item.id} style={{ paddingBottom: '8px', marginBottom: '8px', borderBottom: idx < room.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '2px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '600', fontSize: '10px', color: '#334155' }}>{item.name}</span>
                                <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: '8px', fontSize: '8px', fontWeight: '600', ...parseInlineStyle(getConditionBg(item.condition)) }}>
                                  {getConditionLabel(item.condition)}
                                </span>
                              </div>
                              {item.comments && <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{item.comments}</div>}
                            </div>
                          </div>
                          {/* Item Photos */}
                          {item.photos && item.photos.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                              {item.photos.map((photo: any) => photo.url && (
                                <div key={photo.id} style={{ position: 'relative' }}>
                                  <div
                                    style={{
                                      width: '100px',
                                      height: '75px',
                                      backgroundImage: `url(${photo.url})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                      backgroundRepeat: 'no-repeat',
                                      borderRadius: '6px',
                                      border: '1px solid #e2e8f0',
                                    }}
                                  />
                                  {photo.timestamp && (
                                    <div style={{ fontSize: '6px', color: '#94a3b8', textAlign: 'center', marginTop: '2px' }}>
                                      {formatDateTime(photo.timestamp)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Room-level comments */}
                  {room.overallComments && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', fontSize: '9px', color: '#7c2d12' }}>
                      <strong>Room Notes:</strong> {room.overallComments}
                    </div>
                  )}
                </ReportSection>
                ))}
              </div>
              {ftr(3 + gIdx)}
            </div>
          ))}

          {/* Signatures Page */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {hdr}
            <div style={{ padding: '16px 40px', flex: 1 }}>
              <div style={{ marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid #2563eb' }}>
                <h2 style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Digital Signatures &amp; Legal Declaration</h2>
              </div>

              {/* Legal Declaration */}
              <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1.5px solid #93c5fd', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#1e40af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚖️ Legal Declaration / إقرار قانوني</div>
                <p style={{ fontSize: '8px', lineHeight: '1.7', color: '#1e3a8a', marginBottom: '6px' }}>
                  By signing below, all parties confirm that they have read, understood, and agree to the contents of this Property Condition Report. The signatories acknowledge that:
                </p>
                <ul style={{ fontSize: '8px', lineHeight: '1.8', color: '#1e3a8a', paddingLeft: '14px', marginBottom: '6px' }}>
                  <li>The information contained in this Report accurately reflects the condition of the property as observed at the time of inspection on <strong>{formatDateTime(inspection.completedAt || inspection.updatedAt || new Date().toISOString())}</strong>.</li>
                  <li>This Report constitutes a legally binding record of the property's condition at move-in / move-out and may be used in any dispute resolution, mediation, or legal proceedings.</li>
                  <li>Any party who signs this document digitally does so with full understanding that the digital signature carries the same legal weight as a handwritten signature under UAE Federal Law No. 1 of 2006 on Electronic Commerce and Transactions.</li>
                  <li>The Report hash code printed in every page header serves as a tamper-evident seal; any modification to the document will invalidate this hash.</li>
                </ul>
                <p style={{ fontSize: '8px', lineHeight: '1.7', color: '#1e3a8a', direction: 'rtl', textAlign: 'right', borderTop: '1px solid #bfdbfe', paddingTop: '6px', marginTop: '4px' }}>
                  بالتوقيع أدناه، يُقرّ جميع الأطراف بأنهم قرأوا محتوى هذا التقرير وفهموه ووافقوا عليه، وأن التوقيع الرقمي يحمل نفس القيمة القانونية للتوقيع بخط اليد وفقًا لقانون الإمارات العربية المتحدة الاتحادي رقم 1 لسنة 2006 بشأن المعاملات والتجارة الإلكترونية. يُعدّ هذا التقرير سجلًا قانونيًا ملزمًا لحالة العقار ويمكن الاستناد إليه في أي إجراءات لتسوية النزاعات.
                </p>
              </div>

              {/* Signature Blocks */}
              <div style={{ display: 'grid', gridTemplateColumns: inspection.signatures.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                {inspection.signatures.map((sig) => (
                  <div key={sig.role} style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px', textAlign: 'center', background: '#fafafa' }}>
                    <div style={{ fontSize: '7px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>{sig.role}</div>
                    {sig.dataUrl ? (
                      <div style={{ width: '100%', height: '50px', backgroundImage: `url(${sig.dataUrl})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                    ) : (
                      <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '8px' }}>No signature</div>
                    )}
                    <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '4px' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: '700', color: '#1e293b' }}>{sig.name}</div>
                      {sig.signedAt && <div style={{ fontSize: '7px', color: '#64748b', marginTop: '1px' }}>{formatDateTime(sig.signedAt)}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Report metadata summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '7.5px', color: '#64748b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                  <span><strong>Report ID:</strong> RPT-{inspection.id.slice(0, 8).toUpperCase()}</span>
                  <span><strong>Inspection Date:</strong> {formatDateTime(inspection.completedAt || inspection.updatedAt || new Date().toISOString())}</span>
                  <span><strong>Inspector:</strong> {inspection.meta.inspectorName || '—'}</span>
                  {inspection.meta.ipAddress && <span><strong>IP:</strong> {inspection.meta.ipAddress}</span>}
                  {inspection.meta.location && typeof inspection.meta.location.latitude === 'number' && (
                    <span><strong>GPS:</strong> {inspection.meta.location.latitude.toFixed(6)}, {inspection.meta.location.longitude.toFixed(6)}</span>
                  )}
                  {reportHash && <span><strong>Hash:</strong> {reportHash.slice(0, 20)}…</span>}
                </div>
              </div>
            </div>
            {ftr(3 + roomGroups.length)}
          </div>
        </div>
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        amount={REPORT_PRICE}
        reportId={inspection.id}
      />

      <EmailReportModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        recipients={[
          ...(inspection.tenant.email ? [{ name: inspection.tenant.name, email: inspection.tenant.email, role: 'tenant' }] : []),
          ...(inspection.landlord.email ? [{ name: inspection.landlord.name, email: inspection.landlord.email, role: 'landlord' }] : []),
          ...(inspection.meta.inspectorEmail ? [{ name: inspection.meta.inspectorName, email: inspection.meta.inspectorEmail, role: 'inspector' }] : []),
        ]}
        reportName={propertyDisplayName}
        reportId={inspection.id}
        inspection={inspection}
      />
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function ReportSection({ title, icon, accentColor, children, pageBreak }: {
  title: string; icon: string; accentColor: string; children: React.ReactNode; pageBreak?: boolean;
}) {
  return (
    <div style={{ marginBottom: '16px', pageBreakInside: 'avoid', breakInside: 'avoid', ...(pageBreak ? { pageBreakBefore: 'always', breakBefore: 'page' } : {}) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '2px solid #e2e8f0', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: '-2px', left: 0, width: '40px', height: '2px', background: accentColor, borderRadius: '1px' }}></div>
        <div style={{ width: '22px', height: '22px', background: `${accentColor}15`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{icon}</div>
        <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', letterSpacing: '-0.2px' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRowCompact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '8px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '9px', fontWeight: '600', color: '#334155', textAlign: 'right', whiteSpace: 'normal', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4px', background: '#ffffff', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: '10px', fontWeight: '800', color }}>{value}</div>
      <div style={{ fontSize: '7px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}
