import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppSettings, Book } from '../types';
import { 
    getCollectionNames, 
    getCollection, 
    deleteCollection, 
    saveCollection, 
    getAllBooks as getAllLocalBooks
} from '../services/localLibraryService';
import { 
    listFilesFromLibrary, 
    downloadFileContent, 
    deleteFileFromLibrary,
    uploadCsvToSupabase
} from '../services/supabaseService';
import { parseCSV, convertToCSV } from '../utils/csvHelper';
import Spinner from './Spinner';
import ActionButton from './ActionButton';

interface LibraryViewerProps {
    settings: AppSettings | null;
}

const LibraryViewer: React.FC<LibraryViewerProps> = ({ settings }) => {
    const [collections, setCollections] = useState<string[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState<'list' | 'content' | false>(false);
    const [error, setError] = useState<string | null>(null);
    const [isViewAllActive, setIsViewAllActive] = useState<boolean>(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
    const [bookCounts, setBookCounts] = useState<Record<string, number>>({});
    
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState<string>('');
    
    const useSupabase = !!(settings?.supabaseUrl && settings?.supabaseKey);

    const totalBooks = useMemo(() => {
        if (collections.length === 0) return 0;
        return Object.values(bookCounts).reduce((sum, count) => sum + count, 0);
    }, [bookCounts, collections]);
    
    const loadCollections = useCallback(async () => {
        setLoading('list');
        setError(null);
        try {
            const counts: Record<string, number> = {};
            let names: string[];
            if (useSupabase) {
                const files = await listFilesFromLibrary(settings!.supabaseUrl!, settings!.supabaseKey!);
                names = files.map(f => f.name.replace(/\.csv$/, ''));
                // Fetch content to get counts - could be slow for many files
                const countPromises = files.map(async (file) => {
                    const content = await downloadFileContent(file.name, settings!.supabaseUrl!, settings!.supabaseKey!);
                    return { name: file.name.replace(/\.csv$/, ''), count: parseCSV(content).length };
                });
                const resolvedCounts = await Promise.all(countPromises);
                resolvedCounts.forEach(item => {
                    counts[item.name] = item.count;
                });
            } else {
                names = getCollectionNames();
                names.forEach(name => {
                    counts[name] = (getCollection(name) || []).length;
                });
            }
            setCollections(names.sort((a, b) => a.localeCompare(b)));
            setBookCounts(counts);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to load library: ${errorMessage}`);
        } finally {
            setLoading(false);
            setInitialLoadComplete(true);
        }
    }, [useSupabase, settings]);

    const handleViewAll = useCallback(async () => {
        setLoading('content');
        setSelectedCollection(null);
        setIsViewAllActive(true);
        setIsEditMode(false);
        setError(null);
        setBooks([]);

        try {
            let allBooks: Book[];
            if (useSupabase) {
                const files = await listFilesFromLibrary(settings!.supabaseUrl!, settings!.supabaseKey!);
                const contentPromises = files.map(f => downloadFileContent(f.name, settings!.supabaseUrl!, settings!.supabaseKey!));
                const allCsvs = await Promise.all(contentPromises);
                allBooks = allCsvs.flatMap(csv => parseCSV(csv));
            } else {
                allBooks = getAllLocalBooks();
            }
            setBooks(allBooks);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to load all collections: ${errorMessage}`);
            setBooks([]);
            setIsViewAllActive(false);
        } finally {
            setLoading(false);
        }
    }, [useSupabase, settings]);

    useEffect(() => {
        loadCollections();
    }, [loadCollections]);

    useEffect(() => {
        if (initialLoadComplete && collections.length > 0 && !isViewAllActive && !selectedCollection) {
            handleViewAll();
        } else if (initialLoadComplete && collections.length === 0) {
            setBooks([]);
        }
    }, [initialLoadComplete, collections, isViewAllActive, selectedCollection, handleViewAll]);

    const handleCollectionSelect = async (name: string, editMode = false) => {
        setLoading('content');
        setSelectedCollection(name);
        setIsViewAllActive(false);
        setIsEditMode(editMode);
        setError(null);
        setSaveState('idle');

        try {
            let collectionBooks: Book[];
            if (useSupabase) {
                const csvContent = await downloadFileContent(`${name}.csv`, settings!.supabaseUrl!, settings!.supabaseKey!);
                collectionBooks = parseCSV(csvContent);
            } else {
                collectionBooks = getCollection(name) || [];
            }
            setBooks(collectionBooks);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to load collection content: ${errorMessage}`);
            setBooks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (collectionName: string) => {
        if (window.confirm(`Are you sure you want to delete "${collectionName}"? This action cannot be undone.`)) {
            try {
                if (useSupabase) {
                    await deleteFileFromLibrary(`${collectionName}.csv`, settings!.supabaseUrl!, settings!.supabaseKey!);
                } else {
                    deleteCollection(collectionName);
                }
                handleRefresh();
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                setError(`Failed to delete collection: ${errorMessage}`);
            }
        }
    };
    
    const handleRefresh = () => {
        setSelectedCollection(null);
        setBooks([]);
        setIsViewAllActive(false);
        setIsEditMode(false);
        setInitialLoadComplete(false);
        setBookCounts({});
        loadCollections();
    };

    const handleBookChange = (index: number, field: keyof Book, value: string | number) => {
        const updatedBooks = [...books];
        updatedBooks[index] = { ...updatedBooks[index], [field]: value };
        setBooks(updatedBooks);
    };

    const handleDeleteBook = (index: number) => {
        setBooks(books.filter((_, i) => i !== index));
    };

    const handleAddBook = () => {
        setBooks([...books, { title: '', author: '', publicationYear: '', genre: '', description: '' }]);
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setSaveState('idle');
        if (selectedCollection) {
            handleCollectionSelect(selectedCollection, false);
        }
    };

    const handleSaveChanges = async () => {
        if (!selectedCollection) return;
        
        setSaveState('saving');
        setSaveMessage('Saving changes...');
        
        try {
            if (useSupabase) {
                const csvData = convertToCSV(books);
                await uploadCsvToSupabase(csvData, `${selectedCollection}.csv`, settings!.supabaseUrl!, settings!.supabaseKey!);
            } else {
                saveCollection(selectedCollection, books);
            }

            setSaveState('success');
            setSaveMessage('Collection updated successfully!');
            setBookCounts(prev => ({...prev, [selectedCollection]: books.length}));
            
            setTimeout(() => {
                setIsEditMode(false);
                setSaveState('idle');
            }, 2000);
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setSaveState('error');
            setSaveMessage(`Save failed: ${errorMessage}`);
        }
    };

    if (loading === 'list' && !initialLoadComplete) {
        return <Spinner message={`Loading your ${useSupabase ? 'cloud' : 'local'} library...`} />;
    }

    if (error && collections.length === 0) {
        return (
            <div className="text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <ActionButton onClick={loadCollections} text="Retry" primary />
            </div>
        );
    }
    
    const renderTable = () => {
        if (isEditMode) {
            return (
                <div className="space-y-4">
                     <div className="flex flex-col sm:flex-row gap-4">
                        <ActionButton onClick={handleSaveChanges} text={saveState === 'saving' ? 'Saving...' : 'Save Changes'} primary disabled={saveState === 'saving'} />
                        <ActionButton onClick={handleCancelEdit} text="Cancel" disabled={saveState === 'saving'} />
                    </div>
                     {saveState !== 'idle' && (
                        <div className={`px-4 py-3 rounded-md text-sm text-center transition-all duration-300
                            ${saveState === 'success' ? 'bg-green-900/50 border border-green-700 text-green-300' : ''}
                            ${saveState === 'error' ? 'bg-red-900/50 border border-red-700 text-red-300' : ''}
                            ${saveState === 'saving' ? 'bg-blue-900/50 border border-blue-700 text-blue-300' : ''}
                        `}>
                            {saveMessage}
                        </div>
                    )}
                    <div className="overflow-x-auto bg-gray-900/60 rounded-lg border border-gray-700">
                        <table className="min-w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-gray-200 uppercase bg-gray-700/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Title</th>
                                    <th scope="col" className="px-6 py-3">Author</th>
                                    <th scope="col" className="px-6 py-3">Published</th>
                                    <th scope="col" className="px-6 py-3">Genre</th>
                                    <th scope="col" className="px-6 py-3">Description</th>
                                    <th scope="col" className="px-1 py-3 text-center">Del</th>
                                </tr>
                            </thead>
                            <tbody>
                                {books.map((book, index) => (
                                    <tr key={index} className="border-b border-gray-700">
                                        {[ 'title', 'author', 'publicationYear', 'genre', 'description' ].map((field) => (
                                            <td key={field} className="px-2 py-1 sm:px-6 sm:py-2">
                                                <input
                                                    type="text"
                                                    value={book[field as keyof Book]}
                                                    onChange={(e) => handleBookChange(index, field as keyof Book, e.target.value)}
                                                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </td>
                                        ))}
                                        <td className="px-1 py-1 text-center align-middle">
                                            <button onClick={() => handleDeleteBook(index)} className="text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-red-900/50">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <ActionButton onClick={handleAddBook} text="Add Book" />
                </div>
            );
        }

        return (
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
        );
    };

    return (
        <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-200">
                    My Library <span className="text-sm font-normal text-gray-400">({useSupabase ? 'Cloud' : 'Local'})</span>
                </h2>
                <button onClick={handleRefresh} className="p-2 text-gray-400 hover:text-white transition-colors duration-200" aria-label="Refresh library list">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 9.5M20 20l-1.5-1.5A9 9 0 003.5 14.5" /></svg>
                </button>
            </div>

            {error && <p className="text-red-400 mb-4 text-center">{error}</p>}

            {collections.length === 0 && !loading && (
                 <div className="text-center py-10 px-4 bg-gray-900/50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0A2.25 2.25 0 015.625 7.5h12.75c1.131 0 2.162.8 2.344 1.932m-16.5 0a2.25 2.25 0 00-1.883 2.542m16.5 0a2.25 2.25 0 01-1.883 2.542m0 0v6a2.25 2.25 0 01-2.25 2.25H5.625a2.25 2.25 0 01-2.25-2.25v-6m16.5 0v-2.25a2.25 2.25 0 00-2.25-2.25H5.625a2.25 2.25 0 00-2.25 2.25v2.25" /></svg>
                    <h3 className="mt-2 text-lg font-medium text-white">Your library is empty.</h3>
                    <p className="mt-1 text-sm text-gray-400">Go to "Add Books" to create your first collection.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {collections.length > 0 && (
                    <div className="md:col-span-1 bg-gray-900/50 rounded-lg border border-gray-700 p-4 h-fit max-h-[70vh] overflow-y-auto">
                        <h3 className="font-semibold text-gray-300 mb-2 text-sm uppercase tracking-wider">Collections</h3>
                         <button 
                            onClick={handleViewAll} 
                            disabled={collections.length === 0}
                            className={`w-full text-left p-2 rounded-md mb-2 font-semibold transition-colors flex items-center justify-between gap-2 ${
                                isViewAllActive 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                <span>View All</span>
                            </div>
                            <span className="text-xs font-mono bg-gray-800/50 px-1.5 py-0.5 rounded">
                                {totalBooks}
                            </span>
                        </button>
                        <div className="border-t border-gray-700 my-2"></div>
                        <ul>
                            {collections.map(name => (
                                <li key={name} className="group flex justify-between items-center rounded-md hover:bg-blue-900/50 transition-colors">
                                    <button onClick={() => handleCollectionSelect(name, false)} className={`w-full text-left p-2 rounded-md flex items-center justify-between ${!isViewAllActive && selectedCollection === name ? 'text-blue-400 font-semibold' : 'text-gray-300'}`}>
                                        <span className="truncate pr-2">{name}</span>
                                        <span className="flex-shrink-0 text-xs text-gray-500 font-normal group-hover:text-gray-300">
                                            {bookCounts[name] !== undefined ? bookCounts[name] : '...'}
                                        </span>
                                    </button>
                                     <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <button onClick={() => handleCollectionSelect(name, true)} className="p-2 text-gray-400 hover:text-blue-400" aria-label={`Edit ${name}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </button>
                                        <button onClick={() => handleDelete(name)} className="p-2 text-gray-400 hover:text-red-500" aria-label={`Delete ${name}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="md:col-span-2">
                    {loading === 'content' && <Spinner message="Loading collection..." />}
                    {(selectedCollection || isViewAllActive) && !loading && books.length > 0 && (
                        <div>
                            <h4 className="text-lg font-semibold text-gray-300 mb-4">
                                {isEditMode ? `Editing: ${selectedCollection}` : (isViewAllActive ? `All Books (${books.length})` : `Contents of ${selectedCollection}`)}
                            </h4>
                            {renderTable()}
                         </div>
                    )}
                     {((selectedCollection || isViewAllActive)) && !loading && books.length === 0 && !error && (
                         isEditMode ? renderTable() : <p>This collection appears to be empty or in an incorrect format.</p>
                     )}
                     {!selectedCollection && !isViewAllActive && collections.length > 0 && !loading && (
                        <div className="text-center py-10 px-4 h-full flex flex-col items-center justify-center">
                           <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                           <h3 className="mt-2 text-lg font-medium text-white">Select a Collection</h3>
                           <p className="mt-1 text-sm text-gray-400">Choose a collection from the list to view or edit its contents.</p>
                       </div>
                     )}
                </div>
            </div>
        </div>
    );
};

export default LibraryViewer;
