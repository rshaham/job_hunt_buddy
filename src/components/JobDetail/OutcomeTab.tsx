import { useState } from 'react';
import { XCircle, Gift, Pencil, Check, X, Calendar, Clock, Briefcase, DollarSign, TrendingUp, Award } from 'lucide-react';
import { format } from 'date-fns';
import { Button, Badge, Textarea, Input } from '../ui';
import { useAppStore } from '../../stores/appStore';
import type { Job, RejectionDetails, OfferDetails, RejectionReason } from '../../types';
import { REJECTION_REASON_LABELS } from '../../types';

interface OutcomeTabProps {
  job: Job;
}

export function OutcomeTab({ job }: OutcomeTabProps) {
  // Show sections based on data OR current status (so users can add details anytime)
  const showRejection = !!job.rejectionDetails || job.status === 'Rejected';
  const showOffer = !!job.offerDetails || job.status === 'Offer';

  return (
    <div className="space-y-6">
      {showRejection && <RejectionOutcome job={job} />}
      {showOffer && <OfferOutcome job={job} />}
    </div>
  );
}

// ============================================================================
// Rejection Outcome Component
// ============================================================================

function RejectionOutcome({ job }: { job: Job }) {
  const updateJob = useAppStore((state) => state.updateJob);
  const details = job.rejectionDetails || {};

  const [isEditing, setIsEditing] = useState(false);
  const [editReason, setEditReason] = useState<RejectionReason | ''>(details.reason || '');
  const [editStage, setEditStage] = useState(details.stageRejectedAt || '');
  const [editFeedback, setEditFeedback] = useState(details.feedbackReceived || '');
  const [editLessons, setEditLessons] = useState(details.lessonsLearned || '');
  const [editDate, setEditDate] = useState(
    details.rejectedAt ? format(new Date(details.rejectedAt), 'yyyy-MM-dd') : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const interviewRounds = job.interviews || [];

  const handleStartEdit = () => {
    setEditReason(details.reason || '');
    setEditStage(details.stageRejectedAt || '');
    setEditFeedback(details.feedbackReceived || '');
    setEditLessons(details.lessonsLearned || '');
    setEditDate(details.rejectedAt ? format(new Date(details.rejectedAt), 'yyyy-MM-dd') : '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedDetails: RejectionDetails = {};
      if (editReason) updatedDetails.reason = editReason;
      if (editStage.trim()) updatedDetails.stageRejectedAt = editStage.trim();
      if (editFeedback.trim()) updatedDetails.feedbackReceived = editFeedback.trim();
      if (editLessons.trim()) updatedDetails.lessonsLearned = editLessons.trim();
      if (editDate) updatedDetails.rejectedAt = new Date(editDate);

      await updateJob(job.id, { rejectionDetails: updatedDetails });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-6 bg-gradient-to-br from-red-50 to-slate-50 dark:from-red-950/30 dark:to-slate-900/50 rounded-xl border border-red-200 dark:border-red-900/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <XCircle className="w-5 h-5" />
            <h3 className="font-semibold">Edit Rejection Details</h3>
          </div>
        </div>

        {/* Reason dropdown */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Rejection Reason
          </label>
          <select
            value={editReason}
            onChange={(e) => setEditReason(e.target.value as RejectionReason | '')}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select a reason...</option>
            {Object.entries(REJECTION_REASON_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Stage rejected at */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Stage Rejected At
          </label>
          {interviewRounds.length > 0 ? (
            <select
              value={editStage}
              onChange={(e) => setEditStage(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select a stage...</option>
              <option value="Application">Application</option>
              {interviewRounds.map((round) => (
                <option key={round.id} value={`Round ${round.roundNumber}`}>
                  Round {round.roundNumber} - {round.type.replace('_', ' ')}
                </option>
              ))}
            </select>
          ) : (
            <Input
              type="text"
              value={editStage}
              onChange={(e) => setEditStage(e.target.value)}
              placeholder="e.g., Phone screen, Final round"
            />
          )}
        </div>

        {/* Rejected date */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Rejection Date
          </label>
          <Input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
        </div>

        {/* Feedback received */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Feedback Received
          </label>
          <Textarea
            value={editFeedback}
            onChange={(e) => setEditFeedback(e.target.value)}
            placeholder="Any feedback they shared..."
            rows={3}
          />
        </div>

        {/* Lessons learned */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Lessons Learned
          </label>
          <Textarea
            value={editLessons}
            onChange={(e) => setEditLessons(e.target.value)}
            placeholder="What can you learn from this experience?"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Check className="w-4 h-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-red-50 to-slate-50 dark:from-red-950/30 dark:to-slate-900/50 rounded-xl border border-red-200 dark:border-red-900/50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <XCircle className="w-5 h-5" />
          <h3 className="font-semibold">Rejection Details</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleStartEdit}>
          <Pencil className="w-4 h-4 mr-1" />
          Edit
        </Button>
      </div>

      {/* Quick info row */}
      <div className="flex flex-wrap gap-3">
        {details.reason && (
          <Badge color="#ef4444">
            {REJECTION_REASON_LABELS[details.reason]}
          </Badge>
        )}
        {details.stageRejectedAt && (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Stage: {details.stageRejectedAt}
          </span>
        )}
        {details.rejectedAt && (
          <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
            <Calendar className="w-4 h-4" />
            {format(new Date(details.rejectedAt), 'MMM d, yyyy')}
          </span>
        )}
      </div>

      {/* Feedback */}
      {details.feedbackReceived && (
        <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Feedback Received
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
            {details.feedbackReceived}
          </p>
        </div>
      )}

      {/* Lessons Learned */}
      {details.lessonsLearned && (
        <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Lessons Learned
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
            {details.lessonsLearned}
          </p>
        </div>
      )}

      {/* Empty state if no details */}
      {!details.reason && !details.stageRejectedAt && !details.feedbackReceived && !details.lessonsLearned && !details.rejectedAt && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          No rejection details recorded. Click Edit to add information.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Offer Outcome Component
// ============================================================================

function OfferOutcome({ job }: { job: Job }) {
  const updateJob = useAppStore((state) => state.updateJob);
  const details = job.offerDetails || {};

  const [isEditing, setIsEditing] = useState(false);
  const [editBaseSalary, setEditBaseSalary] = useState(details.baseSalary?.toString() || '');
  const [editBonus, setEditBonus] = useState(details.bonus?.toString() || '');
  const [editBonusType, setEditBonusType] = useState<'percentage' | 'fixed'>(details.bonusType || 'fixed');
  const [editEquity, setEditEquity] = useState(details.equity || '');
  const [editBenefits, setEditBenefits] = useState(details.benefitsSummary || '');
  const [editOfferDeadline, setEditOfferDeadline] = useState(
    details.offerDeadline ? format(new Date(details.offerDeadline), 'yyyy-MM-dd') : ''
  );
  const [editStartDate, setEditStartDate] = useState(
    details.startDate ? format(new Date(details.startDate), 'yyyy-MM-dd') : ''
  );
  const [editOfferedAt, setEditOfferedAt] = useState(
    details.offeredAt ? format(new Date(details.offeredAt), 'yyyy-MM-dd') : ''
  );
  const [editNegotiationNotes, setEditNegotiationNotes] = useState(details.negotiationNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    setEditBaseSalary(details.baseSalary?.toString() || '');
    setEditBonus(details.bonus?.toString() || '');
    setEditBonusType(details.bonusType || 'fixed');
    setEditEquity(details.equity || '');
    setEditBenefits(details.benefitsSummary || '');
    setEditOfferDeadline(details.offerDeadline ? format(new Date(details.offerDeadline), 'yyyy-MM-dd') : '');
    setEditStartDate(details.startDate ? format(new Date(details.startDate), 'yyyy-MM-dd') : '');
    setEditOfferedAt(details.offeredAt ? format(new Date(details.offeredAt), 'yyyy-MM-dd') : '');
    setEditNegotiationNotes(details.negotiationNotes || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedDetails: OfferDetails = {};
      if (editBaseSalary) updatedDetails.baseSalary = parseFloat(editBaseSalary);
      if (editBonus) {
        updatedDetails.bonus = parseFloat(editBonus);
        updatedDetails.bonusType = editBonusType;
      }
      if (editEquity.trim()) updatedDetails.equity = editEquity.trim();
      if (editBenefits.trim()) updatedDetails.benefitsSummary = editBenefits.trim();
      if (editOfferDeadline) updatedDetails.offerDeadline = new Date(editOfferDeadline);
      if (editStartDate) updatedDetails.startDate = new Date(editStartDate);
      if (editOfferedAt) updatedDetails.offeredAt = new Date(editOfferedAt);
      if (editNegotiationNotes.trim()) updatedDetails.negotiationNotes = editNegotiationNotes.trim();

      await updateJob(job.id, { offerDetails: updatedDetails });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatBonus = (bonus: number, type?: 'percentage' | 'fixed') => {
    if (type === 'percentage') {
      return `${bonus}%`;
    }
    return formatCurrency(bonus);
  };

  if (isEditing) {
    return (
      <div className="p-6 bg-gradient-to-br from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-slate-900/50 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Gift className="w-5 h-5" />
            <h3 className="font-semibold">Edit Offer Details</h3>
          </div>
        </div>

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
                value={editBaseSalary}
                onChange={(e) => setEditBaseSalary(e.target.value)}
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
                  {editBonusType === 'percentage' ? '%' : '$'}
                </span>
                <Input
                  type="number"
                  value={editBonus}
                  onChange={(e) => setEditBonus(e.target.value)}
                  placeholder={editBonusType === 'percentage' ? 'e.g., 15' : 'e.g., 20000'}
                  className="pl-7"
                />
              </div>
              <select
                value={editBonusType}
                onChange={(e) => setEditBonusType(e.target.value as 'percentage' | 'fixed')}
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
            value={editEquity}
            onChange={(e) => setEditEquity(e.target.value)}
            placeholder="e.g., 0.5% over 4 years, $50k RSU"
          />
        </div>

        {/* Benefits summary */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Benefits Summary
          </label>
          <Textarea
            value={editBenefits}
            onChange={(e) => setEditBenefits(e.target.value)}
            placeholder="Health insurance, 401k match, PTO, etc."
            rows={2}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Offered Date
            </label>
            <Input
              type="date"
              value={editOfferedAt}
              onChange={(e) => setEditOfferedAt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Offer Deadline
            </label>
            <Input
              type="date"
              value={editOfferDeadline}
              onChange={(e) => setEditOfferDeadline(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
            />
          </div>
        </div>

        {/* Negotiation notes */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Negotiation Notes
          </label>
          <Textarea
            value={editNegotiationNotes}
            onChange={(e) => setEditNegotiationNotes(e.target.value)}
            placeholder="Notes about negotiation, counteroffers, etc."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Check className="w-4 h-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-slate-900/50 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Gift className="w-5 h-5" />
          <h3 className="font-semibold">Offer Details</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleStartEdit}>
          <Pencil className="w-4 h-4 mr-1" />
          Edit
        </Button>
      </div>

      {/* Compensation cards */}
      {(details.baseSalary || details.bonus || details.equity) && (
        <div className="grid grid-cols-3 gap-3">
          {details.baseSalary && (
            <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Base Salary</span>
              </div>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(details.baseSalary)}
              </p>
            </div>
          )}
          {details.bonus && (
            <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Bonus</span>
              </div>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {formatBonus(details.bonus, details.bonusType)}
              </p>
            </div>
          )}
          {details.equity && (
            <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <Award className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Equity</span>
              </div>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {details.equity}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Benefits summary */}
      {details.benefitsSummary && (
        <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Benefits
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
            {details.benefitsSummary}
          </p>
        </div>
      )}

      {/* Date row */}
      {(details.offeredAt || details.offerDeadline || details.startDate) && (
        <div className="flex flex-wrap gap-4">
          {details.offeredAt && (
            <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Offered: {format(new Date(details.offeredAt), 'MMM d, yyyy')}
            </span>
          )}
          {details.offerDeadline && (
            <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              <Clock className="w-4 h-4 text-amber-500" />
              Deadline: {format(new Date(details.offerDeadline), 'MMM d, yyyy')}
            </span>
          )}
          {details.startDate && (
            <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              <Briefcase className="w-4 h-4 text-blue-500" />
              Start: {format(new Date(details.startDate), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      )}

      {/* Negotiation notes */}
      {details.negotiationNotes && (
        <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Negotiation Notes
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
            {details.negotiationNotes}
          </p>
        </div>
      )}

      {/* Empty state if no details */}
      {!details.baseSalary && !details.bonus && !details.equity && !details.benefitsSummary &&
       !details.offerDeadline && !details.startDate && !details.negotiationNotes && !details.offeredAt && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          No offer details recorded. Click Edit to add information.
        </p>
      )}
    </div>
  );
}
