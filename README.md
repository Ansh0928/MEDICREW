# 🏥 MediCrew - AI Health Navigation Platform

> Your AI Health Navigation Team - Skip the wait. Get guidance from a team of AI health specialists.

MediCrew is an AI-powered health navigation platform that brings together a team of specialized AI agents (GP, Cardiologist, Mental Health Specialist, etc.) to help patients understand their symptoms and navigate to the right care.

## 🌟 Features

- **Multi-Agent Consultation**: Get perspectives from multiple AI specialists, not just a single chatbot
- **Smart Triage**: AI-powered urgency assessment with red flag detection
- **Real-time Streaming**: Watch as your care team discusses your symptoms
- **Privacy First**: No data storage, no account required
- **Comprehensive Evaluations**: Built-in testing framework for safety and accuracy

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Gemini API Key (free at [aistudio.google.com](https://aistudio.google.com))

### Installation

```bash
# Clone the repository
cd medicrew

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GOOGLE_API_KEY

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🏗️ Architecture

### Multi-Agent System

```
┌─────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR                                │
│  (Coordinates agents, manages conversation flow, final output)  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Triage      │    │  GP Agent     │    │  Specialist   │
│   Agent       │    │               │    │  Agents       │
│               │    │ - General     │    │ - Cardiology  │
│ - Urgency     │    │   assessment  │    │ - Mental      │
│ - Red flags   │    │ - History     │    │ - Dermatology │
│ - Routing     │    │   taking      │    │ - Orthopedic  │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **AI/Agents**: LangGraph + Gemini
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion

## 📁 Project Structure

```
medicrew/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── page.tsx           # Landing page
│   │   ├── consult/           # Consultation page
│   │   └── api/               # API routes
│   ├── agents/                # AI agent system
│   │   ├── definitions/       # Agent definitions (GP, Cardio, etc.)
│   │   ├── orchestrator.ts    # LangGraph orchestration
│   │   └── types.ts           # TypeScript types
│   ├── components/            # React components
│   │   ├── landing/           # Landing page components
│   │   ├── consult/           # Consultation UI
│   │   └── ui/                # shadcn/ui components
│   └── evals/                 # Evaluation framework
│       ├── datasets/          # Test cases
│       └── run_evals.ts       # Eval runner
└── ...
```

## 🧪 Running Evaluations

```bash
# Run the evaluation suite
npx tsx src/evals/run_evals.ts
```

## ✅ Push Validation

```bash
# Standard push gate (used by pre-push hook and CI)
bun run validate:push

# Strict mode (includes lint)
bun run validate:push:strict
```

The repository installs a local `pre-push` hook on dependency install. Pushes are blocked if `validate:push` fails.

This tests:

- **Triage Accuracy**: Urgency level classification
- **Safety Detection**: Red flag and emergency identification
- **Specialist Routing**: Correct specialist recommendations

## 📊 Key Metrics

The evaluation framework measures:

| Metric           | Description                           |
| ---------------- | ------------------------------------- |
| Triage Accuracy  | Does urgency match expected level?    |
| Safety Score     | Are red flags detected and escalated? |
| Routing Accuracy | Is the right specialist recommended?  |

## ⚠️ Disclaimer

MediCrew provides health navigation guidance only and does not constitute medical advice. Always consult a qualified healthcare provider for proper diagnosis and treatment.

## 🎯 LuminaX Accelerator

This project is built for the [LuminaX HealthTech Accelerator](https://lxhealth.com.au/luminax-accelerator/) application (Gold Coast, Australia).

**Application deadline**: March 6, 2026

## 📄 License

MIT
