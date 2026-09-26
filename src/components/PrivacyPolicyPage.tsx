import React from 'react';
import { ArrowLeft, ShieldCheck, Database, Lock, UserRound, BrainCircuit, Mail, Sparkles } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  const sections = [
    {
      icon: Database,
      title: '1. Information We Collect',
      body: [
        'MornAI collects information you provide when creating an account, completing onboarding, building a startup profile, creating tasks, managing startup context, joining teams, booking founder syncs, or editing your profile.',
        'This may include your name, email address, profile details, skills, startup information, goals, work preferences, project context, and activity you intentionally add to the platform.',
      ],
    },
    {
      icon: BrainCircuit,
      title: '2. How MornAI Uses Information',
      body: [
        'We use your information to operate the platform, maintain startup and profile context, provide AI-assisted strategy and recommendations, support startup discovery, coordinate work, and improve the product experience.',
        'Information you intentionally place into a startup workspace may be used as context for AI features connected to that startup workspace.',
      ],
    },
    {
      icon: UserRound,
      title: '3. Account & Profile Information',
      body: [
        'Your account profile is used to identify you inside MornAI and to provide features such as profile editing, startup participation, talent discovery, team context, and workspace access.',
        'You are responsible for making sure the information you submit is accurate and appropriate to share through the platform.',
      ],
    },
    {
      icon: Lock,
      title: '4. Storage & Security',
      body: [
        'MornAI uses third-party infrastructure and cloud services to authenticate users and store application data. Access controls are used to restrict protected data to authorized users and workflows.',
        'No internet-based service can guarantee absolute security. We continuously work to reduce unauthorized access, data loss, and misuse, but you should avoid placing passwords, secret keys, payment credentials, or other highly sensitive secrets into ordinary profile or startup fields.',
      ],
    },
    {
      icon: ShieldCheck,
      title: '5. Startup & Team Visibility',
      body: [
        'Some information is intentionally visible to other MornAI users because the product includes startup discovery, talent matching, team profiles, and collaboration features.',
        'Information placed in public-facing startup fields should be treated as information you intend to share with the MornAI community.',
      ],
    },
    {
      icon: Sparkles,
      title: '6. AI Features',
      body: [
        'MornAI may send relevant profile, startup, roadmap, task, or conversation context to AI services that power features you explicitly use.',
        'AI-generated suggestions are provided to assist decision-making and execution. They should be reviewed by users before being treated as authoritative business, legal, financial, medical, or other professional advice.',
      ],
    },
    {
      icon: Database,
      title: '7. Data Retention',
      body: [
        'We retain account and workspace information for as long as reasonably necessary to provide the service, maintain platform functionality, meet legitimate operational needs, or satisfy applicable legal obligations.',
        'When deletion tools become available in the product, users may use them to request removal of eligible information. Some records may need to remain for security, fraud prevention, legal, or technical reasons.',
      ],
    },
    {
      icon: UserRound,
      title: '8. Your Choices',
      body: [
        'You can review and edit profile information from the MornAI Profile page. You can also choose what startup information, skills, goals, and collaboration details you place on the platform.',
        'For privacy-related requests, contact the MornAI team through the support channel provided by the service.',
      ],
    },
    {
      icon: Mail,
      title: '9. Changes to This Policy',
      body: [
        'We may update this Privacy Policy as MornAI evolves, new features are introduced, or legal and operational requirements change.',
        'The latest version published on this page will be the version that applies to your continued use of the service.',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_8%,rgba(124,58,237,.10),transparent_28%),radial-gradient(circle_at_90%_12%,rgba(59,130,246,.08),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_48%,#f7f9fc_100%)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/80 bg-white/70 px-4 py-4 backdrop-blur-2xl sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to MornAI
          </button>

          <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/75 px-3.5 py-2 shadow-sm">
            <BrandLogo className="grid h-8 w-8 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70" />
            <span className="text-sm font-extrabold tracking-tight">
              MORN<span className="text-indigo-600">AI</span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
        <section className="overflow-hidden rounded-[34px] border border-white/90 bg-white/75 p-7 shadow-[0_30px_100px_rgba(15,23,42,.08)] backdrop-blur-xl sm:p-12">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-indigo-600">MornAI Privacy</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Last updated: September 20, 2026</p>
            </div>
          </div>

          <h1 className="mt-7 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-6xl">Privacy Policy</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            MornAI is designed to keep startup context connected to the people and work using it.
            This policy explains what information the platform may collect, how it may be used, and the choices users have over their information.
          </p>

          <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs leading-6 text-indigo-950">
            This page is general platform policy information, not a substitute for legal advice. Before commercial launch, the operator of MornAI should review this policy with appropriate legal counsel and adapt it to the jurisdictions, vendors, and data practices actually used by the product.
          </div>
        </section>

        <section className="mt-6 grid gap-5">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <article key={section.title} className="rounded-[28px] border border-white/90 bg-white/78 p-6 shadow-[0_18px_55px_rgba(15,23,42,.06)] backdrop-blur-xl sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-950 sm:text-xl">{section.title}</h2>
                    <div className="mt-3 space-y-3">
                      {section.body.map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-7 text-slate-600">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <footer className="mt-8 rounded-[24px] border border-white/90 bg-white/65 p-5 text-center text-xs leading-6 text-slate-500 backdrop-blur-xl">
          MornAI • AI startup operating platform • Privacy Policy
        </footer>
      </main>
    </div>
  );
};
