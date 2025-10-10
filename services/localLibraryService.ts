
import { LibraryFile } from '../types';

const LIBRARY_STORAGE_KEY = 'localBookLibrary';

// Helper to get the library from localStorage
const getLibrary = (): Record<string, string> => {
    try {
        const storedLibrary = localStorage.getItem(LIBRARY_STORAGE_KEY);
        return storedLibrary ? JSON.parse(storedLibrary) : {};
    } catch (e) {
        console.error("Failed to parse local library from localStorage", e);
        return {};
    }
};

// Helper to save the library to localStorage
const saveLibrary = (library: Record<string, string>): void => {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
};

export const saveCollectionToLocal = async (fileName: string, csvData: string): Promise<void> => {
    const library = getLibrary();
    library[fileName] = csvData;
    saveLibrary(library);
};

export const listFilesFromLocal = async (): Promise<LibraryFile[]> => {
    const library = getLibrary();
    // We don't store created_at, so we'll sort by name.
    // The id can also be the name since it's unique.
    return Object.keys(library)
        .map(name => ({
            id: name,
            name: name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
};

export const downloadFileContentFromLocal = async (fileName:string): Promise<string> => {
    const library = getLibrary();
    if (library[fileName] !== undefined) {
        return library[fileName];
    }
    throw new Error(`File "${fileName}" not found in local library.`);
};

export const deleteFileFromLocal = async (fileName: string): Promise<void> => {
    const library = getLibrary();
    if (library[fileName] !== undefined) {
        delete library[fileName];
        saveLibrary(library);
    } else {
        throw new Error(`File "${fileName}" not found in local library.`);
    }
};
