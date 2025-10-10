
import { GoogleGenAI, Type } from '@google/genai';
import { Book } from '../types';

const bookSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    author: { type: Type.STRING },
    publicationYear: { type: Type.STRING },
    genre: { type: Type.STRING },
    description: { type: Type.STRING }
  },
  required: ['title', 'author', 'publicationYear', 'genre', 'description']
};


export const identifyBooksFromImage = async (base64Image: string, mimeType: string, apiKey: string): Promise<Book[]> => {
  if (!apiKey) {
    throw new Error("Google Gemini API Key not found. Please set it in the settings.");
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
     const model = 'gemini-2.5-flash';
  
    const textPart = {
      text: `
        Analyze the provided image containing books. Identify each distinct book visible. For each book, extract the following details with high accuracy:
        1. The full title of the book.
        2. The full name of the author.
        3. The year the book was FIRST published.
        4. The primary literary genre of the book (e.g., Fiction, Sci-Fi, History).
        5. A concise, one-sentence description of the book's content or plot.

        If any piece of information cannot be determined, use the string "Unknown". Return the data for all identified books in the specified JSON format.
      `
    };

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };
    
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: bookSchema
            }
        }
    });

    const jsonText = response.text.trim();
    const books = JSON.parse(jsonText);
    return books;

  } catch (error) {
    console.error("Error in Gemini API call:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to get a valid response from the AI model: ${errorMessage}`);
  }
};
