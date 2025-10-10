import React, { useState } from 'react';
import { AppSettings } from '../types';
import ActionButton from './ActionButton';

interface SettingsProps {
  initialSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ initialSettings, onSave }) => {
  const [apiKey, setApiKey] = useState(initialSettings.apiKey || '');
  const [supabaseUrl, setSupabaseUrl] = useState(initialSettings.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState(initialSettings.supabaseKey || '');

  const handleSave = () => {
    onSave({
      apiKey: apiKey.trim() || undefined,
      supabaseUrl: supabaseUrl.trim() || undefined,
      supabaseKey: supabaseKey.trim() || undefined,
    });
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
            </div>

            <div className="flex justify-end gap-4 pt-4">
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
