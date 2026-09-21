import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Crown, Sparkles, X, Zap } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const [annual, setAnnual] = useState(true);

  if (!isOpen) return null;

  const proPrice = annual ? 699 : 899;
  const teamPrice = annual ? 1499 : 1899;

  const plans = [
    {
      name: 'Free',
      price: '₹0',
      caption: 'Build your network',
      features: ['Create your profile', 'Discover startups and people', 'Basic matching', 'Messages', 'Limited opportunities'],
      cta: 'Keep using free',
      featured: false,
    },
    {
      name: 'Pro',
      price: `₹${proPrice}`,
      suffix: '/month',
      caption: 'For serious founders & builders',
      features: ['Advanced Match Radar', 'Unlimited saved searches', 'AI opportunity + profile tools', 'Company Brain', 'AI website builder', 'Advanced hiring signals', 'Priority discovery'],
      cta: 'Unlock Pro workflow',
      featured: true,
    },
    {
      name: 'Team',
      price: `₹${teamPrice}`,
      suffix: '/month',
      caption: 'For active startup teams',
      features: ['Everything in Pro', 'Team workspace', 'Advanced company memory', 'Hiring pipeline', 'Collaboration insights', 'Team-level AI automations', 'Priority support'],
      cta: 'Plan for my team',
      featured: false,
    },
  ];

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/35 p-3 sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <div className="flex min-h-full items-start justify-center sm:items-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: .16, ease: 'easeOut' }} className="mornai-pricing-modal my-1 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] sm:my-0 sm:max-h-[calc(100dvh-2.5rem)]">
            <div className="shrink-0 p-4 pb-3 sm:p-5 sm:pb-3">
              <div className="flex items-start justify-between gap-4">
            <div>
              <span className="mornai-section-kicker"><Crown className="h-3.5 w-3.5" /> MornAI Pro</span>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Pay for leverage, not another dashboard.</h2>
              <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-500">The free network helps you connect. Pro removes the friction around matching, company context, hiring, and AI-assisted execution.</p>
            </div>
            <button type="button" onClick={onClose} className="mornai-close-btn"><X className="h-4 w-4" /></button>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/75 p-2.5">
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /><p className="text-[10px] font-black text-slate-700">Annual billing saves you 2 months.</p></div>
            <button type="button" onClick={() => setAnnual((value) => !value)} className={`mornai-billing-toggle ${annual ? 'is-active' : ''}`}><span className={annual ? 'is-on' : ''}>Annual</span><span className={!annual ? 'is-on' : ''}>Monthly</span></button>
          </div>

            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
          <div className="grid gap-3 pb-1 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className={`mornai-price-card ${plan.featured ? 'is-featured' : ''}`}>
                {plan.featured && <span className="mornai-price-badge">Most useful</span>}
                <div className="flex items-center justify-between">
                  <div><h3 className="text-sm font-black text-slate-950">{plan.name}</h3><p className="mt-0.5 text-[10px] font-semibold text-slate-400">{plan.caption}</p></div>
                  {plan.featured ? <Sparkles className="h-4 w-4 text-violet-600" /> : <Crown className="h-4 w-4 text-slate-300" />}
                </div>
                <div className="mt-5 flex items-end gap-1"><span className="text-3xl font-black tracking-tight text-slate-950">{plan.price}</span>{plan.suffix && <span className="pb-1 text-[10px] font-bold text-slate-400">{plan.suffix}</span>}</div>
                <div className="my-5 h-px bg-slate-100" />
                <div className="space-y-2.5">{plan.features.map((feature) => <div key={feature} className="flex items-start gap-2 text-[11px] leading-5 text-slate-600"><span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-2.5 w-2.5" /></span>{feature}</div>)}</div>
                <button type="button" onClick={onClose} className={`mt-6 w-full rounded-2xl px-4 py-3 text-xs font-black transition ${plan.featured ? 'mornai-price-primary text-white' : 'mornai-price-secondary text-slate-700'}`}>{plan.cta}</button>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[22px] border border-violet-100 bg-gradient-to-r from-violet-50/90 via-white to-sky-50/80 p-4">
            <p className="text-[10px] font-black uppercase tracking-[.15em] text-violet-600">Pricing principle</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">The marketplace stays useful for free. Premium is about speed, context, automation, and better decisions. That makes the paid value visible instead of holding basic networking hostage.</p>
          </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
