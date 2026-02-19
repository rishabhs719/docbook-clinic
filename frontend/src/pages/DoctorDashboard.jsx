import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, FileText, Users, LogOut, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [recordForm, setRecordForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    diagnosis: '',
    prescription: '',
    notes: '',
  });

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

      const [userRes, appointmentsRes, patientsRes] = await Promise.all([
        axios.get(`${API}/auth/me`, config),
        axios.get(`${API}/appointments`, config),
        axios.get(`${API}/patients`, config),
      ]);

      setUser(userRes.data);
      setAppointments(appointmentsRes.data);
      setPatients(patientsRes.data);
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

  const handleCreateRecord = async () => {
    if (!selectedPatient || !recordForm.diagnosis || !recordForm.prescription) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API}/medical-records`,
        {
          patient_id: selectedPatient.user_id,
          ...recordForm,
        },
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success('Medical record created successfully');
      setShowRecordDialog(false);
      setRecordForm({
        visit_date: new Date().toISOString().split('T')[0],
        diagnosis: '',
        prescription: '',
        notes: '',
      });
      setSelectedPatient(null);
    } catch (error) {
      toast.error('Failed to create medical record');
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

  const todayAppointments = appointments.filter((a) => {
    const today = new Date().toISOString().split('T')[0];
    return a.date === today && a.status === 'scheduled';
  });

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Doctor Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">Doctor</p>
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

      <div className="container mx-auto px-4 py-8" data-testid="doctor-dashboard">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white rounded-xl p-6 border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Today's Appointments</p>
                <p className="text-3xl font-bold text-primary" data-testid="today-appointments-count">
                  {todayAppointments.length}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-primary/20" />
            </div>
          </Card>

          <Card className="bg-white rounded-xl p-6 border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Patients</p>
                <p className="text-3xl font-bold text-accent" data-testid="total-patients-count">
                  {patients.length}
                </p>
              </div>
              <Users className="w-10 h-10 text-accent/20" />
            </div>
          </Card>

          <Card className="bg-white rounded-xl p-6 border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Appointments</p>
                <p className="text-3xl font-bold text-chart-3" data-testid="total-appointments-count">
                  {appointments.length}
                </p>
              </div>
              <Clock className="w-10 h-10 text-chart-3/20" />
            </div>
          </Card>

          <Card className="bg-white rounded-xl p-6 border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Scheduled</p>
                <p className="text-3xl font-bold text-chart-4" data-testid="scheduled-count">
                  {appointments.filter((a) => a.status === 'scheduled').length}
                </p>
              </div>
              <FileText className="w-10 h-10 text-chart-4/20" />
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <Card className="bg-white rounded-xl p-6 border border-slate-200/60" data-testid="today-schedule-section">
            <h2 className="text-xl font-bold text-foreground mb-6">Today's Schedule</h2>

            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-today-appointments">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No appointments for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayAppointments.map((appointment) => (
                  <div
                    key={appointment.appointment_id}
                    className="border border-border rounded-xl p-4 hover:shadow-md transition-all"
                    data-testid={`today-appointment-${appointment.appointment_id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground mb-1">{appointment.patient_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.time_slot}</span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                    </div>
                    {appointment.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{appointment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Patient Database */}
          <Card className="bg-white rounded-xl p-6 border border-slate-200/60" data-testid="patient-database-section">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Patient Database</h2>
              <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    data-testid="add-record-btn"
                    className="bg-primary hover:bg-primary/90 text-white rounded-full"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Record
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="create-record-dialog">
                  <DialogHeader>
                    <DialogTitle>Create Medical Record</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Patient</Label>
                      <Input
                        value={selectedPatient?.name || ''}
                        placeholder="Select from patient list"
                        disabled
                        data-testid="record-patient-name"
                      />
                    </div>
                    <div>
                      <Label>Visit Date</Label>
                      <Input
                        type="date"
                        value={recordForm.visit_date}
                        onChange={(e) =>
                          setRecordForm({ ...recordForm, visit_date: e.target.value })
                        }
                        data-testid="record-visit-date"
                      />
                    </div>
                    <div>
                      <Label>Diagnosis *</Label>
                      <Textarea
                        value={recordForm.diagnosis}
                        onChange={(e) =>
                          setRecordForm({ ...recordForm, diagnosis: e.target.value })
                        }
                        placeholder="Enter diagnosis"
                        data-testid="record-diagnosis"
                      />
                    </div>
                    <div>
                      <Label>Prescription *</Label>
                      <Textarea
                        value={recordForm.prescription}
                        onChange={(e) =>
                          setRecordForm({ ...recordForm, prescription: e.target.value })
                        }
                        placeholder="Enter prescription"
                        data-testid="record-prescription"
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={recordForm.notes}
                        onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                        placeholder="Additional notes"
                        data-testid="record-notes"
                      />
                    </div>
                    <Button
                      onClick={handleCreateRecord}
                      data-testid="submit-record-btn"
                      className="w-full bg-primary hover:bg-primary/90 rounded-full"
                    >
                      Create Record
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="patient-search-input"
                className="pl-10 bg-slate-50 rounded-xl"
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="no-patients-message">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No patients found</p>
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <div
                    key={patient.user_id}
                    className="border border-border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setShowRecordDialog(true);
                    }}
                    data-testid={`patient-${patient.user_id}`}
                  >
                    <p className="font-semibold text-foreground">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">{patient.email}</p>
                    {patient.phone && (
                      <p className="text-sm text-muted-foreground">{patient.phone}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
