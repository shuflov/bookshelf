
import React, { useState, useEffect, useCallback } from 'react';
import { AppView, AppSettings } from './types';
import Navigation from './components/Navigation';
import Settings from './components/Settings';
import UploadView from './components/UploadView';
import LibraryViewer from './components/LibraryViewer';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('upload');

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('appSettings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
        // Restore check for apiKey. Force user to settings if it's missing.
        if (!parsedSettings.apiKey) {
          setCurrentView('settings');
        }
      } else {
        // No settings found, start on the settings page.
        setSettings({});
        setCurrentView('settings');
      }
    } catch (e) {
      console.error("Could not parse settings from localStorage", e);
      setSettings({});
      setCurrentView('settings');
    }
  }, []);

  const handleSaveSettings = (newSettings: AppSettings) => {
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
    setSettings(newSettings);
    // If we were on the settings page, move to the upload page after saving, but only if the API key is now present.
    if (currentView === 'settings' && newSettings.apiKey) {
      setCurrentView('upload');
    }
  };

  const renderCurrentView = () => {
    if (!settings) return null; // Should be covered by the main loading spinner

    switch (currentView) {
      case 'settings':
        return <Settings initialSettings={settings} onSave={handleSaveSettings} />;
      case 'upload':
        return <UploadView settings={settings} />;
      case 'library':
        return <LibraryViewer settings={settings} />;
      default:
        return null;
    }
  };
  
  if (settings === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Spinner message="Loading configuration..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <Navigation 
          currentView={currentView}
          onNavigate={setCurrentView}
        />
        <main className={`bg-gray-800/50 rounded-xl shadow-2xl p-6 md:p-10 border border-gray-700 mt-8`}>
          {renderCurrentView()}
        </main>
        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by Google Gemini AI</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
