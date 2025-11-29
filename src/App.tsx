import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { BoardView } from './components/Board';
import { JobDetailView } from './components/JobDetail';
import { AddJobModal } from './components/AddJob';
import { SettingsModal } from './components/Settings';
import { ToastContainer } from './components/ui';

function App() {
  const { loadData, isLoading, selectedJobId, jobs, settings, openAddJobModal } = useAppStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Apply theme on load and changes
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Handle extension deep links via localStorage
  useEffect(() => {
    if (isLoading) return;

    const params = new URLSearchParams(window.location.search);

    if (params.get('from_extension') === '1') {
      window.history.replaceState({}, '', window.location.pathname);

      const tryLoadExtensionData = () => {
        const extData = localStorage.getItem('extension_jd');
        if (extData) {
          sessionStorage.setItem('extension_jd', extData);
          localStorage.removeItem('extension_jd');
          openAddJobModal();
          return true;
        }
        return false;
      };

      // Try immediately
      if (tryLoadExtensionData()) return;

      // Poll every 200ms for up to 5 seconds (extension may still be injecting data)
      let attempts = 0;
      const maxAttempts = 25;

      const pollInterval = setInterval(() => {
        attempts++;
        if (tryLoadExtensionData() || attempts >= maxAttempts) {
          clearInterval(pollInterval);
        }
      }, 200);

      return () => clearInterval(pollInterval);
    }
  }, [isLoading, openAddJobModal]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const selectedJob = selectedJobId ? jobs.find((j) => j.id === selectedJobId) : null;

  return (
    <>
      <BoardView />
      {selectedJob && <JobDetailView job={selectedJob} />}
      <AddJobModal />
      <SettingsModal />
      <ToastContainer />
    </>
  );
}

export default App;
