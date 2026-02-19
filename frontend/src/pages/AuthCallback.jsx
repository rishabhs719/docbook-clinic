import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        toast.error('Invalid authentication response');
        navigate('/login');
        return;
      }

      try {
        const response = await axios.post(
          `${API}/auth/google/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );

        const user = response.data.user;
        toast.success('Login successful!');

        const dashboardRoute = user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
        navigate(dashboardRoute, { state: { user }, replace: true });
      } catch (error) {
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    };

    processSession();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
