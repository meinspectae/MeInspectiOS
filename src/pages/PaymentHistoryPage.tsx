import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { Order } from '../types';
import { formatDateTime } from '../utils/helpers';

export default function PaymentHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await client.api.fetch('/api/orders');
        if (res.ok) {
          const { data } = await res.json();
          setOrders(data || []);
        } else {
          setError('Failed to load payment history');
        }
      } catch (err) {
        setError('An error occurred while loading payment history');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleDownloadInvoice = async (orderId: number) => {
    setDownloadingId(orderId);
    try {
      const res = await client.api.fetch(`/api/orders/${orderId}/invoice`);
      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          window.open(url, '_blank');
        } else {
          alert('Invoice URL not found');
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to retrieve invoice');
      }
    } catch (err) {
      alert('An error occurred while retrieving the invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Payment History</h1>
        </div>
        <p className="text-slate-500 ml-11">View and manage your report purchases.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all">
            Try Again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <div className="text-4xl mb-4">💳</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No Payments Yet</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            You haven't purchased any reports yet. Your payment history will appear here once you complete a checkout.
          </p>
          <button onClick={() => navigate('/')} className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25">
            Start New Inspection
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Report ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {new Date(order.createdAt * 1000).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(order.createdAt * 1000).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-slate-600">
                        {order.inspectionId ? `RPT-${order.inspectionId.slice(0, 8).toUpperCase()}` : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">
                        {order.currency} {order.amount.toLocaleString()}
                      </div>
                      {order.discountAmount > 0 && (
                        <div className="text-[10px] text-emerald-600 font-medium">
                          -{order.currency} {order.discountAmount} ({order.discountCode})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        {order.inspectionId && (
                          <button
                            onClick={() => navigate(`/report/${order.inspectionId}`)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors text-left"
                          >
                            View Report
                          </button>
                        )}
                        {order.status === 'paid' && order.provider === 'stripe' && (
                          <button
                            onClick={() => handleDownloadInvoice(order.id)}
                            disabled={downloadingId === order.id}
                            className="text-slate-600 hover:text-slate-900 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            {downloadingId === order.id ? (
                              <span className="animate-pulse">Loading...</span>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download Invoice
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
