import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, CheckCircle2, Phone, Mail, GraduationCap, User as UserIcon } from 'lucide-react';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  dateOfBirth: string;
  gender: string;
  qualification: string;
  isVerified: boolean;
  createdAt: string;
}

const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };
        const { data } = await axios.get('http://localhost:5000/api/users/all', config);
        setUsers(data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Failed to fetch users. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  const filteredUsers = users.filter(user => 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.qualification?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b101e] p-4 sm:p-8 font-sans relative overflow-hidden">
      {/* Background glow effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none translate-y-1/2" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 bg-[#1f2937] border border-gray-700 rounded-lg text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Enterprise Directory</h1>
              <p className="text-sm text-gray-400 mt-1">Manage and view all registered system users</p>
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1f2937] border border-gray-700 py-2.5 pl-10 pr-4 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Data Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden"
        >
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1f2937]/50 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-5">User</th>
                  <th className="px-6 py-5">Contact Info</th>
                  <th className="px-6 py-5">Demographics</th>
                  <th className="px-6 py-5">Qualification</th>
                  <th className="px-6 py-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      Loading directory data...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      No users found matching "{searchTerm}"
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      key={user._id} 
                      className="hover:bg-[#1f2937]/30 transition-colors group"
                    >
                      {/* User Cell */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold uppercase shrink-0 group-hover:scale-105 transition-transform">
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-200">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info Cell */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                            {user.countryCode} {user.phoneNumber}
                          </div>
                        </div>
                      </td>

                      {/* Demographics Cell */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-300 capitalize mb-1">{user.gender}</p>
                        <p className="text-xs text-gray-500">
                          {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'N/A'}
                        </p>
                      </td>

                      {/* Qualification Cell */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800/50 border border-gray-700 text-xs font-medium text-gray-300">
                          <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                          {user.qualification || 'None'}
                        </div>
                      </td>

                      {/* Status Cell */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UserList;