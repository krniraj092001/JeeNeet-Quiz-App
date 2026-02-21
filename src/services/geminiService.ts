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
  ${examType === 'Combined' ? 'Follow the 12th Board Exam pattern based on NCERT textbooks and previous year questions.' : ''}
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
  
  ${examType === 'JEE_MAIN_MOCK' ? `Generate a full JEE Main Mock Test. 
  CRITICAL: You MUST generate EXACTLY ${count} questions in total.
  The distribution MUST be:
  - 1/3rd Physics questions
  - 1/3rd Chemistry questions
  - 1/3rd Mathematics questions
  
  For EACH subject section:
  - 20 questions should be Multiple Choice (MCQ) with 4 options.
  - 5 questions should be Numerical Value Type (NUMERICAL) where the answer is a specific number.
  
  Follow the 2026 JEE Main pattern (+4 for correct, -1 for wrong). 
  Ensure a mix of Easy, Moderate, and Hard difficulty across all subjects.` : ''}
  
  IMPORTANT: 
  1. Use LaTeX for ALL mathematical formulas, chemical equations, and symbols. 
  2. Wrap inline LaTeX in single dollar signs like $E=mc^2$ and block LaTeX in double dollar signs like $$\\int x dx$$.
  3. Ensure the questions are challenging and include detailed step-by-step explanations in ${language}.
  4. The difficulty should be a mix of Easy, Moderate, and Hard (unless specified otherwise).
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
      model: "gemini-3.1-pro-preview",
      contents: contents,
      config: {
        systemInstruction: "You are an expert exam paper setter. You must ALWAYS return a complete, valid JSON array of objects. Never truncate the response. If the requested question count is high, ensure every single question is fully formed and the JSON structure is perfectly closed. If you run out of space, prioritize finishing the current question and closing the JSON array correctly.",
        responseMimeType: "application/json",
        responseSchema: QUIZ_SCHEMA,
        temperature: 0.4,
        maxOutputTokens: 65536, 
      },
    });

    let text = response.text || "[]";
    
    // Attempt to fix truncated JSON if necessary
    try {
      // Remove potential markdown code blocks if the model ignored responseMimeType
      if (text.includes("```json")) {
        text = text.split("```json")[1].split("```")[0];
      } else if (text.includes("```")) {
        text = text.split("```")[1].split("```")[0];
      }
      text = text.trim();

      // If text doesn't end with ']', it might be truncated
      if (!text.endsWith(']')) {
        console.warn("Detected potentially truncated JSON response. Attempting to repair...");
        // Find the last complete object
        const lastObjectIndex = text.lastIndexOf('}');
        if (lastObjectIndex !== -1) {
          text = text.substring(0, lastObjectIndex + 1) + ']';
        }
      }
      
      const rawQuestions = JSON.parse(text);
      
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
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      throw new Error("The AI response was truncated or invalid. Please try again with a smaller question count.");
    }
  } catch (error: any) {
    console.error("Error generating questions:", error);
    
    // Retry logic for transient errors (max 3 retries)
    // Don't retry if it's a 400 error (Invalid Argument, like page limit)
    const isClientError = error?.status === "INVALID_ARGUMENT" || error?.message?.includes("400");
    if (retryCount < 3 && !isClientError) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      console.log(`Retrying question generation in ${delay}ms (Attempt ${retryCount + 2})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateQuestions(subject, language, examType, count, filesData, retryCount + 1);
    }
    
    throw error;
  }
}
