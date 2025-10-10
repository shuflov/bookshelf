import { Book } from '../types';

export const parseCSV = (csvText: string): Book[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Remove BOM and clean headers
    const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Find column indices robustly
    const findIndex = (possibleNames: string[]) => {
        for (const name of possibleNames) {
            const index = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
            if (index !== -1) return index;
        }
        return -1;
    };

    const titleIndex = findIndex(['title', 'name']);
    const authorIndex = findIndex(['author', 'authors']);
    const yearIndex = findIndex(['publicationyear', 'first published year', 'published', 'year']);
    const genreIndex = findIndex(['genre', 'category']);
    const descriptionIndex = findIndex(['description', 'summary', 'desc']);

    if (titleIndex === -1 || authorIndex === -1) {
        // Essential columns are missing
        throw new Error("CSV must contain 'Title' and 'Author' columns.");
    }

    // Fix: Explicitly type the return value of the map callback to `Book | null`.
    // This resolves a type inference issue where the `filter` type predicate `book is Book`
    // was not assignable to the more specific, inferred return type from this `map` function.
    return lines.slice(1).map((line): Book | null => {
        if (!line.trim()) return null;
        // Basic CSV parsing, may not handle all edge cases like commas within quoted fields
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, '').trim());
        return {
            title: values[titleIndex] || 'Unknown',
            author: values[authorIndex] || 'Unknown',
            publicationYear: yearIndex !== -1 ? values[yearIndex] || 'Unknown' : 'Unknown',
            genre: genreIndex !== -1 ? values[genreIndex] || 'Unknown' : 'Unknown',
            description: descriptionIndex !== -1 ? values[descriptionIndex] || 'Unknown' : 'Unknown',
        };
    }).filter((book): book is Book => book !== null);
};

export const convertToCSV = (data: Book[]): string => {
    const headers = "Title,Author,First Published Year,Genre,Description";
    if (!data || data.length === 0) {
        return headers;
    }

    // Helper to safely format a value for CSV by quoting it and escaping internal quotes.
    const csvSafe = (value: any): string => {
        return `"${String(value ?? '').replace(/"/g, '""')}"`;
    };

    const rows = data.map(book => 
      [
          csvSafe(book.title),
          csvSafe(book.author),
          csvSafe(book.publicationYear),
          csvSafe(book.genre),
          csvSafe(book.description)
      ].join(',')
    );

    return [headers, ...rows].join('\n');
};

export const mergeBooks = (existingBooks: Book[], newBooks: Book[]): { mergedBooks: Book[], addedCount: number } => {
    const bookExists = (book: Book, bookList: Book[]) => 
        bookList.some(b => 
            b.title.toLowerCase().trim() === book.title.toLowerCase().trim() && 
            b.author.toLowerCase().trim() === book.author.toLowerCase().trim()
        );

    const uniqueNewBooks = newBooks.filter(newBook => !bookExists(newBook, existingBooks));
    
    return {
        mergedBooks: [...existingBooks, ...uniqueNewBooks],
        addedCount: uniqueNewBooks.length
    };
};
