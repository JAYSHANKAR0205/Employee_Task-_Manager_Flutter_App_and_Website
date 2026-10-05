/**
 * @file ProtectedRoute.tsx
 * @description Client-Side Authentication Route Guard.
 * 
 * WORK OF THIS FILE:
 * - Checks the user's authentication status via `useAuth()`.
 * - Shows a full-screen loading spinner while session status is being fetched from `/auth/me`.
 * - Redirects unauthenticated visitors to `/login`, while granting access to protected routes (`<Outlet />`) for logged-in users.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Prevents unauthorized access to private dashboard features, guaranteeing that unauthenticated users cannot view sensitive data.
 */

import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading, checkAuth } = useAuth();

  useEffect(() => {
    if (!user && !loading) {
      checkAuth();
    }
  }, [user, loading, checkAuth]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#ea4c89]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Block users who have not completed their profile (like admin-created users)
  if (user.isProfileComplete === false) {
    return <Navigate to="/complete-profile" replace state={{ isFromAdminCreate: true }} />;
  }

  return <Outlet />;
}
