import React from 'react';
import { ArrowRight, LogIn, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';

interface AuthGatewayProps {
  onChoose: (mode: 'login' | 'signup') => void;
  onOpenPrivacy: () => void;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onChoose, onOpenPrivacy }) => {
  return (
    <div className="fixed inset-0 z-40 min-h-screen overflow-y-auto bg-slate-50 font-['Plus_Jakarta_Sans'] text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-100/70 blur-3xl" />
        <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-2xl rounded-[34px] border border-white/90 bg-white/[0.72] p-4 shadow-[0_35px_120px_rgba(15,23,42,.12)] backdrop-blur-3xl sm:p-6">
          <div className="rounded-[28px] border border-white/90 bg-white/[0.68] px-6 py-8 sm:px-10 sm:py-10">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="mt-6 text-center">
              <b className="text-2xl tracking-tight text-slate-950">
                MORN<span className="text-indigo-600">AI</span>
              </b>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                Sign in to continue to your workspace or create a new MornAI account.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onChoose('login')}
                className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white">
                  <LogIn className="h-5 w-5" />
                </span>
                <b className="mt-5 block text-lg text-slate-950">Log in</b>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Continue with your existing MornAI account.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-indigo-600">
                  Continue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => onChoose('signup')}
                className="group rounded-3xl border border-indigo-100 bg-indigo-50/70 p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-xl"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white">
                  <UserPlus className="h-5 w-5" />
                </span>
                <b className="mt-5 block text-lg text-slate-950">Create account</b>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Build your profile and set up your MornAI workspace.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-indigo-700">
                  Get started <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            </div>

            <div className="mt-7 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Your authentication is handled by Firebase.
            </div>

            <button
              type="button"
              onClick={onOpenPrivacy}
              className="mx-auto mt-5 block text-xs font-semibold text-slate-400 transition-colors hover:text-indigo-600"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
