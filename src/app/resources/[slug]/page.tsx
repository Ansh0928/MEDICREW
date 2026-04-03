import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ArrowLeft, AlertTriangle, Phone } from "lucide-react";

interface ArticleContent {
  title: string;
  intro: string;
  checklist: string[];
  callSection: {
    call000: string[];
    seeGP: string[];
    selfCare: string[];
  };
  disclaimer?: string;
}

const articles: Record<string, ArticleContent> = {
  "chest-pain": {
    title: "Chest pain and breathing concerns",
    intro:
      "Chest pain and breathing difficulties can range from muscle strain to life-threatening emergencies. This guide helps you decide the right level of care — quickly.",
    checklist: [
      "Pain or pressure in the centre or left side of the chest",
      "Pain spreading to your arm, jaw, neck, or back",
      "Shortness of breath at rest or with minimal activity",
      "Rapid or irregular heartbeat (palpitations)",
      "Dizziness, lightheadedness, or feeling faint",
      "Sweating unexpectedly (cold sweat)",
      "Nausea or vomiting alongside chest discomfort",
      "Coughing up blood or pink/frothy mucus",
    ],
    callSection: {
      call000: [
        "Crushing, squeezing or severe chest pain lasting more than a few minutes",
        "Chest pain with shortness of breath, sweating, or arm/jaw pain",
        "Lips or fingernails turning blue",
        "Breathing stops or becomes extremely laboured",
        "Suspected heart attack or pulmonary embolism",
      ],
      seeGP: [
        "Chest discomfort that comes and goes over days",
        "Sharp pain that worsens when you breathe deeply (could be pleurisy)",
        "Mild but persistent shortness of breath",
        "Palpitations without dizziness or fainting",
        "Persistent cough with chest tightness",
      ],
      selfCare: [
        "Known muscle strain from exercise or physical work",
        "Brief sharp pain that resolves quickly on its own",
        "Mild acid reflux / heartburn sensation",
      ],
    },
    disclaimer:
      "If you have any doubt, call 000 or present to your nearest emergency department. This resource is for information only and does not replace clinical assessment.",
  },
  "fever-cough": {
    title: "Fever, cough, and viral symptoms",
    intro:
      "Most fevers and coughs are caused by self-limiting viral infections. Knowing what to watch for helps you avoid unnecessary ED visits and catch the signs that do need attention.",
    checklist: [
      "Fever above 38°C (100.4°F)",
      "Persistent dry or productive cough",
      "Sore throat, runny nose, body aches",
      "Fatigue or difficulty getting out of bed",
      "Chills or night sweats",
      "Loss of taste or smell",
      "Difficulty swallowing",
      "Rash appearing with fever",
    ],
    callSection: {
      call000: [
        "Difficulty breathing or rapid breathing at rest",
        "High fever (over 40°C) not responding to paracetamol",
        "Confusion, extreme drowsiness, or unresponsiveness",
        "Severe neck stiffness with fever and sensitivity to light",
        "Infant under 3 months with any fever",
      ],
      seeGP: [
        "Fever lasting more than 3 days without improvement",
        "Cough producing coloured sputum (yellow, green, brown)",
        "Ear pain, facial pain, or sinus pressure",
        "Sore throat with white patches (possible strep)",
        "You're immunocompromised, elderly, or pregnant",
        "Positive rapid antigen test for COVID-19 or flu",
      ],
      selfCare: [
        "Mild fever under 38.5°C in a healthy adult",
        "Runny nose and mild sore throat",
        "Rest, fluids, and paracetamol managing symptoms well",
      ],
    },
    disclaimer:
      "Always follow current Australian health authority guidance on COVID-19 and influenza. This resource is general information only.",
  },
  "mental-health": {
    title: "Mental health and stress symptoms",
    intro:
      "Mental health symptoms are as real as physical ones. This guide helps you understand urgency levels, access the right support, and prepare for a GP conversation.",
    checklist: [
      "Persistent low mood lasting more than two weeks",
      "Anxiety, worry, or panic attacks interfering with daily life",
      "Difficulty sleeping or sleeping too much",
      "Loss of interest in activities you previously enjoyed",
      "Withdrawal from friends and family",
      "Difficulty concentrating or making decisions",
      "Thoughts of self-harm or suicide",
      "Using alcohol or substances to cope",
    ],
    callSection: {
      call000: [
        "Active thoughts of suicide with a plan or intent",
        "Immediate risk of self-harm or harm to others",
        "Severe psychotic episode (hallucinations, inability to communicate)",
        "Overdose or poisoning emergency",
      ],
      seeGP: [
        "Persistent depression or anxiety lasting weeks",
        "You want to start or review mental health medication",
        "First time experiencing panic attacks",
        "Eating disorder symptoms affecting health",
        "Need a Mental Health Treatment Plan (Medicare rebates)",
      ],
      selfCare: [
        "Mild situational stress linked to a specific event",
        "Using exercise, sleep hygiene, and mindfulness strategies",
        "Talking to trusted friends or family",
        "Using Beyond Blue or Head to Health online resources",
      ],
    },
    disclaimer:
      "If you are in crisis, call Lifeline: 13 11 14 (24/7) or text 0477 13 11 14. Kids Helpline: 1800 55 1800. Suicide Call Back Service: 1300 659 467.",
  },
  "skin-allergy": {
    title: "Skin and allergy reactions",
    intro:
      "Skin reactions range from mild irritation to life-threatening anaphylaxis. This guide helps you identify severity and act fast when it matters.",
    checklist: [
      "Hives (raised, itchy welts) anywhere on the body",
      "Widespread redness or rash after eating or medication",
      "Swelling of lips, tongue, face, or throat",
      "Difficulty swallowing or breathing",
      "Pale, clammy skin with dizziness",
      "Persistent eczema or unexplained skin changes",
      "Blistering or peeling skin",
      "Rash with fever (possible systemic reaction)",
    ],
    callSection: {
      call000: [
        "Swelling of the throat or tongue causing breathing difficulty",
        "Sudden drop in blood pressure or loss of consciousness",
        "Signs of anaphylaxis — use EpiPen if available, then call 000",
        "Widespread blistering or skin peeling rapidly",
      ],
      seeGP: [
        "Hives or rash lasting more than 24–48 hours",
        "Allergic reaction after a new food or medication",
        "Recurrent unexplained skin reactions",
        "Mild facial swelling without breathing difficulty",
        "Eczema flare requiring prescription treatment",
      ],
      selfCare: [
        "Localised insect bite or sting with mild swelling",
        "Contact dermatitis from a known allergen (use barrier cream)",
        "Mild heat rash resolving in a cool environment",
      ],
    },
    disclaimer:
      "If you carry an EpiPen and have used it, call 000 immediately — even if symptoms improve. Anaphylaxis can return.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) return { title: "Not Found | MediCrew" };
  return {
    title: `${article.title} | MediCrew`,
    description: article.intro,
  };
}

export async function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }));
}

