import React from 'react';
import { X } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/55 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto mt-2 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 text-white shadow-2xl sm:mt-0 sm:max-h-[calc(100dvh-2rem)]">
        <div className="shrink-0 flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-2xl font-bold">Legal Information</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-7 text-sm text-slate-300">
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Privacy Policy</h3>
            <p>We respect your privacy and are committed to protecting your personal data. We only collect information necessary to provide and improve our services.</p>
          </section>
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Terms of Service</h3>
            <p>By using MornAI, you agree to comply with our community guidelines and terms of service. Unauthorized use is prohibited.</p>
          </section>
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Platform Information</h3>
            <p>MornAI is a platform designed to connect founders and contributors. All milestones and equity agreements are subject to our internal protocols.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
