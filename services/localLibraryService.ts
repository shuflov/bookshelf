
import { Book } from '../types';

const LIBRARY_KEY = 'localBookLibrary';

// Helper to get the full library object from localStorage
const getLibrary = (): Record<string, Book[]> => {
    try {
        const storedLibrary = localStorage.getItem(LIBRARY_KEY);
        if (storedLibrary) {
            return JSON.parse(storedLibrary);
        }
    } catch (e) {
        console.error("Could not parse local library from localStorage", e);
    }
    return {};
};

// Helper to save the full library object to localStorage
const saveLibrary = (library: Record<string, Book[]>) => {
    try {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    } catch (e)
        {
        console.error("Could not save library to localStorage", e);
        throw new Error("Failed to save to local storage. It might be full.");
    }
};

// Get a list of all collection names, sorted alphabetically
export const getCollectionNames = (): string[] => {
    const library = getLibrary();
    return Object.keys(library).sort((a, b) => a.localeCompare(b));
};

// Get all books from a specific collection
export const getCollection = (name: string): Book[] | undefined => {
    const library = getLibrary();
    return library[name];
};

// Save an array of books to a specific collection, overwriting if it exists
export const saveCollection = (name: string, books: Book[]) => {
    if (!name.trim()) {
        throw new Error("Collection name cannot be empty.");
    }
    const library = getLibrary();
    library[name] = books;
    saveLibrary(library);
};

// Delete a collection by name
export const deleteCollection = (name: string) => {
    const library = getLibrary();
    delete library[name];
    saveLibrary(library);
};

// Get all books from all collections combined into a single array
export const getAllBooks = (): Book[] => {
    const library = getLibrary();
    return Object.values(library).flat();
};
