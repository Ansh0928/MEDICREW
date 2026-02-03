import type { AIAssessment, SymptomCheck } from '@/types';

// OpenAI API Configuration
const getApiKey = () => {
  // Check localStorage first (user-provided key)
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('healthai_api_key') : null;
  // Fall back to environment variable
  const envKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  return localKey || envKey;
};

const USE_REAL_AI = () => getApiKey().length > 0;

// Fallback database for when API is not available
const CONDITIONS_DATABASE: Record<string, { conditions: string[]; urgency: 'low' | 'medium' | 'high' | 'critical' }> = {
  'headache': { conditions: ['Tension headache', 'Migraine', 'Sinusitis', 'Hypertension'], urgency: 'medium' },
  'fever': { conditions: ['Viral infection', 'Influenza', 'COVID-19', 'Bacterial infection'], urgency: 'medium' },
  'chest pain': { conditions: ['Angina', 'Myocardial infarction', 'Costochondritis', 'GERD'], urgency: 'critical' },
  'cough': { conditions: ['Common cold', 'Bronchitis', 'Pneumonia', 'Allergies'], urgency: 'low' },
  'shortness of breath': { conditions: ['Asthma', 'COPD', 'Heart failure', 'Pulmonary embolism'], urgency: 'high' },
  'abdominal pain': { conditions: ['Gastritis', 'Appendicitis', 'Gallstones', 'IBS'], urgency: 'medium' },
  'back pain': { conditions: ['Muscle strain', 'Herniated disc', 'Sciatica', 'Osteoarthritis'], urgency: 'low' },
  'nausea': { conditions: ['Gastroenteritis', 'Food poisoning', 'Motion sickness', 'Pregnancy'], urgency: 'low' },
  'dizziness': { conditions: ['Vertigo', 'Hypotension', 'Anemia', 'Dehydration'], urgency: 'medium' },
  'rash': { conditions: ['Allergic reaction', 'Eczema', 'Contact dermatitis', 'Viral exanthem'], urgency: 'low' },
  'fatigue': { conditions: ['Anemia', 'Hypothyroidism', 'Chronic fatigue', 'Depression'], urgency: 'low' },
  'joint pain': { conditions: ['Osteoarthritis', 'Rheumatoid arthritis', 'Gout', 'Lupus'], urgency: 'medium' },
};

async function callOpenAI(messages: any[]): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  return response.json();
}

