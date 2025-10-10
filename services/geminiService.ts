
import { GoogleGenAI, Type } from "@google/genai";
import { Book, GeminiBookResponse } from '../types';

const bookSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    author: { type: Type.STRING },
    publicationYear: {
      type: Type.STRING
    },
    genre: { type: Type.STRING },
    description: { type: Type.STRING }
  },
  required: ['title', 'author', 'publicationYear', 'genre', 'description']
};

export const identifyBooksFromImage = async (apiKey: string, base64Image: string, mimeType: string): Promise<Book[]> => {
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please add it in the settings.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
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
  
  try {
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
    const parsedResponse = JSON.parse(jsonText) as GeminiBookResponse[];

    const books: Book[] = parsedResponse.map(book => ({
      title: book.title,
      author: book.author,
      publicationYear: book.publicationYear,
      genre: book.genre,
      description: book.description
    }));
    
    return books;

  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("Failed to get a valid response from the AI model. Please check if your Gemini API key is correct and has been entered in the settings.");
  }
};
