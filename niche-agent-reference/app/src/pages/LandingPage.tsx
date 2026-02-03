import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Brain, 
  Clock, 
  Shield, 
  Stethoscope, 
  Users, 
  ArrowRight,
  Activity,
  CheckCircle,
  MessageSquare,
  Key
} from 'lucide-react';
import ApiKeyModal from '@/components/ApiKeyModal';

export default function LandingPage() {
  const navigate = useNavigate();
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Triage',
      description: 'Advanced AI analyzes symptoms and provides instant urgency assessment with 94% clinical accuracy.',
    },
    {
      icon: Clock,
      title: 'Reduced Wait Times',
      description: 'Smart queue management prioritizes patients based on urgency, reducing average wait times by 60%.',
    },
    {
      icon: Stethoscope,
      title: 'Doctor Dashboard',
      description: 'Comprehensive diagnostic assistant with AI insights, patient history, and treatment recommendations.',
    },
    {
      icon: Shield,
      title: 'HIPAA Compliant',
      description: 'Enterprise-grade security with end-to-end encryption and full healthcare compliance.',
    },
  ];

  const howItWorks = [
    {
      step: '01',
      title: 'Describe Symptoms',
      description: 'Patients answer a clinically-validated AI questionnaire in under 3 minutes.',
    },
    {
      step: '02',
      title: 'AI Analysis',
      description: 'Our AI analyzes symptoms, medical history, and provides urgency assessment.',
    },
    {
      step: '03',
      title: 'Smart Routing',
      description: 'Patients are intelligently routed to the right care level based on urgency.',
    },
    {
      step: '04',
      title: 'Doctor Review',
      description: 'Doctors receive AI-assisted insights for faster, more accurate diagnoses.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#EAF3FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1E6FD9] flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-[#0F1A2A]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                HealthAI
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setApiKeyModalOpen(true)}
                className="text-[#5A6B7F] hover:text-[#0F1A2A]"
              >
                <Key className="w-4 h-4 mr-2" />
                API Key
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                className="text-[#5A6B7F] hover:text-[#0F1A2A]"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => navigate('/login')}
                className="bg-[#1E6FD9] hover:bg-[#1a5fc0] text-white rounded-full"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#EAF3FB] rounded-full mb-6">
                <Activity className="w-4 h-4 text-[#1E6FD9]" />
                <span className="text-sm font-medium text-[#1E6FD9]">Now Available in Australia</span>
              </div>
              <h1 
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0F1A2A] leading-tight mb-6"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                AI-Powered Healthcare for{' '}
                <span className="text-[#1E6FD9]">Doctors</span> &{' '}
                <span className="text-[#1E6FD9]">Patients</span>
              </h1>
              <p className="text-lg text-[#5A6B7F] mb-8 max-w-lg">
                Reduce wait times, improve diagnostic accuracy, and deliver better patient outcomes 
                with clinically-validated AI technology.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  onClick={() => navigate('/login', { state: { role: 'patient' } })}
                  className="bg-[#1E6FD9] hover:bg-[#1a5fc0] text-white rounded-full px-8"
                >
                  <Users className="w-5 h-5 mr-2" />
                  I'm a Patient
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/login', { state: { role: 'doctor' } })}
                  className="border-[#1E6FD9] text-[#1E6FD9] hover:bg-[#EAF3FB] rounded-full px-8"
                >
                  <Stethoscope className="w-5 h-5 mr-2" />
                  I'm a Doctor
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-[#5A6B7F]">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>94% Clinical Accuracy</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>HIPAA Compliant</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1E6FD9]/20 to-[#0F1A2A]/20 rounded-3xl blur-3xl" />
              <div className="relative bg-white rounded-3xl shadow-2xl p-6 border border-[#EAF3FB]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#EAF3FB] flex items-center justify-center">
                    <Brain className="w-5 h-5 text-[#1E6FD9]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#0F1A2A]">AI Triage Assistant</div>
                    <div className="text-sm text-[#5A6B7F]">Analyzing symptoms...</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-[#F6F8FA] rounded-xl p-4">
                    <div className="text-sm font-medium text-[#0F1A2A] mb-1">Patient Symptoms</div>
                    <div className="flex flex-wrap gap-2">
                      {['Headache', 'Fever', 'Fatigue'].map((symptom) => (
                        <span key={symptom} className="px-3 py-1 bg-white rounded-full text-sm text-[#5A6B7F] border border-[#EAF3FB]">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#FFF3E0] rounded-xl p-4 border border-[#FFE0B2]">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-700">Urgency Assessment</span>
                    </div>
                    <div className="text-sm text-orange-800">
                      Medium Priority - Schedule GP appointment within 48 hours
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#E8F5E9] rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">94%</div>
                      <div className="text-xs text-green-700">AI Confidence</div>
                    </div>
                    <div className="flex-1 bg-[#E3F2FD] rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">&lt;3min</div>
                      <div className="text-xs text-blue-700">Assessment Time</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 
              className="text-3xl sm:text-4xl font-bold text-[#0F1A2A] mb-4"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Everything You Need for Better Healthcare
            </h2>
            <p className="text-lg text-[#5A6B7F] max-w-2xl mx-auto">
              From AI-powered triage to comprehensive diagnostic tools, HealthAI streamlines 
              the entire healthcare journey.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="group">
                  <div className="w-12 h-12 rounded-xl bg-[#EAF3FB] flex items-center justify-center mb-4 group-hover:bg-[#1E6FD9] transition-colors">
                    <Icon className="w-6 h-6 text-[#1E6FD9] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F1A2A] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#5A6B7F] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-[#F6F8FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 
              className="text-3xl sm:text-4xl font-bold text-[#0F1A2A] mb-4"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              How HealthAI Works
            </h2>
            <p className="text-lg text-[#5A6B7F]">
              Streamlined healthcare from symptom to treatment
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                <div className="text-5xl font-bold text-[#EAF3FB] mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-[#0F1A2A] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[#5A6B7F] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0F1A2A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 
            className="text-3xl sm:text-4xl font-bold text-white mb-6"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Ready to Transform Healthcare?
          </h2>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
            Join leading hospitals and clinics across Australia using HealthAI to deliver 
            better patient outcomes with less wait time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/login', { state: { role: 'patient' } })}
              className="bg-[#1E6FD9] hover:bg-[#1a5fc0] text-white rounded-full px-8"
            >
              Try as Patient
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/login', { state: { role: 'doctor' } })}
              className="border-white text-white hover:bg-white/10 rounded-full px-8"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Request Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-[#EAF3FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1E6FD9] flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-[#0F1A2A]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                HealthAI
              </span>
            </div>
            <div className="text-sm text-[#5A6B7F]">
              © 2026 HealthAI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen} />
    </div>
  );
}
