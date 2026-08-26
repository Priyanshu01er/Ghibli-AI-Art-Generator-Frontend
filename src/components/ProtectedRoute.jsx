import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Gate for routes that need a signed-in user.
 *
 * No loading state, deliberately: `AuthProvider` restores the session in a `useState`
 * initialiser, so by the time this renders the answer is already known. If restoration
 * ever became asynchronous (a /me call, say) this would need a third "checking" branch,
 * because falling through to the redirect would log everyone out on refresh.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // `state.from` is what sends the user back where they were aiming after login.
    // `replace` keeps the guarded URL out of history, so the back button from /login
    // does not land on a route that immediately redirects here again.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
