import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { BoardView } from './components/Board';
import { JobDetailView } from './components/JobDetail';
import { AddJobModal } from './components/AddJob';
import { SettingsModal } from './components/Settings';

function App() {
  const { loadData, isLoading, selectedJobId, jobs, settings } = useAppStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Apply theme on load and changes
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

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
    </>
  );
}

export default App;
