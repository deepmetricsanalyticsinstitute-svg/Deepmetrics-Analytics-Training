import { GoogleGenerativeAI } from "@google/generative-ai";
import { Course } from '../types';

export const streamCourseAdvice = async (
  userMessage: string, 
  history: {role: string, text: string}[],
  courses: Course[]
) => {
  const apiKey = process.env.API_KEY;
  
  // Check for missing key or the literal string "undefined" injected by the bundler
  if (!apiKey || apiKey === 'undefined' || apiKey === '"undefined"') {
    console.error("Deepmetrics Error: API_KEY is missing. Please check your Netlify environment variables.");
    throw new Error("Service configuration error: API Key missing. Please ensure API_KEY is set in Netlify Site Settings.");
  }

  // Initialize with the safe key using the stable SDK
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const courseContext = JSON.stringify(courses.map(c => ({
    title: c.title,
    description: c.description,
    level: c.level,
    tags: c.tags,
    price: c.price,
    instructor: c.instructor
  })));

  const systemInstruction = `
    You are an expert Academic Advisor at Deepmetrics Analytics Institute.
    Your goal is to help potential students find the perfect training program for their career goals.
    The currency for all training programs is GHC (Ghanaian Cedi).
    
    Here is our CURRENT Training Program Catalog (prices and details may have changed recently): ${courseContext}
    
    Rules:
    1. Only recommend training programs from the catalog provided above.
    2. Be encouraging, professional, and concise.
    3. If a user asks about pricing, mention the specific price from the catalog in GHC.
    4. If a user is unsure, ask them about their current skill level (Beginner, Intermediate, Advanced).
    5. Keep responses under 100 words unless detailed analysis is requested.
  `;

  try {
    // Use gemini-1.5-flash as the standard stable model
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemInstruction
    });

    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text }]
      })),
      generationConfig: {
        temperature: 0.7,
      }
    });

    const result = await chat.sendMessageStream(userMessage);

    return result.stream;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};