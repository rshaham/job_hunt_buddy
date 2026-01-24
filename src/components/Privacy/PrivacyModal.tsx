import { Shield, Database, Key, Heart, Scale, Github, Globe, Lock, Eye, Server } from 'lucide-react';
import { Modal } from '../ui';
import { useAppStore } from '../../stores/appStore';

export function PrivacyModal() {
  const { isPrivacyModalOpen, closePrivacyModal } = useAppStore();

  return (
    <Modal
      isOpen={isPrivacyModalOpen}
      onClose={closePrivacyModal}
      title=""
      size="lg"
    >
      <div className="px-8 py-8 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3 tracking-tight">
            Privacy & Terms
          </h1>
          <p className="text-foreground-muted">
            How we protect your data and what we expect from you
          </p>
        </div>

        <div className="space-y-8 max-w-2xl mx-auto">
          {/* Privacy & Security */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Privacy & Security
              </h2>
            </div>

            <div className="space-y-4">
              <div className="group flex gap-4 p-5 rounded-xl bg-surface border border-border hover:border-emerald-500/30 transition-all duration-200">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    All Data Stays on Your Computer
                  </h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">
                    Your jobs, resumes, cover letters, and notes are stored in your browser's local database (IndexedDB).
                    We don't have servers that store your information.
                  </p>
                </div>
              </div>

              <div className="group flex gap-4 p-5 rounded-xl bg-surface border border-border hover:border-blue-500/30 transition-all duration-200">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    API Keys Are Private
                  </h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">
                    Your API key is stored locally and only sent directly to your chosen AI provider
                    (Anthropic, Google, or your local Ollama instance). We never see or store your API keys.
                  </p>
                </div>
              </div>

              <div className="group flex gap-4 p-5 rounded-xl bg-surface border border-border hover:border-purple-500/30 transition-all duration-200">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    No Tracking or Analytics
                  </h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">
                    We don't use cookies, analytics, or any third-party tracking.
                    PDF parsing, resume analysis, and all processing happens entirely in your browser.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* External Services */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Optional External Services
              </h2>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-foreground mb-4">
                Some optional features use external services that send data outside your browser:
              </p>
              <div className="space-y-3">
                <div className="flex gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/20">
                  <Server className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-foreground">Job Finder</span>
                    <span className="text-sm text-foreground-muted"> — Uses SerApi to search job listings.
                    Your search query and location are sent to their servers.</span>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/20">
                  <Globe className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-foreground">Web Research</span>
                    <span className="text-sm text-foreground-muted"> — Uses Tavily for company research.
                    Research queries are processed externally.</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-foreground-subtle mt-4">
                These features require your explicit consent before use. You can enable or disable them in Settings.
                Your resume, cover letters, and other personal data are never sent to these services.
              </p>
            </div>
          </section>

          {/* Disclaimer */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Disclaimer
              </h2>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-foreground mb-5">
                Job Hunt Buddy is provided <strong>free and open source</strong> as a service to the job-seeking community.
                By using this tool, you agree to:
              </p>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Use it ethically and responsibly</span>
                    <p className="text-sm text-foreground-muted mt-1">
                      Be honest in your applications. AI-generated content should be reviewed and personalized before sending.
                      Don't misrepresent your qualifications or spam employers.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Accept it as-is</span>
                    <p className="text-sm text-foreground-muted mt-1">
                      We make no guarantees about effectiveness, accuracy, or job search outcomes.
                      This tool is meant to assist, not replace, your own judgment.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Respect the spirit of the project</span>
                    <p className="text-sm text-foreground-muted mt-1">
                      This is built to help people, not to game hiring systems or deceive employers.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-foreground-subtle mt-5 p-3 rounded-lg bg-white/30 dark:bg-black/20">
                We do not endorse any specific actions you take using this tool.
                Your job search decisions and how you represent yourself to employers are your responsibility.
              </p>
            </div>
          </section>

          {/* Open Source */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-slate-700 dark:bg-slate-600 flex items-center justify-center">
                <Github className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Open Source
              </h2>
            </div>

            <div className="p-6 rounded-xl bg-surface border border-border">
              <p className="text-sm text-foreground-muted mb-4">
                Job Hunt Buddy is open source under the MIT License.
                You can view the source code, report issues, or contribute on GitHub.
              </p>
              <a
                href="https://github.com/rshaham/job_hunt_buddy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
              >
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}
