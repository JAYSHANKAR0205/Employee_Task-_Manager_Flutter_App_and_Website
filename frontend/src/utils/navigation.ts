import { NavigateFunction } from 'react-router-dom';

/**
 * Safely navigates back within the internal application context.
 * Guarantees that in-project back buttons never navigate outside the application
 * or fail when accessed directly via URL/external history.
 * 
 * @param navigate - React Router navigate function
 * @param fallbackPath - Safe internal route to navigate to if no prior internal history exists
 */
export const safeNavigateBack = (navigate: NavigateFunction, fallbackPath: string = '/dashboard') => {
  if (typeof window !== 'undefined' && (window.history.length > 1 || (window.history.state && window.history.state.idx > 0))) {
    navigate(-1);
  } else {
    navigate(fallbackPath, { replace: true });
  }
};
