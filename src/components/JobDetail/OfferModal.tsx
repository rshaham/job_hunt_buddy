import { useState } from 'react';
import { Modal, Button, Textarea, Input } from '../ui';
import { useAppStore } from '../../stores/appStore';
import type { OfferDetails } from '../../types';

export function OfferModal() {
  const {
    isOfferModalOpen,
    pendingStatusChange,
    confirmStatusChange,
    cancelStatusChange,
    jobs,
  } = useAppStore();

  const [baseSalary, setBaseSalary] = useState('');
  const [bonus, setBonus] = useState('');
  const [bonusType, setBonusType] = useState<'percentage' | 'fixed'>('fixed');
  const [equity, setEquity] = useState('');
  const [benefitsSummary, setBenefitsSummary] = useState('');
  const [offerDeadline, setOfferDeadline] = useState('');
  const [startDate, setStartDate] = useState('');
  const [negotiationNotes, setNegotiationNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const job = pendingStatusChange ? jobs.find((j) => j.id === pendingStatusChange.jobId) : null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const details: OfferDetails = {};
      if (baseSalary) details.baseSalary = parseFloat(baseSalary);
      if (bonus) {
        details.bonus = parseFloat(bonus);
        details.bonusType = bonusType;
      }
      if (equity.trim()) details.equity = equity.trim();
      if (benefitsSummary.trim()) details.benefitsSummary = benefitsSummary.trim();
      if (offerDeadline) details.offerDeadline = new Date(offerDeadline);
      if (startDate) details.startDate = new Date(startDate);
      if (negotiationNotes.trim()) details.negotiationNotes = negotiationNotes.trim();

      await confirmStatusChange(undefined, details);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await confirmStatusChange();
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    cancelStatusChange();
    resetForm();
  };

  const resetForm = () => {
    setBaseSalary('');
    setBonus('');
    setBonusType('fixed');
    setEquity('');
    setBenefitsSummary('');
    setOfferDeadline('');
    setStartDate('');
    setNegotiationNotes('');
  };

  if (!isOfferModalOpen) return null;

  return (
    <Modal
      isOpen={isOfferModalOpen}
      onClose={handleClose}
      title={
        <span>
          Offer Details
          {job && (
            <span className="text-sm font-normal text-foreground-muted ml-2">
              — {job.company}
            </span>
          )}
        </span>
      }
      size="lg"
    >
      <div className="p-4 space-y-4">
        <p className="text-sm text-foreground-muted">
          Capture details about this offer (all fields optional).
        </p>

        {/* Compensation section */}
        <div className="grid grid-cols-2 gap-4">
          {/* Base salary */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Base Salary
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">$</span>
              <Input
                type="number"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="e.g., 150000"
                className="pl-7"
              />
            </div>
          </div>

          {/* Bonus */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Bonus
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
                  {bonusType === 'percentage' ? '%' : '$'}
                </span>
                <Input
                  type="number"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                  placeholder={bonusType === 'percentage' ? 'e.g., 15' : 'e.g., 20000'}
                  className="pl-7"
                />
              </div>
              <select
                value={bonusType}
                onChange={(e) => setBonusType(e.target.value as 'percentage' | 'fixed')}
                className="px-3 py-2 border border-border rounded-md bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="fixed">Fixed</option>
                <option value="percentage">%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Equity */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Equity
          </label>
          <Input
            type="text"
            value={equity}
            onChange={(e) => setEquity(e.target.value)}
            placeholder="e.g., 0.5% over 4 years, $50k RSU"
          />
        </div>

        {/* Benefits summary */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Benefits Summary
          </label>
          <Textarea
            value={benefitsSummary}
            onChange={(e) => setBenefitsSummary(e.target.value)}
            placeholder="Health insurance, 401k match, PTO, etc."
            rows={2}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Offer Deadline
            </label>
            <Input
              type="date"
              value={offerDeadline}
              onChange={(e) => setOfferDeadline(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>

        {/* Negotiation notes */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Negotiation Notes
          </label>
          <Textarea
            value={negotiationNotes}
            onChange={(e) => setNegotiationNotes(e.target.value)}
            placeholder="Notes about negotiation, counteroffers, etc."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSkip} disabled={isSaving}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Details'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
