import React, { useState, useEffect, useRef } from 'react';
import { Book, AppSettings } from '../types';
import ActionButton from './ActionButton';
import { getCollectionNames, getCollection, saveCollection } from '../services/localLibraryService';
import { listFilesFromLibrary, downloadFileContent, uploadCsvToSupabase } from '../services/supabaseService';
import { convertToCSV, mergeBooks, parseCSV } from '../utils/csvHelper';
import Spinner from './Spinner';

interface ResultsDisplayProps {
  imageSrc: string | null;
  books: Book[];
  onReset: () => void;
  settings: AppSettings | null;
  lastSavedCollection: string | null;
  onSaveSuccess: (collectionName: string) => void;
  onLibraryUpdated?: () => void;
}

const ResultsDisplay = React.forwardRef<HTMLDivElement, ResultsDisplayProps>(
  ({ imageSrc, books, onReset, settings, lastSavedCollection, onSaveSuccess, onLibraryUpdated }, ref) => {
    const [showSaveUI, setShowSaveUI] = useState(false);
    const [saveMode, setSaveMode] = useState<'new' | 'existing'>('new');
    const [collections, setCollections] = useState<string[]>([]);
    const [collectionsLoading, setCollectionsLoading] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState('');
    const [newCollectionName, setNewCollectionName] = useState('');
    
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState<string>('');
    
    const saveUIRef = useRef<HTMLDivElement>(null);
    const useSupabase = !!(settings?.supabaseUrl && settings?.supabaseKey);

    const handleDownload = () => {
      const csvData = convertToCSV(books);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.href) {
        URL.revokeObjectURL(link.href);
      }
      link.href = URL.createObjectURL(blob);
      link.download = 'book_data.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleToggleSaveUI = () => {
        setShowSaveUI(!showSaveUI);
        setSaveStatus('idle');
        setSaveMessage('');
    };

    // Effect for scrolling when save UI is shown
    useEffect(() => {
      if (showSaveUI && saveUIRef.current) {
        setTimeout(() => {
          saveUIRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }, [showSaveUI]);

    // Effect 1: Fetch collections when the save UI is opened.
    useEffect(() => {
      if (!showSaveUI) {
          setCollections([]); // Clear collections when UI is hidden
          return;
      }

      const fetchCollections = async () => {
          setCollectionsLoading(true);
          try {
              let collectionNames: string[] = [];
              if (useSupabase) {
                  const files = await listFilesFromLibrary(settings.supabaseUrl!, settings.supabaseKey!);
                  collectionNames = files.map(f => f.name.replace(/\.csv$/, '')).sort();
              } else {
                  collectionNames = getCollectionNames();
              }
              setCollections(collectionNames);
          } catch (error) {
              setSaveStatus('error');
              const errorMessage = error instanceof Error ? `Error: ${error.message}` : 'Could not fetch existing collections.';
              setSaveMessage(errorMessage);
          } finally {
              setCollectionsLoading(false);
          }
      };

      fetchCollections();
    }, [showSaveUI, useSupabase, settings]);

    // Effect 2: Set the default selection state after collections have been loaded.
    useEffect(() => {
      if (collectionsLoading || !showSaveUI) {
        return; // Wait until loading is finished and UI is visible
      }

      const lastSavedExists = lastSavedCollection && collections.includes(lastSavedCollection);

      if (lastSavedExists) {
        setSaveMode('existing');
        setSelectedCollection(lastSavedCollection!);
      } else if (collections.length > 0) {
        setSaveMode('existing');
        setSelectedCollection(collections[0]);
      } else {
        setSaveMode('new');
        setSelectedCollection(''); // Clear selection if no collections exist
      }
    }, [collections, collectionsLoading, showSaveUI, lastSavedCollection]);


    const handleSaveToLibrary = async () => {
      setSaveStatus('saving');
      setSaveMessage('');
    
      try {
          const collectionName = saveMode === 'new' ? newCollectionName.trim() : selectedCollection;
          console.log('💾 Starting save:', { collectionName, saveMode, bookCount: books.length });
          
          if (!collectionName) {
              throw new Error(saveMode === 'new' ? "Please provide a name for the new collection." : "Please select a collection to add to.");
          }
    
          let finalBooks = books;
          let successMessage = '';
          
          if (useSupabase) {
              console.log('☁️ Using Supabase mode');
              console.log('🔑 Supabase URL:', settings?.supabaseUrl);
              console.log('🔑 Has Key:', !!settings?.supabaseKey);
              
              // Supabase Logic: Download, merge, upload
              if (saveMode === 'existing') {
                  console.log('📥 Downloading existing collection...');
                  const existingCsv = await downloadFileContent(`${collectionName}.csv`, settings!.supabaseUrl!, settings!.supabaseKey!);
                  console.log('✅ Downloaded existing CSV');
                  
                  const existingBooks = parseCSV(existingCsv);
                  console.log('📚 Existing books count:', existingBooks.length);
                  
                  const { mergedBooks, addedCount } = mergeBooks(existingBooks, books);
                  console.log('🔀 Merged books:', { total: mergedBooks.length, added: addedCount });
                  
                  finalBooks = mergedBooks;
                  successMessage = addedCount === 0 
                      ? `Collection "${collectionName}" is already up-to-date.`
                      : `Added ${addedCount} new book(s) to "${collectionName}". Total is now ${mergedBooks.length}.`;
              } else {
                  console.log('🆕 Creating new collection');
                  successMessage = `Successfully created and saved to "${collectionName}".`;
              }
              
              const csvData = convertToCSV(finalBooks);
              console.log('📝 CSV data length:', csvData.length);
              console.log('📤 Uploading to Supabase...');
              
              await uploadCsvToSupabase(csvData, `${collectionName}.csv`, settings!.supabaseUrl!, settings!.supabaseKey!);
              console.log('✅ Upload complete!');
          } else {
              // Local Storage Logic
              if (saveMode === 'existing') {
                  const existingBooks = getCollection(collectionName) || [];
                  const { mergedBooks, addedCount } = mergeBooks(existingBooks, books);
                  finalBooks = mergedBooks;
                  successMessage = addedCount === 0
                      ? `Collection "${collectionName}" is already up-to-date.`
                      : `Added ${addedCount} new book(s) to "${collectionName}". Total is now ${mergedBooks.length}.`;
              } else {
                  successMessage = `Successfully created and saved to "${collectionName}".`;
              }
              saveCollection(collectionName, finalBooks);
          }
    
          console.log('🎉 Save successful!');
          setSaveStatus('success');
          setSaveMessage(successMessage);
          onSaveSuccess(collectionName);
          
          console.log('🔔 Calling onLibraryUpdated');
          onLibraryUpdated?.();
          console.log('✅ onLibraryUpdated called');
          
          setNewCollectionName('');
    
          setTimeout(() => {
              onReset();
          }, 2500);
    
      } catch (err) {
        console.error('❌ Save failed:', err);
        setSaveStatus('error');
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setSaveMessage(`Save failed: ${errorMessage}`);
        console.error(err);
      }
    };


    return (
      <div ref={ref} className={`grid grid-cols-1 ${imageSrc ? 'lg:grid-cols-2' : ''} gap-8 animate-fade-in`}>
        {imageSrc && (
          <div className="flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-4 text-gray-300">Your Uploaded Image</h3>
            <img 
              src={imageSrc} 
              alt="Uploaded books" 
              className="rounded-lg shadow-lg max-h-[500px] w-auto object-contain"
            />
          </div>
        )}
        <div className={!imageSrc ? 'col-span-1' : ''}>
          <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-md mb-6" role="alert">
            <p className="font-bold">Success!</p>
            <p className="text-sm">Successfully identified and processed {books.length} book(s).</p>
          </div>
          
          <div className="overflow-x-auto bg-gray-900/60 rounded-lg border border-gray-700">
            <table className="min-w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-200 uppercase bg-gray-700/50">
                <tr>
                  <th scope="col" className="px-6 py-3">Title</th>
                  <th scope="col" className="px-6 py-3">Author</th>
                  <th scope="col" className="px-6 py-3">First Published</th>
                  <th scope="col" className="px-6 py-3">Genre</th>
                  <th scope="col" className="px-6 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book, index) => (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium text-white">{book.title}</td>
                    <td className="px-6 py-4">{book.author}</td>
                    <td className="px-6 py-4">{book.publicationYear}</td>
                    <td className="px-6 py-4">{book.genre}</td>
                    <td className="px-6 py-4 text-gray-400 italic text-xs">{book.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <ActionButton onClick={handleDownload} text="Download CSV" primary={false} />
            <ActionButton onClick={handleToggleSaveUI} text="Save to Library" primary={false} />
            <ActionButton onClick={onReset} text="Add More Books" primary={true} />
          </div>

          {showSaveUI && (
            <div ref={saveUIRef} className="mt-6 p-6 bg-gray-900/50 rounded-lg border border-gray-700 animate-fade-in">
                <h4 className="text-lg font-semibold text-gray-200 mb-4">Save to {useSupabase ? 'Cloud' : 'Local'} Library</h4>
                {collectionsLoading ? <Spinner message="Loading collections..." /> : (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <button onClick={() => setSaveMode('new')} className={`px-4 py-2 text-sm rounded-md flex-1 transition ${saveMode === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Create New Collection</button>
                            <button onClick={() => setSaveMode('existing')} disabled={collections.length === 0} className={`px-4 py-2 text-sm rounded-md flex-1 transition ${saveMode === 'existing' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'}`}>Add to Existing</button>
                        </div>
                        
                        {saveMode === 'new' ? (
                            <div>
                                <label htmlFor="collectionName" className="block text-sm font-medium text-gray-300 mb-1">New Collection Name</label>
                                <input type="text" id="collectionName" value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)} placeholder="e.g., My Sci-Fi Books" className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-2 focus:ring-blue-500"/>
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="selectCollection" className="block text-sm font-medium text-gray-300 mb-1">Select Collection</label>
                                {collections.length > 0 ? (
                                  <select id="selectCollection" value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-2 focus:ring-blue-500">
                                      {collections.map(name => <option key={name} value={name}>{name}</option>)}
                                  </select>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">No existing collections found. Create a new one to get started.</p>
                                )}
                            </div>
                        )}
                        <div className="pt-2">
                          <ActionButton 
                            onClick={handleSaveToLibrary} 
                            text={saveStatus === 'saving' ? 'Saving...' : 'Confirm Save'} 
                            primary 
                            disabled={saveStatus === 'saving' || (saveMode === 'existing' && collections.length === 0)}
                          />
                        </div>
                    </div>
                )}
                
                {saveStatus !== 'idle' && (
                    <div className={`mt-4 px-4 py-3 rounded-md text-sm text-center transition-all duration-300
                      ${saveStatus === 'success' ? 'bg-green-900/50 border border-green-700 text-green-300' : ''}
                      ${saveStatus === 'error' ? 'bg-red-900/50 border border-red-700 text-red-300' : ''}
                      ${saveStatus === 'saving' ? 'bg-blue-900/50 border border-blue-700 text-blue-300' : ''}
                    `}>
                      {saveStatus === 'saving' && <div className="flex items-center justify-center gap-2"><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Saving data...</span></div>}
                      {saveMessage}
                    </div>
                  )}
            </div>
          )}

        </div>
      </div>
    );
  }
);

export default ResultsDisplay;
