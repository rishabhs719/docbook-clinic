import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, FileText, Shield, Heart, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-8 h-8 text-primary" strokeWidth={1.5} />
            <span className="text-2xl font-bold text-primary">DocBook Clinic</span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              data-testid="header-login-btn"
              className="rounded-full"
            >
              Login
            </Button>
            <Button
              onClick={() => navigate('/register')}
              data-testid="header-register-btn"
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 shadow-lg hover:shadow-primary/20 transition-all"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Your Health,
                <br />
                <span className="text-primary">Our Priority</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Book appointments online, manage medical records, and receive automated reminders. 
                Experience healthcare management made simple and secure.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/register')}
                  data-testid="hero-book-appointment-btn"
                  className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-6 text-base shadow-lg hover:shadow-primary/20 transition-all"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Appointment
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/login')}
                  data-testid="hero-login-btn"
                  className="rounded-full px-8 py-6 text-base border-primary/20 hover:bg-primary/5 transition-all"
                >
                  Patient Login
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-float">
                <img
                  src="https://images.unsplash.com/photo-1620928269189-dc4ee9d981c0?w=800&h=600&fit=crop"
                  alt="Professional doctor"
                  className="w-full h-auto"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-float border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">500+</div>
                    <div className="text-sm text-muted-foreground">Happy Patients</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-semibold mb-4 uppercase tracking-wider">
              Features
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Comprehensive Care Management
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need for modern healthcare in one platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white rounded-2xl p-8 border border-border shadow-soft hover:shadow-float transition-all duration-500 hover:-translate-y-1" data-testid="feature-appointments-card">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Calendar className="w-7 h-7 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Online Booking</h3>
              <p className="text-muted-foreground leading-relaxed">
                Schedule appointments 24/7 with our easy-to-use calendar. Select available time slots and receive instant confirmation.
              </p>
            </Card>

            <Card className="bg-white rounded-2xl p-8 border border-border shadow-soft hover:shadow-float transition-all duration-500 hover:-translate-y-1" data-testid="feature-reminders-card">
              <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-accent" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Smart Reminders</h3>
              <p className="text-muted-foreground leading-relaxed">
                Never miss an appointment with automated email and SMS reminders sent 24 hours and 2 hours before your visit.
              </p>
            </Card>

            <Card className="bg-white rounded-2xl p-8 border border-border shadow-soft hover:shadow-float transition-all duration-500 hover:-translate-y-1" data-testid="feature-records-card">
              <div className="w-14 h-14 bg-chart-3/10 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-7 h-7 text-chart-3" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Medical Records</h3>
              <p className="text-muted-foreground leading-relaxed">
                Access your complete medical history, prescriptions, and visit notes securely from anywhere, anytime.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Simple Process, Quality Care
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started in three easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Create Account</h3>
              <p className="text-muted-foreground">
                Sign up with email or Google in seconds
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Book Appointment</h3>
              <p className="text-muted-foreground">
                Choose your preferred date and time slot
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Receive Care</h3>
              <p className="text-muted-foreground">
                Get reminders and access your medical records
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <Shield className="w-16 h-16 mx-auto mb-6 opacity-90" strokeWidth={1.5} />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Experience Better Healthcare?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join hundreds of patients who trust us with their health. Secure, convenient, and always available.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/register')}
            data-testid="cta-get-started-btn"
            className="bg-white text-primary hover:bg-white/90 rounded-full px-8 py-6 text-base shadow-lg transition-all font-semibold"
          >
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Stethoscope className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xl font-bold">DocBook Clinic</span>
          </div>
          <p className="text-white/70 mb-4">Professional healthcare management platform</p>
          <p className="text-sm text-white/50">© 2026 DocBook Clinic. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
