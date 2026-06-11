import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141414] text-white">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-[#1a1a1a] px-6 py-5 shadow-2xl">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#e50914]" />
          <p className="text-sm text-white/70">Loading Cinemable...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;

