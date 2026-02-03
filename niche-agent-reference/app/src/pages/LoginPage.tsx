import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Users, Stethoscope, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<'patient' | 'doctor'>(
    location.state?.role || 'patient'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password, activeTab);
      if (success) {
        toast.success(`Welcome back!`);
        navigate(activeTab === 'doctor' ? '/doctor' : '/patient');
      } else {
        toast.error('Invalid credentials. Try demo accounts.');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    if (activeTab === 'patient') {
      setEmail('patient@demo.com');
    } else {
      setEmail('doctor@demo.com');
    }
    setPassword('demo123');
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#EAF3FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-[#5A6B7F] hover:text-[#0F1A2A] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Home</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1E6FD9] flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-[#0F1A2A]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                HealthAI
              </span>
            </div>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-[#EAF3FB] p-8">
            <div className="text-center mb-8">
              <h1 
                className="text-2xl font-bold text-[#0F1A2A] mb-2"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Welcome Back
              </h1>
              <p className="text-sm text-[#5A6B7F]">
                Sign in to access your HealthAI account
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'patient' | 'doctor')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="patient" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Patient
                </TabsTrigger>
                <TabsTrigger value="doctor" className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Doctor
                </TabsTrigger>
              </TabsList>

              <TabsContent value="patient">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient-email">Email</Label>
                    <Input
                      id="patient-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patient-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="patient-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="rounded-xl pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6B7F]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-[#1E6FD9] hover:bg-[#1a5fc0] text-white rounded-xl"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign in as Patient'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="doctor">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="doctor-email">Email</Label>
                    <Input
                      id="doctor-email"
                      type="email"
                      placeholder="doctor@hospital.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doctor-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="doctor-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="rounded-xl pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6B7F]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-[#1E6FD9] hover:bg-[#1a5fc0] text-white rounded-xl"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign in as Doctor'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t border-[#EAF3FB]">
              <button
                onClick={fillDemoCredentials}
                className="w-full text-sm text-[#1E6FD9] hover:underline"
              >
                Use demo credentials
              </button>
              <p className="text-xs text-[#5A6B7F] text-center mt-2">
                Patient: patient@demo.com | Doctor: doctor@demo.com
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
