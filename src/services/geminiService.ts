import { GoogleGenAI } from "@google/genai";
import { Question, QUIZ_SCHEMA, Language, ExamType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateQuestions(
  subject: string, 
  language: Language,
  examType: ExamType,
  count: number = 15, 
  filesData?: { data: string, mimeType: string }[],
  retryCount: number = 0
): Promise<Question[]> {
  let prompt = `Generate EXACTLY ${count} high-quality multiple choice questions for ${subject} in ${language} language. 
  The exam level is ${examType}. 
  ${examType === 'JEE' ? 'Follow the JEE Main/Advanced pattern from 2019 to 2025.' : ''}
  ${examType === 'NEET' ? 'Follow the NEET pattern based on previous year questions.' : ''}
  ${examType === 'Combined' ? 'Provide a mix of JEE and NEET level questions.' : ''}
  ${examType === 'JEE_BOOKS' ? 'Generate questions based on standard JEE reference books like HC Verma, Irodov, or Cengage.' : ''}
  ${examType === 'NEET_BOOKS' ? 'Generate questions based on NCERT textbooks and standard NEET reference materials.' : ''}
  ${examType === 'MS_CHOUHAN' ? `Generate questions specifically in the style and difficulty of M.S. Chouhan's "Advanced Problems in Organic Chemistry for JEE". 
  Focus on Level 1 and Level 2 type problems. 
  Topics should include: General Organic Chemistry (GOC), Isomerism, Grignard Reagent, Hydrocarbons, Alkyl Halides, Alcohols, Ethers, Epoxides, Aldehydes, Ketones, Carboxylic Acids, Amines, and Aromatic Compounds.
  The questions should involve complex reaction mechanisms, stereochemical outcomes (R/S, cis/trans, meso), and multi-step synthesis.
  Ensure the difficulty is "Hard" or "Advanced".` : ''}
  ${examType === 'BLACK_BOOK' ? `Generate questions specifically in the style and difficulty of Vikas Gupta and Pankaj Joshi's "Advanced Problems in Mathematics for JEE" (commonly known as the Black Book). 
  Topics should include: Calculus, Algebra, Coordinate Geometry, Trigonometry, and Vectors/3D.
  The questions should challenging, multi-concept, and require deep logical reasoning.
  Ensure the difficulty is "Hard" or "Advanced".` : ''}
  ${examType === 'NARENDRA_AVASTHI' ? `Generate questions specifically in the style and difficulty of Narendra Avasthi's "Problems in Physical Chemistry for JEE". 
  Focus on Level 1, Level 2, and Level 3 type problems. 
  Topics should include: Stoichiometry, Atomic Structure, Gaseous State, Thermodynamics, Chemical Equilibrium, Ionic Equilibrium, Chemical Kinetics, Electrochemistry, Dilute Solution, Solid State, and Surface Chemistry.
  The questions should involve complex numerical calculations, conceptual depth, and multiple concepts.
  Ensure the difficulty is "Hard" or "Advanced".` : ''}
  
  IMPORTANT: 
  1. Use LaTeX for ALL mathematical formulas, chemical equations, and symbols. 
  2. Wrap inline LaTeX in single dollar signs like $E=mc^2$ and block LaTeX in double dollar signs like $$\\int x dx$$.
  3. Ensure the questions are challenging and include detailed step-by-step explanations in ${language}.
  4. The difficulty should be a mix of Easy, Medium, and Hard (unless specified otherwise).
  ${count > 30 ? '5. Since the question count is high, keep explanations concise but accurate.' : ''}`;

  if (filesData && filesData.length > 0) {
    prompt = `I have provided ${filesData.length} document(s). 
    CRITICAL REQUIREMENT: You MUST generate ${count} high-quality multiple choice questions based EXCLUSIVELY on the content of the provided documents. 
    The questions should be in ${language} for the subject ${subject} at ${examType} level.
    
    Guidelines for Document-Based Generation:
    1. You MUST generate EXACTLY ${count} questions. Do not generate more or fewer than this number.
    2. Every question must be directly derived from information, concepts, or problems present in the uploaded files.
    3. Use LaTeX for all formulas, equations, and symbols.
    4. Follow the ${examType} pattern for question style.
    5. Include detailed step-by-step explanations in ${language} that reference the document content where applicable.
    6. Ensure the difficulty matches the source material.`;
  }

  try {
    const contents: any = { parts: [{ text: prompt }] };
    if (filesData && filesData.length > 0) {
      filesData.forEach(file => {
        contents.parts.push({
          inlineData: {
            data: file.data,
            mimeType: file.mimeType
          }
        });
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: QUIZ_SCHEMA,
        temperature: 0.4, // Lower temperature for more stable JSON
      },
    });

    const rawQuestions = JSON.parse(response.text || "[]");
    
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new Error("Empty or invalid response from AI");
    }

    return rawQuestions.map((q: any, index: number) => ({
      ...q,
      id: `${subject}-${Date.now()}-${index}`,
      subject,
      language,
      examType
    }));
  } catch (error: any) {
    console.error("Error generating questions:", error);
    
    // Retry logic for transient errors (max 3 retries)
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      console.log(`Retrying question generation in ${delay}ms (Attempt ${retryCount + 2})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateQuestions(subject, language, examType, count, filesData, retryCount + 1);
    }
    
    throw error;
  }
}
