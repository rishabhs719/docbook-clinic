import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, User, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PatientProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/patient/dashboard')}
            data-testid="back-btn"
            className="rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-primary">My Profile</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8" data-testid="profile-page">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white rounded-2xl p-8 shadow-float border border-border">
            {/* Profile Header */}
            <div className="text-center mb-8">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold text-foreground mb-1" data-testid="profile-name">
                {user?.name}
              </h2>
              <p className="text-muted-foreground capitalize">{user?.role}</p>
            </div>

            {/* Profile Details */}
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Email Address</p>
                  <p className="text-foreground font-medium" data-testid="profile-email">
                    {user?.email}
                  </p>
                </div>
              </div>

              {user?.phone && (
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                    <p className="text-foreground font-medium" data-testid="profile-phone">
                      {user.phone}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-chart-3/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-chart-3" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Account Type</p>
                  <p className="text-foreground font-medium capitalize" data-testid="profile-role">
                    {user?.role}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-chart-4/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-chart-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                  <p className="text-foreground font-medium" data-testid="profile-created">
                    {new Date(user?.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
