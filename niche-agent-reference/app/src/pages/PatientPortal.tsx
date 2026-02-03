import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  LogOut, 
  User, 
  History, 
  Plus, 
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeSymptoms } from '@/services/aiService';
import { addSymptomCheck, getSymptomChecksByPatient } from '@/services/dataService';
import type { AIAssessment, SymptomCheck } from '@/types';
import { toast } from 'sonner';

const COMMON_SYMPTOMS = [
  'Headache', 'Fever', 'Cough', 'Fatigue', 'Chest pain',
  'Shortness of breath', 'Abdominal pain', 'Back pain',
  'Nausea', 'Dizziness', 'Rash', 'Joint pain'
];

const DURATIONS = [
  'Less than 1 day',
  '1-3 days',
  '4-7 days',
  '1-2 weeks',
  'More than 2 weeks'
];

export default function PatientPortal() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'check' | 'history'>('check');
  
  // Symptom check form state
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [duration, setDuration] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAssessment | null>(null);
  const [submittedCheck, setSubmittedCheck] = useState<SymptomCheck | null>(null);

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleAddCustomSymptom = () => {
    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) {
      setSelectedSymptoms([...selectedSymptoms, customSymptom.trim()]);
      setCustomSymptom('');
    }
  };

  const handleAnalyze = async () => {
    if (selectedSymptoms.length === 0) {
      toast.error('Please select at least one symptom');
      return;
    }
    if (!duration) {
      toast.error('Please select symptom duration');
      return;
    }

    setIsAnalyzing(true);
    try {
      const assessment = await analyzeSymptoms(selectedSymptoms, duration, additionalInfo);
      setAiResult(assessment);
      
      // Save the symptom check
      const newCheck = addSymptomCheck({
        patientId: user?.id || 'unknown',
        patientName: user?.name || 'Unknown',
        symptoms: selectedSymptoms,
        duration,
        additionalInfo,
        aiAssessment: assessment,
        status: 'pending',
      });
      
      setSubmittedCheck(newCheck);
      toast.success('AI analysis complete!');
    } catch (error) {
      toast.error('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const pastChecks = getSymptomChecksByPatient(user?.id || '');

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
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EAF3FB] rounded-full">
                <User className="w-4 h-4 text-[#1E6FD9]" />
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
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0F1A2A] mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-[#5A6B7F]">
            Check your symptoms with our AI assistant or view your health history.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('check')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'check' 
                ? 'bg-[#1E6FD9] text-white' 
                : 'bg-white text-[#5A6B7F] hover:bg-[#EAF3FB]'
            }`}
          >
            <Plus className="w-4 h-4" />
            New Symptom Check
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'history' 
                ? 'bg-[#1E6FD9] text-white' 
                : 'bg-white text-[#5A6B7F] hover:bg-[#EAF3FB]'
            }`}
          >
            <History className="w-4 h-4" />
            Health History
          </button>
        </div>

        {activeTab === 'check' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Symptom Check Form */}
            <Card className="border-[#EAF3FB]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-[#1E6FD9]" />
                  AI Symptom Checker
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Symptoms Selection */}
                <div>
                  <Label className="text-sm font-medium text-[#0F1A2A] mb-3 block">
                    Select your symptoms
                  </Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {COMMON_SYMPTOMS.map(symptom => (
                      <button
                        key={symptom}
                        onClick={() => handleSymptomToggle(symptom)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          selectedSymptoms.includes(symptom)
                            ? 'bg-[#1E6FD9] text-white border-[#1E6FD9]'
                            : 'bg-white text-[#5A6B7F] border-[#EAF3FB] hover:border-[#1E6FD9]'
                        }`}
                      >
                        {symptom}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add other symptom..."
                      value={customSymptom}
                      onChange={(e) => setCustomSymptom(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomSymptom()}
                      className="rounded-full"
                    />
                    <Button 
                      onClick={handleAddCustomSymptom}
                      variant="outline"
                      className="rounded-full px-4"
                    >
                      Add
                    </Button>
                  </div>
                  {selectedSymptoms.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedSymptoms.map(symptom => (
                        <span 
                          key={symptom}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-[#EAF3FB] rounded-full text-sm text-[#0F1A2A]"
                        >
                          {symptom}
                          <button 
                            onClick={() => handleSymptomToggle(symptom)}
                            className="text-[#5A6B7F] hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <Label className="text-sm font-medium text-[#0F1A2A] mb-3 block">
                    How long have you had these symptoms?
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {DURATIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                          duration === d
                            ? 'bg-[#1E6FD9] text-white border-[#1E6FD9]'
                            : 'bg-white text-[#5A6B7F] border-[#EAF3FB] hover:border-[#1E6FD9]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Info */}
                <div>
                  <Label className="text-sm font-medium text-[#0F1A2A] mb-2 block">
                    Additional information (optional)
                  </Label>
                  <Textarea
                    placeholder="Describe your symptoms in more detail..."
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    className="rounded-xl min-h-[100px]"
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || selectedSymptoms.length === 0 || !duration}
                  className="w-full bg-[#1E6FD9] hover:bg-[#1a5fc0] text-white rounded-xl"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      AI Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* AI Results */}
            {aiResult && (
              <Card className="border-[#EAF3FB] bg-gradient-to-br from-white to-[#F8FAFC]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-[#1E6FD9]" />
                    AI Assessment Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Urgency Level */}
                  <div>
                    <Label className="text-sm text-[#5A6B7F] mb-2 block">Urgency Level</Label>
                    <Badge className={`text-sm px-4 py-2 ${getUrgencyColor(aiResult.urgencyLevel)}`}>
                      {aiResult.urgencyLevel.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Possible Conditions */}
                  <div>
                    <Label className="text-sm text-[#5A6B7F] mb-2 block">Possible Conditions</Label>
                    <div className="flex flex-wrap gap-2">
                      {aiResult.possibleConditions.map((condition, idx) => (
                        <span 
                          key={idx}
                          className="px-3 py-1.5 bg-[#EAF3FB] rounded-lg text-sm text-[#0F1A2A]"
                        >
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Action */}
                  <div className="bg-[#FFF8E1] rounded-xl p-4 border border-[#FFE082]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-orange-800 mb-1">Recommended Action</div>
                        <div className="text-sm text-orange-700">{aiResult.recommendedAction}</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Confidence */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#EAF3FB]">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-[#5A6B7F]">AI Confidence</span>
                    </div>
                    <span className="text-lg font-semibold text-[#1E6FD9]">{aiResult.confidence}%</span>
                  </div>

                  {/* Queue Status */}
                  {submittedCheck && (
                    <div className="bg-[#E8F5E9] rounded-xl p-4 border border-[#C8E6C9]">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800">Added to Queue</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Your case has been added to the doctor's queue. You will be notified when a doctor reviews your case.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!aiResult && (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center text-[#5A6B7F]">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Fill out the symptom check form to get AI analysis</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {pastChecks.length === 0 ? (
              <Card className="border-[#EAF3FB]">
                <CardContent className="py-12 text-center">
                  <History className="w-12 h-12 mx-auto mb-4 text-[#CBD5E1]" />
                  <p className="text-[#5A6B7F]">No symptom checks yet</p>
                  <Button 
                    onClick={() => setActiveTab('check')}
                    className="mt-4 bg-[#1E6FD9] hover:bg-[#1a5fc0] text-white"
                  >
                    Start Your First Check
                  </Button>
                </CardContent>
              </Card>
            ) : (
              pastChecks.map(check => (
                <Card key={check.id} className="border-[#EAF3FB]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm text-[#5A6B7F]">
                            {new Date(check.createdAt).toLocaleDateString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
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
                        <div className="flex flex-wrap gap-2 mb-3">
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
                          Possible: {check.aiAssessment.possibleConditions.slice(0, 2).join(', ')}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#CBD5E1]" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
