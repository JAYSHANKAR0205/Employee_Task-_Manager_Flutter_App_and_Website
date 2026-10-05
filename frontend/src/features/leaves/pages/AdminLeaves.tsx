import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import StatusBadge from '../components/StatusBadge';
import RejectionModal from '../components/RejectionModal';

const AdminLeaves: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'balances' | 'types'>('pending');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Filters for All Requests
  const [searchEmp, setSearchEmp] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRejectRequest, setSelectedRejectRequest] = useState<any>(null);

  // New Leave Type Form State
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newTypeAlloc, setNewTypeAlloc] = useState<number | string>(12);
  const [typeFormMsg, setTypeFormMsg] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const results = await Promise.allSettled([
        api.get('/admin/leaves/pending'),
        api.get('/admin/leaves'),
        api.get('/admin/leave-balances'),
        api.get('/admin/leave-types')
      ]);

      if (results[0].status === 'fulfilled') setPendingRequests(results[0].value.data.requests || []);
      if (results[1].status === 'fulfilled') setAllRequests(results[1].value.data.requests || []);
      if (results[2].status === 'fulfilled') setBalances(results[2].value.data.balances || []);
      if (results[3].status === 'fulfilled') setLeaveTypes(results[3].value.data.leaveTypes || []);

      const rejected = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
      if (rejected.length > 0) {
        const firstErr = rejected[0].reason;
        setFetchError(firstErr.response?.data?.error || firstErr.response?.data?.message || 'Some leave data could not be retrieved.');
      }
    } catch (err: any) {
      console.error('Error fetching admin leave data:', err);
      setFetchError('Failed to load admin leave portal data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleApprove = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to approve this leave request? Leave balance will be deducted immediately.')) return;
    try {
      await api.patch(`/admin/leaves/${requestId}/approve`);
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to approve leave request');
    }
  };

  const openRejectModal = (request: any) => {
    setSelectedRejectRequest(request);
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (requestId: string, rejectionReason: string) => {
    await api.patch(`/admin/leaves/${requestId}/reject`, { rejectionReason });
    fetchAdminData();
  };

  const handleCreateLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeFormMsg('');
    if (!newTypeName.trim()) return;
    try {
      await api.post('/admin/leave-types', {
        name: newTypeName.trim(),
        description: newTypeDesc.trim(),
        defaultAllocation: Number(newTypeAlloc)
      });
      setNewTypeName('');
      setNewTypeDesc('');
      setNewTypeAlloc(12);
      setTypeFormMsg('Leave type created successfully!');
      fetchAdminData();
    } catch (err: any) {
      setTypeFormMsg(err.response?.data?.error || err.response?.data?.message || 'Failed to create leave type');
    }
  };

  const handleToggleTypeActive = async (typeId: string, currentActive: boolean) => {
    try {
      await api.patch(`/admin/leave-types/${typeId}`, { isActive: !currentActive });
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to update leave type status');
    }
  };

  const filteredAllRequests = allRequests.filter(r => {
    const empName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''} ${r.employee?.email || ''}`.toLowerCase();
    const matchesSearch = empName.includes(searchEmp.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesType = typeFilter === 'All' || r.leaveType?._id === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Leave Management Portal</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Review pending requests, approve/reject applications, monitor balances, and configure leave types.</p>
      </div>

      {fetchError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-2xl flex items-center justify-between">
          <span>⚠️ {fetchError}</span>
          <button onClick={fetchAdminData} className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700">
            Retry
          </button>
        </div>
      )}

      {/* Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending Approvals</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">{pendingRequests.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Approved Requests</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {allRequests.filter(r => r.status === 'Approved').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rejected Requests</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
            {allRequests.filter(r => r.status === 'Rejected').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Configured Leave Types</div>
          <div className="text-2xl font-black text-[#ea4c89] mt-1 font-mono">{leaveTypes.length}</div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'pending' ? 'border-[#ea4c89] text-[#ea4c89]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Pending Queue ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'all' ? 'border-[#ea4c89] text-[#ea4c89]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          All Requests ({allRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'balances' ? 'border-[#ea4c89] text-[#ea4c89]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Employee Balances
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'types' ? 'border-[#ea4c89] text-[#ea4c89]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Leave Types Config
        </button>
      </div>

      {/* TAB 1: PENDING QUEUE */}
      {activeTab === 'pending' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Pending Leave Approval Queue</h2>
          
          {loading ? (
            <div className="text-center py-12 text-xs text-gray-400">Loading pending requests...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400">No pending leave requests at this time.</div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(r => (
                <div key={r._id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-800/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : 'Unknown Employee'}
                      </span>
                      {r.employee?.email && <span className="text-xs text-gray-500 dark:text-gray-400">({r.employee.email})</span>}
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 space-x-3">
                      <span>Leave Type: <strong className="text-gray-900 dark:text-white">{r.leaveType?.name || 'Leave'}</strong></span>
                      <span>Duration: <strong className="font-mono">{r.numberOfDays} day(s)</strong></span>
                      <span>Dates: <strong className="font-mono">{new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}</strong></span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic mt-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800">
                      "{r.reason}"
                    </p>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => handleApprove(r._id)}
                      className="flex-1 md:flex-none px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openRejectModal(r)}
                      className="flex-1 md:flex-none px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL REQUESTS */}
      {activeTab === 'all' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Search Employee</label>
              <input
                type="text"
                placeholder="Name or email..."
                value={searchEmp}
                onChange={(e) => setSearchEmp(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ea4c89]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ea4c89]/20"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Leave Type Filter</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ea4c89]/20"
              >
                <option value="All">All Leave Types</option>
                {leaveTypes.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-2">Employee</th>
                  <th className="pb-3 px-2">Leave Type</th>
                  <th className="pb-3 px-2">Dates</th>
                  <th className="pb-3 px-2">Days</th>
                  <th className="pb-3 px-2">Reason</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredAllRequests.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-2">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : 'Unknown Employee'}
                      </div>
                      <div className="text-[10px] text-gray-400">{r.employee?.email}</div>
                    </td>
                    <td className="py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">{r.leaveType?.name || 'Leave'}</td>
                    <td className="py-3 px-2 font-mono text-[11px] text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2 font-bold font-mono text-gray-800 dark:text-gray-200">{r.numberOfDays}d</td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={r.reason}>
                      {r.reason}
                      {r.rejectionReason && (
                        <span className="block text-[10px] text-rose-600 dark:text-rose-400 font-medium">Rejection Reason: {r.rejectionReason}</span>
                      )}
                    </td>
                    <td className="py-3 px-2"><StatusBadge status={r.status} /></td>
                    <td className="py-3 px-2 text-right">
                      {r.status === 'Pending' && (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleApprove(r._id)}
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2 py-1 rounded-lg transition cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(r)}
                            className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-lg transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EMPLOYEE BALANCES */}
      {activeTab === 'balances' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">All Employee Leave Balances</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-2">Employee</th>
                  <th className="pb-3 px-2">Leave Type</th>
                  <th className="pb-3 px-2">Total Allocated</th>
                  <th className="pb-3 px-2">Used</th>
                  <th className="pb-3 px-2">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {balances.map(b => (
                  <tr key={b._id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-2">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : 'Unknown'}
                      </div>
                      <div className="text-[10px] text-gray-400">{b.employee?.email}</div>
                    </td>
                    <td className="py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">{b.leaveType?.name || 'Leave'}</td>
                    <td className="py-3 px-2 font-mono font-semibold">{b.totalAllocated} days</td>
                    <td className="py-3 px-2 font-mono text-amber-700 dark:text-amber-400">{b.used} days</td>
                    <td className="py-3 px-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">{b.remaining} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LEAVE TYPES CONFIG */}
      {activeTab === 'types' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xs h-fit">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">Create Leave Type</h2>
            
            {typeFormMsg && (
              <div className="mb-4 p-3 rounded-xl text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200">
                {typeFormMsg}
              </div>
            )}

            <form onSubmit={handleCreateLeaveType} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Leave Type Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Maternity Leave"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ea4c89]/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short description..."
                  value={newTypeDesc}
                  onChange={(e) => setNewTypeDesc(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ea4c89]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Default Allocation (Days) *</label>
                <input
                  type="number"
                  min="0"
                  value={newTypeAlloc}
                  onChange={(e) => setNewTypeAlloc(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ea4c89]/20"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-[#ea4c89] to-[#a855f7] rounded-xl transition shadow-md cursor-pointer"
              >
                Create Leave Type
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xs">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">Configured Leave Types</h2>
            <div className="space-y-3">
              {leaveTypes.map(t => (
                <div key={t._id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/40">
                  <div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">{t.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.description || 'No description'}</div>
                    <div className="text-xs font-mono text-gray-700 dark:text-gray-300 mt-1">Default Allocation: <strong>{t.defaultAllocation} days/yr</strong></div>
                  </div>
                  <button
                    onClick={() => handleToggleTypeActive(t._id, t.isActive)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                      t.isActive ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {t.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onSubmit={handleRejectSubmit}
        request={selectedRejectRequest}
      />
    </div>
  );
};

export default AdminLeaves;
