import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MedicalRecords = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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

      const [userRes, recordsRes] = await Promise.all([
        axios.get(`${API}/auth/me`, config),
        axios.get(`${API}/medical-records`, config),
      ]);

      setUser(userRes.data);
      setRecords(recordsRes.data);
    } catch (error) {
      toast.error('Failed to load medical records');
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
            onClick={() => navigate(user?.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard')}
            data-testid="back-btn"
            className="rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-primary">Medical Records</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8" data-testid="medical-records-page">
        <div className="max-w-4xl mx-auto">
          {records.length === 0 ? (
            <Card className="bg-white rounded-2xl p-12 text-center shadow-float border border-border" data-testid="no-records-card">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Medical Records</h2>
              <p className="text-muted-foreground">Your medical records will appear here once created by your doctor.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {records.map((record) => (
                <Card
                  key={record.record_id}
                  className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-float transition-all border border-border"
                  data-testid={`record-${record.record_id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="text-lg font-semibold text-foreground" data-testid="record-date">
                          {new Date(record.visit_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Patient: {record.patient_name}</p>
                    </div>
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-accent" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border-l-4 border-primary pl-4">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-1">Diagnosis</h3>
                      <p className="text-foreground" data-testid="record-diagnosis">{record.diagnosis}</p>
                    </div>

                    <div className="border-l-4 border-accent pl-4">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-1">Prescription</h3>
                      <p className="text-foreground" data-testid="record-prescription">{record.prescription}</p>
                    </div>

                    {record.notes && (
                      <div className="border-l-4 border-chart-3 pl-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-1">Additional Notes</h3>
                        <p className="text-foreground" data-testid="record-notes">{record.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Record ID: {record.record_id} | Created:{' '}
                      {new Date(record.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalRecords;
