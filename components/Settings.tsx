import React, { useState } from 'react';
import { AppSettings } from '../types';
import ActionButton from './ActionButton';
import { testSupabaseConnection } from '../services/supabaseService';

interface SettingsProps {
  initialSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ initialSettings, onSave }) => {
  const [apiKey, setApiKey] = useState(initialSettings.apiKey || '');
  const [supabaseUrl, setSupabaseUrl] = useState(initialSettings.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState(initialSettings.supabaseKey || '');
  const [saveMessage, setSaveMessage] = useState<string>('');

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleSave = () => {
    onSave({
      apiKey: apiKey.trim() || undefined,
      supabaseUrl: supabaseUrl.trim() || undefined,
      supabaseKey: supabaseKey.trim() || undefined,
    });
    setSaveMessage('Settings saved!');
    setTimeout(() => setSaveMessage(''), 3000); // Clear message after 3 seconds
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    const result = await testSupabaseConnection(supabaseUrl.trim(), supabaseKey.trim());
    if (result.success) {
      setTestStatus('success');
    } else {
      setTestStatus('error');
    }
    setTestMessage(result.message);
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
        <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
                Configuration
            </h1>
            <p className="mt-2 text-lg text-gray-400">
                Configure settings for the application. Your Gemini API Key is required.
            </p>
        </header>

        <div className="space-y-8">
            {/* Gemini Settings */}
            <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
                <h2 className="text-xl font-semibold text-gray-200 mb-2">Gemini AI Settings</h2>
                <p className="mt-1 text-sm text-gray-500 mb-4">
                    This key is required to identify books from images. You can get one from Google AI Studio. The key is stored only in your browser's local storage.
                </p>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
                    Your Gemini API Key (Required)
                </label>
                <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your Gemini API key"
                />
            </div>

            {/* Supabase Settings */}
            <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
                <h2 className="text-xl font-semibold text-gray-200 mb-2">Cloud Library Storage (Optional)</h2>
                <p className="mt-1 text-sm text-gray-500 mb-4">
                    Optionally, provide your Supabase project details to save your library to the cloud and sync across devices. If left blank, your library will be saved locally in your browser.
                    Requires a Supabase project with a storage bucket named <code className="text-xs bg-gray-700 p-1 rounded">library</code>.
                </p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="supabaseUrl" className="block text-sm font-medium text-gray-300 mb-2">
                            Supabase Project URL
                        </label>
                        <input
                            type="text"
                            id="supabaseUrl"
                            value={supabaseUrl}
                            onChange={(e) => setSupabaseUrl(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="https://your-project-id.supabase.co"
                        />
                    </div>
                    <div>
                        <label htmlFor="supabaseKey" className="block text-sm font-medium text-gray-300 mb-2">
                            Supabase Anon Key
                        </label>
                        <input
                            type="password"
                            id="supabaseKey"
                            value={supabaseKey}
                            onChange={(e) => setSupabaseKey(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your Supabase public anon key"
                        />
                    </div>
                </div>
                <div className="mt-6">
                    <ActionButton
                        onClick={handleTestConnection}
                        text={testStatus === 'testing' ? 'Testing...' : 'Test Supabase Connection'}
                        disabled={testStatus === 'testing' || !supabaseUrl.trim() || !supabaseKey.trim()}
                        primary={false}
                    />
                </div>
                 {testStatus !== 'idle' && (
                    <div className={`mt-4 px-4 py-3 rounded-md text-sm text-center transition-all duration-300
                      ${testStatus === 'success' ? 'bg-green-900/50 border border-green-700 text-green-300' : ''}
                      ${testStatus === 'error' ? 'bg-red-900/50 border border-red-700 text-red-300' : ''}
                      ${testStatus === 'testing' ? 'bg-blue-900/50 border border-blue-700 text-blue-300' : ''}
                    `}>
                      {testStatus === 'testing' ? (
                           <div className="flex items-center justify-center gap-2">
                               <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                               <span>Testing connection...</span>
                           </div>
                      ) : (
                          <span>{testMessage}</span>
                      )}
                    </div>
                  )}
            </div>

            <div className="flex justify-end items-center gap-4 pt-4">
                {saveMessage && <p className="text-sm text-green-400 animate-fade-in">{saveMessage}</p>}
                <ActionButton 
                    onClick={handleSave} 
                    text={"Save Settings"} 
                    primary={true} 
                />
            </div>
        </div>
    </div>
  );
};

export default Settings;
