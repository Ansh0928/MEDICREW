import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  LogOut, 
  User, 
  Clock,
  AlertCircle,
  CheckCircle,
  Users,
  FileText,
  Stethoscope,
  Sparkles,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { generateDoctorInsights, generateTreatmentPlan } from '@/services/aiService';
import { 
  getAllSymptomChecks, 
  getQueue, 
  updateSymptomCheckStatus,
  addDoctorNote,
  getStatistics 
} from '@/services/dataService';
import type { SymptomCheck } from '@/types';
import { toast } from 'sonner';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedCase, setSelectedCase] = useState<SymptomCheck | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalChecksToday: 0,
    pendingReviews: 0,
    inReview: 0,
    completedToday: 0,
    averageWaitTime: 0,
    criticalCases: 0,
  });

  const queue = getQueue();
  const allChecks = getAllSymptomChecks();

  useEffect(() => {
    setStats(getStatistics());
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSelectCase = async (check: SymptomCheck) => {
    setSelectedCase(check);
    setAiInsights(null);
    setDiagnosis('');
    setTreatment('');
    setNotes('');
    
    // Update status to in-review
    updateSymptomCheckStatus(check.id, 'in-review', user?.id);
    
    // Generate AI insights
    setIsGeneratingInsights(true);
    try {
      const insights = await generateDoctorInsights(check);
      setAiInsights(insights);
      
      // Auto-generate treatment plan suggestion
      const treatmentPlan = await generateTreatmentPlan(
        insights.differentialDiagnosis[0],
        check.symptoms
      );
      setTreatment(treatmentPlan.medications.join('\n'));
    } catch (error) {
      toast.error('Failed to generate AI insights');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleSubmitDiagnosis = () => {
    if (!selectedCase || !diagnosis) {
      toast.error('Please provide a diagnosis');
      return;
    }

    setIsSubmitting(true);
    try {
      addDoctorNote({
        symptomCheckId: selectedCase.id,
        doctorId: user?.id || '',
        doctorName: user?.name || '',
        diagnosis,
        treatment,
        notes,
      });
      
      toast.success('Diagnosis submitted successfully');
      setSelectedCase(null);
      setAiInsights(null);
      setStats(getStatistics());
    } catch (error) {
      toast.error('Failed to submit diagnosis');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getUrgencyDot = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Header */}
      <header className="bg-white border-b border-[#EAF3FB] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1E6FD9] flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-[#0F1A2A]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                HealthAI
              </span>
              <Badge variant="secondary" className="ml-2 bg-[#EAF3FB] text-[#1E6FD9]">
                Doctor Portal
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EAF3FB] rounded-full">
                <Stethoscope className="w-4 h-4 text-[#1E6FD9]" />
                <span className="text-sm font-medium text-[#0F1A2A]">{user?.name}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-[#5A6B7F] hover:text-[#0F1A2A] hover:bg-[#F6F8FA] rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome & Stats */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0F1A2A] mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Welcome back, {user?.name?.split(' ')[1]}
          </h1>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-[#EAF3FB]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#5A6B7F]">Queue</p>
                    <p className="text-2xl font-bold text-[#0F1A2A]">{queue.filter(q => q.status === 'waiting').length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#E3F2FD] flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#1E6FD9]" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#EAF3FB]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#5A6B7F]">Pending Review</p>
                    <p className="text-2xl font-bold text-[#0F1A2A]">{stats.pendingReviews}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#FFF3E0] flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#EAF3FB]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#5A6B7F]">Completed Today</p>
                    <p className="text-2xl font-bold text-[#0F1A2A]">{stats.completedToday}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#E8F5E9] flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#EAF3FB]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#5A6B7F]">Critical Cases</p>
                    <p className="text-2xl font-bold text-red-600">{stats.criticalCases}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Patient Queue
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              All Cases
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Queue List */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="font-semibold text-[#0F1A2A] mb-3">Waiting Patients</h3>
                {queue.length === 0 ? (
                  <Card className="border-[#EAF3FB]">
                    <CardContent className="py-8 text-center">
                      <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                      <p className="text-sm text-[#5A6B7F]">Queue is empty</p>
                    </CardContent>
                  </Card>
                ) : (
                  queue.map(item => (
                    <Card 
                      key={item.id} 
                      className={`border-[#EAF3FB] cursor-pointer hover:shadow-md transition-shadow ${
                        selectedCase?.id === item.symptomCheckId ? 'ring-2 ring-[#1E6FD9]' : ''
                      }`}
                      onClick={() => {
                        const check = allChecks.find(c => c.id === item.symptomCheckId);
                        if (check) handleSelectCase(check);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${getUrgencyDot(item.urgencyLevel)}`} />
                              <span className="font-medium text-[#0F1A2A]">{item.patientName}</span>
                            </div>
                            <Badge className={`text-xs ${getUrgencyColor(item.urgencyLevel)}`}>
                              {item.urgencyLevel}
                            </Badge>
                            <p className="text-xs text-[#5A6B7F] mt-2">
                              Wait: ~{item.estimatedWaitTime} min
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#CBD5E1]" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Case Detail */}
              <div className="lg:col-span-2">
                {selectedCase ? (
                  <div className="space-y-6">
                    {/* Patient Info */}
                    <Card className="border-[#EAF3FB]">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-[#1E6FD9]" />
                            {selectedCase.patientName}
                          </CardTitle>
                          <Badge className={getUrgencyColor(selectedCase.aiAssessment.urgencyLevel)}>
                            {selectedCase.aiAssessment.urgencyLevel.toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm text-[#5A6B7F]">Symptoms</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedCase.symptoms.map((symptom, idx) => (
                              <span 
                                key={idx}
                                className="px-3 py-1 bg-[#EAF3FB] rounded-full text-sm text-[#0F1A2A]"
                              >
                                {symptom}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-[#5A6B7F]">Duration</Label>
                          <p className="text-sm text-[#0F1A2A]">{selectedCase.duration}</p>
                        </div>
                        {selectedCase.additionalInfo && (
                          <div>
                            <Label className="text-sm text-[#5A6B7F]">Additional Info</Label>
                            <p className="text-sm text-[#0F1A2A]">{selectedCase.additionalInfo}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* AI Insights */}
                    <Card className="border-[#EAF3FB] bg-gradient-to-br from-[#FAFAFA] to-white">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Sparkles className="w-5 h-5 text-[#1E6FD9]" />
                          AI Diagnostic Insights
                          {isGeneratingInsights && <Loader2 className="w-4 h-4 animate-spin" />}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {aiInsights ? (
                          <>
                            <div>
                              <Label className="text-sm text-[#5A6B7F]">Differential Diagnosis</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {aiInsights.differentialDiagnosis.map((diagnosis: string, idx: number) => (
                                  <span 
                                    key={idx}
                                    className="px-3 py-1.5 bg-[#EAF3FB] rounded-lg text-sm text-[#0F1A2A] font-medium"
                                  >
                                    {diagnosis}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-[#5A6B7F]">Recommended Tests</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {aiInsights.recommendedTests.map((test: string, idx: number) => (
                                  <span 
                                    key={idx}
                                    className="px-3 py-1 bg-white border border-[#EAF3FB] rounded-full text-sm text-[#5A6B7F]"
                                  >
                                    {test}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                              <Label className="text-sm text-red-600 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Red Flags
                              </Label>
                              <ul className="mt-2 space-y-1">
                                {aiInsights.redFlags.map((flag: string, idx: number) => (
                                  <li key={idx} className="text-sm text-red-700">• {flag}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-sm text-[#5A6B7F]">AI Confidence</span>
                              <span className="font-semibold text-[#1E6FD9]">{aiInsights.aiConfidence}%</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 text-[#5A6B7F]">
                            {isGeneratingInsights ? 'Generating AI insights...' : 'Select a case to view AI insights'}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Diagnosis Form */}
                    <Card className="border-[#EAF3FB]">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Stethoscope className="w-5 h-5 text-[#1E6FD9]" />
                          Your Diagnosis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm text-[#5A6B7F]">Primary Diagnosis *</Label>
                          <Input
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder="Enter your diagnosis"
                            className="mt-1 rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-[#5A6B7F]">Treatment Plan</Label>
                          <Textarea
                            value={treatment}
                            onChange={(e) => setTreatment(e.target.value)}
                            placeholder="Enter treatment recommendations"
                            className="mt-1 rounded-xl min-h-[100px]"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-[#5A6B7F]">Additional Notes</Label>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any additional observations or recommendations"
                            className="mt-1 rounded-xl"
                          />
                        </div>
                        <Button 
                          onClick={handleSubmitDiagnosis}
                          disabled={isSubmitting || !diagnosis}
                          className="w-full bg-[#1E6FD9] hover:bg-[#1a5fc0] text-white rounded-xl"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5 mr-2" />
                              Submit Diagnosis
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="border-[#EAF3FB] h-full min-h-[400px] flex items-center justify-center">
                    <div className="text-center text-[#5A6B7F]">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a patient from the queue to review their case</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cases">
            <div className="space-y-4">
              {allChecks.map(check => (
                <Card key={check.id} className="border-[#EAF3FB]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-[#0F1A2A]">{check.patientName}</span>
                          <Badge className={getUrgencyColor(check.aiAssessment.urgencyLevel)}>
                            {check.aiAssessment.urgencyLevel}
                          </Badge>
                          <Badge variant="outline" className={
                            check.status === 'completed' ? 'border-green-200 text-green-600' :
                            check.status === 'in-review' ? 'border-blue-200 text-blue-600' :
                            'border-yellow-200 text-yellow-600'
                          }>
                            {check.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {check.symptoms.map((symptom, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-1 bg-[#F6F8FA] rounded text-sm text-[#5A6B7F]"
                            >
                              {symptom}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-[#5A6B7F]">
                          {new Date(check.createdAt).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSelectCase(check)}
                      >
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