export default async function ResourceArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto min-h-screen max-w-2xl px-6 pt-28 pb-20">
        {/* Back */}
        <Link
          href="/resources"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to resources
        </Link>

        {/* Title */}
        <p className="font-mono text-xs tracking-widest uppercase text-slate-400 mb-3">
          Care Resource
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 leading-snug mb-4">
          {article.title}
        </h1>
        <p className="text-slate-600 leading-relaxed mb-10">{article.intro}</p>

        {/* Symptom checklist */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Common symptoms
          </h2>
          <ul className="space-y-2">
            {article.checklist.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-slate-700"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0 mt-2" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* When to act */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            When to act
          </h2>

          <div className="space-y-4">
            {/* Call 000 */}
            <div className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-red-600" />
                <p className="font-semibold text-red-700 text-sm uppercase tracking-wide">
                  Call 000 — Emergency
                </p>
              </div>
              <ul className="space-y-1.5">
                {article.callSection.call000.map((item) => (
                  <li
                    key={item}
                    className="text-sm text-red-800 flex items-start gap-2"
                  >
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-red-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* See GP */}
            <div className="rounded-xl border-l-4 border-yellow-400 bg-yellow-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-700" />
                <p className="font-semibold text-yellow-800 text-sm uppercase tracking-wide">
                  See your GP soon
                </p>
              </div>
              <ul className="space-y-1.5">
                {article.callSection.seeGP.map((item) => (
                  <li
                    key={item}
                    className="text-sm text-yellow-900 flex items-start gap-2"
                  >
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-yellow-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Self-care */}
            <div className="rounded-xl border-l-4 border-green-400 bg-green-50 p-4">
              <p className="font-semibold text-green-800 text-sm uppercase tracking-wide mb-2">
                Self-care at home
              </p>
              <ul className="space-y-1.5">
                {article.callSection.selfCare.map((item) => (
                  <li
                    key={item}
                    className="text-sm text-green-900 flex items-start gap-2"
                  >
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-green-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-xl bg-sky-50 border border-sky-100 p-6 text-center">
          <p className="font-semibold text-slate-900 mb-1">
            Still not sure what to do?
          </p>
          <p className="text-sm text-slate-600 mb-4">
            Start a free AI consultation and our care team will assess your
            specific symptoms.
          </p>
          <Link
            href="/consult"
            className="inline-flex rounded-full bg-sky-600 text-white text-sm font-medium px-6 py-2.5 hover:bg-sky-700 transition-colors"
          >
            Start a consultation about{" "}
            {article.title.split(" ").slice(0, 2).join(" ").toLowerCase()}
          </Link>
        </div>

        {/* Disclaimer */}
        {article.disclaimer && (
          <p className="mt-8 text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-6">
            {article.disclaimer}
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
