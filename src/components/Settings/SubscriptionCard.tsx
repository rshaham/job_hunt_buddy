import { useState } from 'react';
import { CreditCard, CheckCircle, AlertTriangle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { Button, Input } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { showToast } from '../../stores/toastStore';
import type { Subscription, SubscriptionStatus } from '../../types';

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: 'Active', color: 'text-green-600 dark:text-green-400', icon: CheckCircle },
  trialing: { label: 'Trial', color: 'text-blue-600 dark:text-blue-400', icon: CheckCircle },
  past_due: { label: 'Past Due', color: 'text-amber-600 dark:text-amber-400', icon: AlertTriangle },
  inactive: { label: 'Inactive', color: 'text-slate-500', icon: AlertTriangle },
  canceled: { label: 'Canceled', color: 'text-red-600 dark:text-red-400', icon: AlertTriangle },
};

export function SubscriptionCard() {
  const { settings, updateSettings } = useAppStore();
  const subscription = settings.subscription;

  const [isLoading, setIsLoading] = useState(false);
  const [restoreEmail, setRestoreEmail] = useState('');
  const [showRestoreForm, setShowRestoreForm] = useState(false);

  const handleSubscribe = async (trial = false) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: restoreEmail || undefined,
          trial,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'Already subscribed' && data.customerId) {
          // Auto-restore if already subscribed
          await handleLookupByCustomerId(data.customerId);
          return;
        }
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Checkout failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreAccess = async () => {
    if (!restoreEmail) {
      showToast('Please enter your subscription email', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: restoreEmail }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Email not found');
      }

      const data: Subscription = await response.json();
      await updateSettings({
        subscription: data,
        activeProvider: 'managed',
      });

      setShowRestoreForm(false);
      setRestoreEmail('');
      showToast('Access restored! You can now use Pro features.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to restore access', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLookupByCustomerId = async (customerId: string) => {
    try {
      const response = await fetch('/api/stripe/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      if (response.ok) {
        const data: Subscription = await response.json();
        await updateSettings({
          subscription: data,
          activeProvider: 'managed',
        });
        showToast('Subscription restored!', 'success');
      }
    } catch {
      // Silent fail for auto-restore
    }
  };

  const handleManageSubscription = async () => {
    if (!subscription?.customerId) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: subscription.customerId }),
      });

      if (!response.ok) {
        throw new Error('Failed to open billing portal');
      }

      const { url } = await response.json();
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to open portal', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!subscription?.email) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscription.email }),
      });

      if (response.ok) {
        const data: Subscription = await response.json();
        await updateSettings({ subscription: data });
        showToast('Status refreshed', 'success');
      } else {
        const data = await response.json();
        if (data.error === 'No active subscription found') {
          await updateSettings({ subscription: undefined, activeProvider: 'anthropic' });
          showToast('Subscription has ended', 'warning');
        }
      }
    } catch (error) {
      showToast('Failed to refresh status', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await updateSettings({
      subscription: undefined,
      activeProvider: 'anthropic',
    });
    showToast('Switched back to BYO API key mode', 'success');
  };

  // Usage percentage
  const usagePercent = subscription
    ? Math.min(100, (subscription.tokensUsed / subscription.tokenLimit) * 100)
    : 0;

  const isNearLimit = usagePercent >= 80;

  // If subscribed, show subscription status
  if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
    const statusConfig = STATUS_CONFIG[subscription.status];
    const StatusIcon = statusConfig.icon;

    return (
      <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-primary/20 rounded-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="font-medium text-slate-800 dark:text-slate-200">Pro Subscription</span>
          </div>
          <div className={`flex items-center gap-1.5 text-sm ${statusConfig.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusConfig.label}
          </div>
        </div>

        {/* Usage Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
            <span>Token Usage</span>
            <span className={isNearLimit ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
              {subscription.tokensUsed.toLocaleString()} / {subscription.tokenLimit.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isNearLimit ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {isNearLimit && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {usagePercent >= 100 ? 'Limit reached. Resets next billing cycle.' : 'Approaching limit'}
            </p>
          )}
        </div>

        {/* Account Info */}
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          <p>{subscription.email}</p>
          {subscription.currentPeriodEnd && (
            <p>Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleManageSubscription}
            disabled={isLoading}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            Manage Billing
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="text-slate-500 hover:text-slate-700"
          >
            Use BYO Key
          </Button>
        </div>
      </div>
    );
  }

  // Not subscribed - show subscribe options
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-primary" />
        <span className="font-medium text-slate-800 dark:text-slate-200">Pro Plan - $15/month</span>
      </div>

      <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5 mb-4">
        <li className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          No API key needed
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          1,000,000 tokens/month
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          Includes web research & job search
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          Cancel anytime
        </li>
      </ul>

      {showRestoreForm ? (
        <div className="space-y-3">
          <Input
            type="email"
            placeholder="Enter your subscription email"
            value={restoreEmail}
            onChange={(e) => setRestoreEmail(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleRestoreAccess}
              disabled={isLoading || !restoreEmail}
              className="flex-1"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Restore Access
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowRestoreForm(false);
                setRestoreEmail('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={() => handleSubscribe(true)}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Start Free Trial
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSubscribe(false)}
              disabled={isLoading}
            >
              Subscribe
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setShowRestoreForm(true)}
            className="w-full text-center text-xs text-primary hover:underline"
          >
            Already subscribed? Restore access
          </button>
        </div>
      )}
    </div>
  );
}
