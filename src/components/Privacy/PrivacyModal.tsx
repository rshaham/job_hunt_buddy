import { Shield, Database, Key, Heart, Scale, Github, Globe } from 'lucide-react';
import { Modal } from '../ui';
import { useAppStore } from '../../stores/appStore';

export function PrivacyModal() {
  const { isPrivacyModalOpen, closePrivacyModal } = useAppStore();

  return (
    <Modal
      isOpen={isPrivacyModalOpen}
      onClose={closePrivacyModal}
      title="Privacy & Terms"
      size="lg"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Privacy & Security */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Privacy & Security
            </h2>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Database className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                  All Data Stays on Your Computer
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your jobs, resumes, cover letters, and notes are stored in your browser's local database (IndexedDB).
                  We don't have servers that store your information.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                  API Keys Are Private
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your API key is stored locally and only sent directly to your chosen AI provider
                  (Anthropic, Google, or your local Ollama instance). We never see or store your API keys.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                  No Tracking or Analytics
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  We don't use cookies, analytics, or any third-party tracking.
                  PDF parsing, resume analysis, and all processing happens entirely in your browser.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* External Services */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Optional External Services
            </h2>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
              Some optional features use external services that send data outside your browser:
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                <span>
                  <strong className="text-slate-900 dark:text-white">Job Finder</strong> — Uses SerApi to search job listings.
                  Your search query and location are sent to their servers.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                <span>
                  <strong className="text-slate-900 dark:text-white">Web Research</strong> — Uses Tavily for company research.
                  Research queries are processed externally.
                </span>
              </li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              These features require your explicit consent before use. You can enable or disable them in Settings.
              Your resume, cover letters, and other personal data are never sent to these services.
            </p>
          </div>
        </section>

        {/* Disclaimer */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Disclaimer
            </h2>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
              Job Hunt Buddy is provided <strong>free and open source</strong> as a service to the job-seeking community.
              By using this tool, you agree to:
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-2">
                <Heart className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Use it ethically and responsibly</strong> —
                  Be honest in your applications. AI-generated content should be reviewed and personalized before sending.
                  Don't misrepresent your qualifications or spam employers.
                </span>
              </li>
              <li className="flex gap-2">
                <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Accept it as-is</strong> —
                  We make no guarantees about effectiveness, accuracy, or job search outcomes.
                  This tool is meant to assist, not replace, your own judgment.
                </span>
              </li>
              <li className="flex gap-2">
                <Heart className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Respect the spirit of the project</strong> —
                  This is built to help people, not to game hiring systems or deceive employers.
                </span>
              </li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              We do not endorse any specific actions you take using this tool.
              Your job search decisions and how you represent yourself to employers are your responsibility.
            </p>
          </div>
        </section>

        {/* Open Source */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Github className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Open Source
            </h2>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Job Hunt Buddy is open source under the MIT License.
              You can view the source code, report issues, or contribute on GitHub.
            </p>
            <a
              href="https://github.com/rshaham/job_hunt_buddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-sm text-primary hover:underline"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </section>
      </div>
    </Modal>
  );
}
