import React from 'react';
import { X } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-[32px] p-8 w-full max-w-lg text-white max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Legal Information</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-6 text-sm text-slate-300">
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
