import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppView, AppSettings } from './types';
import Navigation from './components/Navigation';
import Settings from './components/Settings';
import UploadView from './components/UploadView';
import LibraryViewer from './components/LibraryViewer';
import Spinner from './components/Spinner';

// Extend AppSettings to include Supabase credentials
interface ExtendedAppSettings extends AppSettings {
  supabaseUrl: string;
  supabaseKey: string;
  apiKey?: string; // Existing apiKey for Gemini or other services
}

// Module-level cache for the Supabase client
let supabaseInstance: SupabaseClient | null = null;
let lastSupabaseUrl: string | null = null;
let lastSupabaseKey: string | null = null;

const getSupabaseClient = (supabaseUrl: string, supabaseKey: string): SupabaseClient => {
  if (supabaseInstance && lastSupabaseUrl === supabaseUrl && lastSupabaseKey === supabaseKey) {
    return supabaseInstance;
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key not provided.");
  }

  lastSupabaseUrl = supabaseUrl;
  lastSupabaseKey = supabaseKey;
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<ExtendedAppSettings | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('upload');
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    // Load settings from localStorage
    try {
      const storedSettings = localStorage.getItem('appSettings');
      let parsedSettings: ExtendedAppSettings;
      if (storedSettings) {
        parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
        if (!parsedSettings.supabaseKey || !parsedSettings.supabaseUrl) {
          setCurrentView('settings');
        }
      } else {
        parsedSettings = {
          supabaseUrl: process.env.REACT_APP_SUPABASE_URL || '',
          supabaseKey: process.env.REACT_APP_SUPABASE_KEY || '',
        };
        setSettings(parsedSettings);
        setCurrentView('settings');
      }

      // Initialize Supabase client
      try {
        const client = getSupabaseClient(parsedSettings.supabaseUrl, parsedSettings.supabaseKey);
        setSupabaseClient(client);

        // Restore session
        client.auth.getSession().then(({ data: { session }, error }) => {
          if (error) {
            console.error("Error restoring session:", error);
            return;
          }
          console.log("Session restored:", session ? "Active" : "None");
        });

        // Listen for auth state changes
        client.auth.onAuthStateChange((event, session) => {
          console.log("Auth state changed:", event, session);
        });
      } catch (error) {
        console.error("Failed to initialize Supabase client:", error);
        setCurrentView('settings');
      }
    } catch (e) {
      console.error("Could not parse settings from localStorage", e);
      setSettings({
        supabaseUrl: process.env.REACT_APP_SUPABASE_URL || '',
        supabaseKey: process.env.REACT_APP_SUPABASE_KEY || '',
      });
      setCurrentView('settings');
    }
  }, []);

  const handleSaveSettings = (newSettings: ExtendedAppSettings) => {
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
    setSettings(newSettings);
    // Reinitialize Supabase client if credentials changed
    try {
      const client = getSupabaseClient(newSettings.supabaseUrl, newSettings.supabaseKey);
      setSupabaseClient(client);
    } catch (error) {
      console.error("Failed to reinitialize Supabase client:", error);
    }
    if (currentView === 'settings' && newSettings.supabaseKey && newSettings.supabaseUrl) {
      setCurrentView('upload');
    }
  };

  const handleLibraryUpdated = () => {
    setLibraryRefreshKey(prev => prev + 1);
  };

  const renderCurrentView = () => {
    if (!settings || !supabaseClient) return null;

    switch (currentView) {
      case 'settings':
        return <Settings initialSettings={settings} onSave={handleSaveSettings} />;
      case 'upload':
        return <UploadView settings={settings} supabaseClient={supabaseClient} onLibraryUpdated={handleLibraryUpdated} />;
      case 'library':
        return <LibraryViewer settings={settings} supabaseClient={supabaseClient} key={libraryRefreshKey} />;
      default:
        return null;
    }
  };

  if (settings === null || supabaseClient === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Spinner message="Loading configuration..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <Navigation currentView={currentView} onNavigate={setCurrentView} />
        <main className="bg-gray-800/50 rounded-xl shadow-2xl p-6 md:p-10 border border-gray-700 mt-8">
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
