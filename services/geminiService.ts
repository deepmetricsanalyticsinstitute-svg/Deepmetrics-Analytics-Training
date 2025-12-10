import { GoogleGenAI } from "@google/genai";
import { Course } from '../types';

export const streamCourseAdvice = async (
  userMessage: string, 
  history: {role: string, text: string}[],
  courses: Course[]
) => {
  // Initialize here to safely access process.env at runtime
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const resultStream = await chat.sendMessageStream({
      message: userMessage
    });

    return resultStream;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};