export async function analyzeSymptoms(
  symptoms: string[],
  duration: string,
  additionalInfo: string
): Promise<AIAssessment> {
  // Always show loading delay for UX
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (USE_REAL_AI()) {
    try {
      const prompt = `You are a medical triage AI assistant. Analyze the following patient symptoms and provide a structured assessment.

Symptoms: ${symptoms.join(', ')}
Duration: ${duration}
Additional Information: ${additionalInfo || 'None provided'}

Respond ONLY with a JSON object in this exact format:
{
  "urgencyLevel": "low|medium|high|critical",
  "possibleConditions": ["condition1", "condition2", "condition3", "condition4"],
  "recommendedAction": "specific action for patient",
  "questionsToAsk": ["question1", "question2", "question3", "question4"],
  "confidence": 85,
  "reasoning": "brief explanation of the assessment"
}

Guidelines:
- CRITICAL: Life-threatening symptoms (chest pain, severe breathing difficulty, unconsciousness, severe bleeding)
- HIGH: Requires urgent attention within 24 hours
- MEDIUM: Should see doctor within a few days
- LOW: Self-care appropriate, monitor symptoms`;

      const response = await callOpenAI([
        { role: 'system', content: 'You are a medical triage AI. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ]);

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          urgencyLevel: result.urgencyLevel || 'medium',
          possibleConditions: result.possibleConditions || ['Further evaluation needed'],
          recommendedAction: result.recommendedAction || 'Consult a healthcare provider',
          questionsToAsk: result.questionsToAsk || ['Please describe symptoms in detail'],
          confidence: result.confidence || 75,
          reasoning: result.reasoning || 'Based on symptom analysis',
        };
      }
    } catch (error) {
      console.warn('OpenAI API failed, using fallback:', error);
    }
  }

  // Fallback to local analysis
  return fallbackSymptomAnalysis(symptoms, duration, additionalInfo);
}

function fallbackSymptomAnalysis(
  symptoms: string[],
  duration: string,
  additionalInfo: string
): AIAssessment {
  let maxUrgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
  const possibleConditions: string[] = [];
  
  symptoms.forEach(symptom => {
    const lowerSymptom = symptom.toLowerCase();
    for (const [key, data] of Object.entries(CONDITIONS_DATABASE)) {
      if (lowerSymptom.includes(key)) {
        possibleConditions.push(...data.conditions);
        if (getUrgencyValue(data.urgency) > getUrgencyValue(maxUrgency)) {
          maxUrgency = data.urgency;
        }
      }
    }
  });

  // Check for critical keywords
  const criticalKeywords = ['severe', 'intense', 'unbearable', 'can\'t breathe', 'chest pain', 'unconscious', 'bleeding', 'emergency'];
  if (criticalKeywords.some(keyword => additionalInfo.toLowerCase().includes(keyword))) {
    maxUrgency = 'critical';
  }

  const uniqueConditions = [...new Set(possibleConditions)].slice(0, 4);
  if (uniqueConditions.length === 0) {
    uniqueConditions.push('General malaise', 'Viral illness', 'Stress-related symptoms', 'Further evaluation needed');
  }

  const actions: Record<string, string> = {
    critical: 'Seek emergency medical attention immediately. Call 000 or go to the nearest emergency department.',
    high: 'Schedule an urgent appointment with a doctor within 24 hours. Monitor symptoms closely.',
    medium: 'Book a routine appointment with your GP within the next few days. Rest and monitor symptoms.',
    low: 'Self-care at home is appropriate. Rest, stay hydrated, and monitor symptoms. See a doctor if symptoms worsen.',
  };

  const questions: Record<string, string[]> = {
    critical: ['Are you experiencing severe pain or pressure?', 'Is the pain radiating?', 'Are you having difficulty breathing?', 'Do you feel faint?'],
    high: ['When did symptoms start?', 'Have they been getting worse?', 'Are you taking any medications?', 'Do you have known conditions?'],
    medium: ['How long have you had these symptoms?', 'Have you tried any treatments?', 'Do you have allergies?', 'Is this the first time?'],
    low: ['Can you describe symptoms in more detail?', 'Have you noticed triggers?', 'What makes it better or worse?', 'Any other symptoms?'],
  };

  return {
    urgencyLevel: maxUrgency,
    possibleConditions: uniqueConditions,
    recommendedAction: actions[maxUrgency],
    questionsToAsk: questions[maxUrgency],
    confidence: Math.floor(Math.random() * 15) + 80,
    reasoning: `Based on ${symptoms.join(', ')} over ${duration}, the AI suggests ${uniqueConditions[0]} as a possibility.`,
  };
}

function getUrgencyValue(urgency: string): number {
  const values = { low: 1, medium: 2, high: 3, critical: 4 };
  return values[urgency as keyof typeof values] || 1;
}

export async function generateDoctorInsights(symptomCheck: SymptomCheck): Promise<{
  differentialDiagnosis: string[];
  recommendedTests: string[];
  redFlags: string[];
  aiConfidence: number;
}> {
  await new Promise(resolve => setTimeout(resolve, 800));

  if (USE_REAL_AI()) {
    try {
      const prompt = `As a medical AI assisting doctors, analyze this patient case and provide diagnostic insights.

Patient Symptoms: ${symptomCheck.symptoms.join(', ')}
Duration: ${symptomCheck.duration}
Additional Info: ${symptomCheck.additionalInfo || 'None'}
AI Triage Level: ${symptomCheck.aiAssessment.urgencyLevel}
Possible Conditions: ${symptomCheck.aiAssessment.possibleConditions.join(', ')}

Respond with JSON only:
{
  "differentialDiagnosis": ["diagnosis1", "diagnosis2", "diagnosis3"],
  "recommendedTests": ["test1", "test2", "test3"],
  "redFlags": ["flag1", "flag2"],
  "aiConfidence": 85
}`;

      const response = await callOpenAI([
        { role: 'system', content: 'You are a medical AI assisting doctors. Respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ]);

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('OpenAI API failed, using fallback:', error);
    }
  }

  // Fallback
  const urgency = symptomCheck.aiAssessment.urgencyLevel;
  const testRecommendations: Record<string, string[]> = {
    critical: ['ECG', 'Troponin', 'Chest X-ray', 'Blood gas analysis', 'CT scan'],
    high: ['CBC', 'Basic metabolic panel', 'Chest X-ray', 'EKG'],
    medium: ['CBC', 'Urinalysis', 'Basic metabolic panel'],
    low: ['Physical examination', 'Vital signs monitoring'],
  };

  const redFlagsByUrgency: Record<string, string[]> = {
    critical: ['Severe symptoms reported', 'Possible cardiovascular involvement', 'Requires immediate intervention'],
    high: ['Symptoms persisting', 'May indicate underlying condition', 'Close monitoring needed'],
    medium: ['Monitor for worsening', 'Follow-up recommended', 'Consider differential diagnoses'],
    low: ['Self-limiting likely', 'Routine care appropriate', 'Patient education needed'],
  };

  return {
    differentialDiagnosis: symptomCheck.aiAssessment.possibleConditions,
    recommendedTests: testRecommendations[urgency],
    redFlags: redFlagsByUrgency[urgency],
    aiConfidence: symptomCheck.aiAssessment.confidence,
  };
}

export async function generateTreatmentPlan(
  diagnosis: string,
  symptoms: string[]
): Promise<{
  medications: string[];
  lifestyle: string[];
  followUp: string;
}> {
  await new Promise(resolve => setTimeout(resolve, 600));

  if (USE_REAL_AI()) {
    try {
      const prompt = `As a medical AI, suggest a treatment plan.

Diagnosis: ${diagnosis}
Symptoms: ${symptoms.join(', ')}

Respond with JSON only:
{
  "medications": ["medication1", "medication2", "medication3"],
  "lifestyle": ["recommendation1", "recommendation2", "recommendation3"],
  "followUp": "follow-up instructions"
}`;

      const response = await callOpenAI([
        { role: 'system', content: 'You are a medical AI. Respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ]);

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('OpenAI API failed, using fallback:', error);
    }
  }

  return {
    medications: [
      'Symptomatic treatment as needed',
      'Follow prescribing guidelines',
      'Monitor for adverse reactions',
    ],
    lifestyle: [
      'Rest and adequate hydration',
      'Avoid strenuous activities',
      'Maintain balanced diet',
      'Monitor symptoms daily',
    ],
    followUp: 'Schedule follow-up in 1-2 weeks or sooner if symptoms worsen.',
  };
}
