import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import StatusBadge from '../components/StatusBadge';

const EmployeeLeaves: React.FC = () => {
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [fetchError, setFetchError] = useState('');

  // Form State
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  const fetchData = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [balRes, reqRes] = await Promise.allSettled([
        api.get('/leaves/balance'),
        api.get('/leaves/my-requests')
      ]);

      let validBal: any[] = [];
      let validReq: any[] = [];

      if (balRes.status === 'fulfilled') {
        validBal = balRes.value.data?.balances || [];
      } else {
        console.error('Balance fetch error:', balRes.reason);
      }

      if (reqRes.status === 'fulfilled') {
        validReq = reqRes.value.data?.requests || [];
      } else {
        console.error('Request fetch error:', reqRes.reason);
      }

      setBalances(validBal);
      setRequests(validReq);

      if (validBal.length > 0) {
        setLeaveTypeId(prev => prev || validBal[0].leaveType?._id || '');
      }

      if (balRes.status === 'rejected' && reqRes.status === 'rejected') {
        setFetchError('Failed to load leave data. Please verify your connection.');
      }
    } catch (err: any) {
      console.error('Error loading employee leaves:', err);
      setFetchError('Failed to load leave portal data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    
    const sUtc = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
    const eUtc = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
    const diff = eUtc - sUtc;
    if (diff < 0) return 0;
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculatedDays = calculateDays();

  const selectedBalanceObj = balances.find(b => b.leaveType?._id === leaveTypeId);
  const currentRemaining = selectedBalanceObj ? selectedBalanceObj.remaining : 0;
  const projectedRemaining = currentRemaining - calculatedDays;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg({ type: '', text: '' });

    const trimmedReason = reason.trim();
    if (!leaveTypeId || !startDate || !endDate || !trimmedReason) {
      setFormMsg({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    // STRICT VALIDATION: Reason takes ONLY words or numbers and spaces (NO special characters!)
    const reasonRegex = /^[a-zA-Z0-9\s]+$/;
    if (!reasonRegex.test(trimmedReason)) {
      setFormMsg({ 
        type: 'error', 
        text: 'Reason can only contain letters, numbers, and spaces. Special characters (like @, #, $, %, etc.) are not allowed.' 
      });
      return;
    }

    if (calculatedDays <= 0) {
      setFormMsg({ type: 'error', text: 'End date must be greater than or equal to start date.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/leaves/apply', {
        leaveTypeId,
        startDate,
        endDate,
        reason: trimmedReason
      });

      if (res.data.isInsufficient) {
        setFormMsg({ type: 'warning', text: res.data.balanceMessage });
      } else {
        setFormMsg({ type: 'success', text: 'Leave request submitted successfully! Status is Pending.' });
      }

      setStartDate('');
      setEndDate('');
      setReason('');
      fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.response?.data?.error || err.response?.data?.message || 'Failed to submit leave request.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to cancel this pending leave request?')) return;
    try {
      await api.patch(`/leaves/${requestId}/cancel`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to cancel request');
    }
  };

  const filteredRequests = statusFilter === 'All' 
    ? requests 
    : requests.filter(r => r.status === statusFilter);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Leave Management</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">View your allocated balances, submit leave applications, and track request status.</p>
      </div>

      {fetchError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-2xl flex items-center justify-between">
          <span>⚠️ {fetchError}</span>
          <button onClick={fetchData} className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700">
            Retry
          </button>
        </div>
      )}

      {/* 1. Leave Balance Cards */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">My Leave Balances</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : balances.length === 0 ? (
          <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-center text-xs text-gray-400">
            No leave balances found. Contact Admin to configure leave allocations.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {balances.map((b, idx) => (
              <div key={b._id || idx} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">{b.leaveType?.name || 'Leave'}</h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{b.leaveType?.description || 'Allocated Leave'}</p>
                  </div>
                  <span className="text-2xl font-black text-[#ea4c89] font-mono">
                    {b.remaining}
                    <span className="text-xs font-semibold text-gray-400 ml-0.5">/{b.totalAllocated}</span>
                  </span>
                </div>

                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-gradient-to-r from-[#ea4c89] to-[#a855f7] h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (b.remaining / (b.totalAllocated || 1)) * 100)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                  <span>Used: <strong className="text-gray-700 dark:text-gray-300">{b.used} days</strong></span>
                  <span>Remaining: <strong className="text-emerald-600 dark:text-emerald-400">{b.remaining} days</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Main Grid: Apply Form + Request History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Apply Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xs h-fit">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <span>📝</span> Apply for Leave
          </h2>

          {formMsg.text && (
            <div className={`mb-4 p-3 rounded-xl text-xs font-medium border ${
              formMsg.type === 'error' ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' :
              formMsg.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300' :
              'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            }`}>
              {formMsg.text}
            </div>
          )}

          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Leave Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ea4c89]/20"
                required
              >
                {balances.map(b => (
                  <option key={b.leaveType?._id || b._id} value={b.leaveType?._id}>
                    {b.leaveType?.name || 'Leave'} (Available: {b.remaining} days)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ea4c89]/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  End Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ea4c89]/20"
                  required
                />
              </div>
            </div>

            {calculatedDays > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Duration:</span>
                  <strong className="text-gray-900 dark:text-white font-mono">{calculatedDays} day(s)</strong>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Available Balance:</span>
                  <span className="font-mono">{currentRemaining} day(s)</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700 font-semibold">
                  <span>Remaining After Approval:</span>
                  <span className={`font-mono ${projectedRemaining < 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {projectedRemaining} day(s)
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Reason <span className="text-rose-500">*</span>
                <span className="text-[10px] text-gray-400 font-normal ml-1">(Only words & numbers allowed)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Enter reason using letters and numbers only..."
                className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ea4c89]/20"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-95 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Leave Application'}
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">My Request History</h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Track and manage your submitted leave requests.</p>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
              {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg transition ${
                    statusFilter === s ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-gray-400">Loading request history...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400">No leave requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-2">Leave Type</th>
                    <th className="pb-3 px-2">Dates</th>
                    <th className="pb-3 px-2">Days</th>
                    <th className="pb-3 px-2">Reason</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRequests.map((r, idx) => (
                    <tr key={r._id || idx} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-2 font-bold text-gray-900 dark:text-white">
                        {r.leaveType?.name || 'Leave'}
                      </td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-[11px]">
                        {new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 font-bold text-gray-800 dark:text-gray-200 font-mono">
                        {r.numberOfDays}d
                      </td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={r.reason}>
                        {r.reason}
                        {r.rejectionReason && (
                          <span className="block text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                            Rejection Reason: {r.rejectionReason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-3 px-2 text-right">
                        {r.status === 'Pending' && (
                          <button
                            onClick={() => handleCancel(r._id)}
                            className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1 rounded-lg transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default EmployeeLeaves;
