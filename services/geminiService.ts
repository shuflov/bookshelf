
import { GoogleGenAI, Type } from '@google/genai';
import { Book } from '../types';

const bookSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    author: { type: Type.STRING },
    publicationYear: { type: Type.STRING },
    genre: { type: Type.STRING },
    description: { type: Type.STRING, maxLength: 35 }
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
      text: `Analyze the provided image containing books. Identify each distinct book visible. For each book, extract: title, author, year of birth, genre, and a description. CRITICAL: The description MUST be exactly 5 words or fewer. Never exceed 5 words. Use "Unknown" if information cannot be determined.`
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
            systemInstruction: "You are a book identification assistant. CRITICAL RULE: The description field must be exactly 5 words or fewer. Never exceed 5 words in any description.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: bookSchema
            }
        }
    });

    const jsonText = response.text.trim();
    const books: Book[] = JSON.parse(jsonText);
    return books.map(book => ({
      ...book,
      description: book.description.split(' ').slice(0, 5).join(' ')
    }));

  } catch (error) {
    console.error("Error in Gemini API call:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to get a valid response from the AI model: ${errorMessage}`);
  }
};
