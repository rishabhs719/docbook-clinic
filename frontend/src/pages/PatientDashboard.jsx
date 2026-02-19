import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, FileText, User, LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const config = {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      };

      const [userRes, appointmentsRes, recordsRes] = await Promise.all([
        axios.get(`${API}/auth/me`, config),
        axios.get(`${API}/appointments`, config),
        axios.get(`${API}/medical-records`, config),
      ]);

      setUser(userRes.data);
      setAppointments(appointmentsRes.data);
      setMedicalRecords(recordsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      localStorage.removeItem('access_token');
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-chart-3 text-white';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      case 'cancelled':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter((a) => a.status === 'scheduled');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Patient Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="logout-btn"
              className="rounded-full"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8" data-testid="patient-dashboard">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card
            className="bg-white rounded-xl p-6 border border-slate-200/60 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => navigate('/book-appointment')}
            data-testid="book-appointment-card"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Book Appointment</h3>
                <p className="text-sm text-muted-foreground">Schedule a visit</p>
              </div>
            </div>
          </Card>

          <Card
            className="bg-white rounded-xl p-6 border border-slate-200/60 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => navigate('/medical-records')}
            data-testid="medical-records-card"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Medical Records</h3>
                <p className="text-sm text-muted-foreground">View history</p>
              </div>
            </div>
          </Card>

          <Card
            className="bg-white rounded-xl p-6 border border-slate-200/60 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => navigate('/profile')}
            data-testid="profile-card"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-chart-4/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-chart-4" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">My Profile</h3>
                <p className="text-sm text-muted-foreground">Update info</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Appointments */}
          <Card className="bg-white rounded-xl p-6 border border-slate-200/60" data-testid="upcoming-appointments-section">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Upcoming Appointments</h2>
              <Button
                size="sm"
                onClick={() => navigate('/book-appointment')}
                data-testid="add-appointment-btn"
                className="bg-primary hover:bg-primary/90 text-white rounded-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-appointments-message">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.appointment_id}
                    className="border border-border rounded-xl p-4 hover:shadow-md transition-all"
                    data-testid={`appointment-${appointment.appointment_id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-foreground">{appointment.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.time_slot}</span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(appointment.status)} data-testid="appointment-status">
                        {appointment.status}
                      </Badge>
                    </div>
                    {appointment.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{appointment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Medical Records Summary */}
          <Card className="bg-white rounded-xl p-6 border border-slate-200/60" data-testid="medical-records-section">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Recent Medical Records</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/medical-records')}
                data-testid="view-all-records-btn"
                className="text-primary hover:bg-primary/5"
              >
                View All
              </Button>
            </div>

            {medicalRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-records-message">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No medical records yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {medicalRecords.slice(0, 3).map((record) => (
                  <div
                    key={record.record_id}
                    className="border border-border rounded-xl p-4 hover:shadow-md transition-all"
                    data-testid={`record-${record.record_id}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-accent" />
                      <span className="font-semibold text-foreground">{record.visit_date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Diagnosis:</strong> {record.diagnosis}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Prescription:</strong> {record.prescription}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
