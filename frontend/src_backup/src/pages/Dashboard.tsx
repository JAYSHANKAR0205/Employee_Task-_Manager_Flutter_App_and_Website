import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Phone, Calendar, Users, GraduationCap, FileText, Camera } from 'lucide-react';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  qualification: string;
  bio?: string;
  isVerified: boolean;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [error, setError] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const userData = response.data;
        setUser(userData);
        
        // Retrieve profile picture from local storage using email as key
        const savedPic = localStorage.getItem(`profile_pic_${userData.email}`);
        if (savedPic) {
          setProfilePic(savedPic);
        }

      } catch (err) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getInitials = () => {
    if (!user) return '';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  if (!user && !error) return (
    <div className="flex items-center justify-center w-full min-h-screen bg-gray-100 dark:bg-mint">
      <div className="w-12 h-12 border-4 border-forest dark:border-sand border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-gray-100 dark:bg-mint flex items-center justify-center md:p-8 font-sans">
      {/* Responsive Dashboard Card */}
      <div className="relative w-full h-screen md:h-auto md:min-h-[600px] md:max-w-3xl bg-white dark:bg-forest md:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col transition-colors duration-500">
        
        {/* Header Banner */}
        <div className="bg-forest dark:bg-forest/50 h-48 md:h-56 flex flex-col items-center justify-center rounded-br-[70px] shrink-0 z-10 relative pt-4 shadow-md transition-colors duration-500">
          
          {/* Profile Picture Avatar */}
          <div className="w-24 h-24 rounded-full border-4 border-white dark:border-sand bg-gray-200 dark:bg-mint flex items-center justify-center overflow-hidden shadow-lg mb-3">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-forest dark:text-forest tracking-tighter">{getInitials()}</span>
            )}
          </div>
          
          <h2 className="text-white dark:text-sand text-xl md:text-2xl font-bold tracking-wide">
            {user?.firstName} {user?.lastName}
          </h2>
          <span className="text-white/80 dark:text-sand/80 text-sm mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Verified Account
          </span>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-6 md:px-12 pt-8 pb-10 relative bg-white dark:bg-forest custom-scrollbar transition-colors duration-500">
          <div className="flex flex-col w-full max-w-2xl mx-auto gap-4">
            <h3 className="text-sm font-bold text-gray-400 dark:text-sand/60 uppercase tracking-wider mb-2">Profile Information</h3>
            
            <div className="group flex items-center py-4 px-4 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-forest/5 dark:hover:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-forest/10 dark:bg-sand/10 flex items-center justify-center mr-4 group-hover:bg-forest/20 transition-colors">
                <Mail className="w-5 h-5 text-forest dark:text-sand" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 dark:text-sand/70 font-medium">Email Address</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{user?.email}</span>
              </div>
            </div>

            <div className="group flex items-center py-4 px-4 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-forest/5 dark:hover:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-forest/10 dark:bg-sand/10 flex items-center justify-center mr-4 group-hover:bg-forest/20 transition-colors">
                <Phone className="w-5 h-5 text-forest dark:text-sand" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 dark:text-sand/70 font-medium">Phone Number</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{user?.phoneNumber}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group flex items-center py-4 px-4 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-forest/5 dark:hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-forest/10 dark:bg-sand/10 flex items-center justify-center mr-4 group-hover:bg-forest/20 transition-colors">
                  <Calendar className="w-5 h-5 text-forest dark:text-sand" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-sand/70 font-medium">Date of Birth</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {new Date(user?.dateOfBirth || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="group flex items-center py-4 px-4 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-forest/5 dark:hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-forest/10 dark:bg-sand/10 flex items-center justify-center mr-4 group-hover:bg-forest/20 transition-colors">
                  <Users className="w-5 h-5 text-forest dark:text-sand" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-sand/70 font-medium">Gender</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{user?.gender}</span>
                </div>
              </div>
            </div>

            <div className="group flex items-center py-4 px-4 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-forest/5 dark:hover:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-forest/10 dark:bg-sand/10 flex items-center justify-center mr-4 group-hover:bg-forest/20 transition-colors">
                <GraduationCap className="w-5 h-5 text-forest dark:text-sand" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 dark:text-sand/70 font-medium">Qualification</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{user?.qualification || 'Not Specified'}</span>
              </div>
            </div>

            {user?.bio && (
              <div className="group flex items-start py-4 px-4 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-forest/5 dark:hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-forest/10 dark:bg-sand/10 flex items-center justify-center mr-4 shrink-0 group-hover:bg-forest/20 transition-colors">
                  <FileText className="w-5 h-5 text-forest dark:text-sand" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-sand/70 font-medium mb-1">Bio</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white/90 leading-relaxed max-w-lg">{user.bio}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 dark:border-white/10 flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
            <button 
              onClick={handleLogout}
              className="flex-1 py-3.5 bg-white dark:bg-transparent border-2 border-forest dark:border-sand rounded-xl text-forest dark:text-sand text-sm font-bold transition-all hover:bg-forest hover:text-white dark:hover:bg-sand dark:hover:text-forest focus:outline-none focus:ring-4 focus:ring-forest/20"
            >
              Sign out
            </button>
            <button 
              onClick={() => navigate('/users')}
              className="flex-1 py-3.5 bg-forest dark:bg-sand text-white dark:text-forest rounded-xl text-sm font-bold transition-all hover:bg-forest/90 dark:hover:bg-sand/90 hover:shadow-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-forest/20"
            >
              <Users className="w-4 h-4" />
              View All Users
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
