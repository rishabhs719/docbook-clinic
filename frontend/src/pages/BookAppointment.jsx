import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar as CalendarIcon, Clock, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BookAppointment = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await axios.get(`${API}/available-slots`, {
        params: { date: dateStr },
      });
      setAvailableSlots(response.data.available_slots);
    } catch (error) {
      toast.error('Failed to load available slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedSlot) {
      toast.error('Please select a date and time slot');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const dateStr = selectedDate.toISOString().split('T')[0];

      await axios.post(
        `${API}/appointments`,
        {
          date: dateStr,
          time_slot: selectedSlot,
          notes,
        },
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success('Appointment booked successfully!');
      navigate('/patient/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-primary">Book Appointment</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8" data-testid="book-appointment-page">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white rounded-2xl p-8 shadow-float border border-border">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Calendar */}
              <div>
                <Label className="text-lg font-semibold mb-4 block">Select Date</Label>
                <div className="border border-border rounded-xl p-4" data-testid="calendar-container">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md"
                  />
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <Label className="text-lg font-semibold mb-4 block">Select Time Slot</Label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto" data-testid="time-slots-container">
                    {availableSlots.length === 0 ? (
                      <div className="col-span-2 text-center py-8 text-muted-foreground" data-testid="no-slots-message">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No available slots for this date</p>
                      </div>
                    ) : (
                      availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={selectedSlot === slot ? 'default' : 'outline'}
                          onClick={() => setSelectedSlot(slot)}
                          data-testid={`time-slot-${slot}`}
                          className={`rounded-xl h-12 transition-all ${
                            selectedSlot === slot
                              ? 'bg-primary text-white shadow-lg'
                              : 'border-border hover:border-primary hover:bg-primary/5'
                          }`}
                        >
                          {slot}
                        </Button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="mt-8">
              <Label htmlFor="notes" className="text-lg font-semibold mb-4 block">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any specific symptoms or concerns..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="notes-input"
                className="min-h-32 bg-slate-50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl"
              />
            </div>

            {/* Summary */}
            {selectedDate && selectedSlot && (
              <div className="mt-8 p-6 bg-primary/5 rounded-xl border border-primary/20" data-testid="appointment-summary">
                <h3 className="font-semibold text-foreground mb-3">Appointment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium text-foreground" data-testid="summary-date">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium text-foreground" data-testid="summary-time">{selectedSlot}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => navigate('/patient/dashboard')}
                data-testid="cancel-btn"
                className="flex-1 rounded-full h-12 border-border hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBookAppointment}
                disabled={!selectedDate || !selectedSlot || loading}
                data-testid="confirm-booking-btn"
                className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-full h-12 shadow-lg hover:shadow-primary/20 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
