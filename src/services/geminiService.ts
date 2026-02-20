import { GoogleGenAI } from "@google/genai";
import { Question, QUIZ_SCHEMA, Language, ExamType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateQuestions(
  subject: string, 
  language: Language,
  examType: ExamType,
  count: number = 25, 
  fileData?: { data: string, mimeType: string }
): Promise<Question[]> {
  let prompt = `Generate ${count} high-quality multiple choice questions for ${subject} in ${language} language. 
  The exam level is ${examType}. 
  ${examType === 'JEE' ? 'Follow the JEE Main/Advanced pattern from 2019 to 2025.' : ''}
  ${examType === 'NEET' ? 'Follow the NEET pattern based on previous year questions.' : ''}
  ${examType === 'Combined' ? 'Provide a mix of JEE and NEET level questions.' : ''}
  
  IMPORTANT: 
  1. Use LaTeX for ALL mathematical formulas, chemical equations, and symbols. 
  2. Wrap inline LaTeX in single dollar signs like $E=mc^2$ and block LaTeX in double dollar signs like $$\\int x dx$$.
  3. Ensure the questions are challenging and include detailed step-by-step explanations in ${language}.
  4. The difficulty should be a mix of Easy, Medium, and Hard.`;

  if (fileData) {
    prompt = `I have provided a document. Please extract or generate ${count} high-quality multiple choice questions in ${language} for ${subject} at ${examType} level based on the content of this document. 
    Use LaTeX for all formulas. Follow the ${examType} pattern.
    Include detailed step-by-step explanations in ${language}.`;
  }

  try {
    const contents: any = { parts: [{ text: prompt }] };
    if (fileData) {
      contents.parts.push({
        inlineData: {
          data: fileData.data,
          mimeType: fileData.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: QUIZ_SCHEMA,
      },
    });

    const rawQuestions = JSON.parse(response.text || "[]");
    return rawQuestions.map((q: any, index: number) => ({
      ...q,
      id: `${subject}-${Date.now()}-${index}`,
      subject,
      language,
      examType
    }));
  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
}
