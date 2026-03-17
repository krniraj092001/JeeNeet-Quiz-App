import { GoogleGenAI, Modality, ThinkingLevel, Type } from "@google/genai";
import { Question, QUIZ_SCHEMA, Language, ExamType, DoubtResponse, QuizMode } from "../types";
import { jsonrepair } from "jsonrepair";

const getApiKey = () => {
  // Try to get from process.env (injected by Vite define) or import.meta.env
  const key = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  return key?.trim() || "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

/**
 * Robustly extract JSON from a string that might contain preamble or postamble
 */
function extractJson(text: string): string {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\n?|```/g, '').trim();
  
  // Find the first [ or {
  const firstBracket = cleaned.indexOf('[');
  const firstBrace = cleaned.indexOf('{');
  
  let start = -1;
  if (firstBracket !== -1 && (firstBrace === -1 || (firstBracket < firstBrace && firstBracket !== -1))) {
    start = firstBracket;
  } else if (firstBrace !== -1) {
    start = firstBrace;
  }
  
  if (start === -1) return cleaned;
  
  // Find the last ] or }
  const lastBracket = cleaned.lastIndexOf(']');
  const lastBrace = cleaned.lastIndexOf('}');
  const end = Math.max(lastBracket, lastBrace);
  
  if (end !== -1 && end > start) {
    return cleaned.substring(start, end + 1);
  }
  
  return cleaned.substring(start);
}

/**
 * Helper to retry API calls on transient errors
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 4,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const msg = error?.message || "";
      const status = error?.status || "";
      
      const isRpcError = msg.includes("Rpc failed") || msg.includes("xhr error") || status === "UNKNOWN";
      const isRateLimit = status === "RESOURCE_EXHAUSTED" || msg.includes("429") || msg.includes("quota");
      const isServerError = status === "INTERNAL" || msg.includes("500") || msg.includes("503");

      if (i < maxRetries && (isRpcError || isRateLimit || isServerError)) {
        // For rate limits, use a much longer delay (10s, 20s, 40s...)
        const delay = isRateLimit 
          ? Math.pow(2, i) * 10000 + Math.random() * 2000
          : Math.pow(2, i) * baseDelay + Math.random() * 1000;
          
        console.warn(`Retrying API call (${i + 1}/${maxRetries}) after ${Math.round(delay)}ms due to: ${msg}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Generate high-quality speech from text using Gemini TTS
 */
export async function generateSpeech(text: string): Promise<string | undefined> {
  if (!text) return undefined;
  if (!getApiKey()) throw new Error("API_KEY_MISSING");

  try {
    // Clean text: remove LaTeX, markdown, and limit length to avoid 500 errors
    const cleanText = text
      .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 divided by $2') // Basic LaTeX fraction handling
      .replace(/\\sqrt\{([^}]*)\}/g, 'square root of $1') // Basic LaTeX sqrt handling
      .replace(/[\$\#\*`\\_]/g, ' ') // Remove markdown and LaTeX symbols
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .substring(0, 1000); // Limit length to 1000 chars for stability

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    }));

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return pcmToWav(base64Audio);
    }
  } catch (error) {
    console.error("Error generating speech:", error);
  }
  return undefined;
}

/**
 * Wraps raw PCM data into a WAV container for browser playback
 */
function pcmToWav(pcmBase64: string, sampleRate: number = 24000): string {
  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // File length
  view.setUint32(4, 36 + len, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // Format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (raw PCM = 1)
  view.setUint16(20, 1, true);
  // Channel count (mono = 1)
  view.setUint16(22, 1, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // Block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // Bits per sample
  view.setUint16(34, 16, true);
  // Data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // Data chunk length
  view.setUint32(40, len, true);

  const wavBytes = new Uint8Array(44 + len);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(bytes, 44);

  // Convert back to base64 safely
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < wavBytes.length; i += chunkSize) {
    const chunk = wavBytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

async function generateDiagram(prompt: string): Promise<string | undefined> {
  if (!prompt) return undefined;
  
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create a professional, textbook-quality educational diagram for a JEE/NEET physics or math problem.
            
            STYLE REQUIREMENTS:
            - Background: Pure white.
            - Format: Clean, high-resolution vector-style illustration.
            - Lines: Sharp, consistent thickness. Use arrows for axes (X, Y, Z) and vectors.
            - Labels: Use clear, legible sans-serif font. Labels should be upright and placed precisely near the corresponding elements (points, angles, vectors).
            - Color: Use a professional academic palette (e.g., deep blue or black for primary lines, vibrant purple or red for curves/vectors).
            
            MATHEMATICAL ACCURACY (CRITICAL):
            - All curves (sine, cosine, parabolas, hyperbolas, etc.) MUST be mathematically precise.
            - For trigonometric graphs like y = sin(x):
                * The curve MUST pass through the origin (0,0).
                * It MUST have a periodic wave shape with a constant amplitude.
                * Peaks must be at π/2, 5π/2 and troughs at 3π/2, 7π/2.
                * The x-axis MUST be labeled with standard values: 0, π/2, π, 3π/2, 2π.
                * The y-axis MUST show 1 and -1 as the maximum and minimum values.
            - For physics diagrams: Ensure vectors are correctly oriented and forces are labeled according to standard conventions (e.g., 'mg' for gravity, 'N' for normal force).
            - Ensure geometric shapes are perfect (circles are round, squares have 90-degree angles).
            
            DESCRIPTION TO ILLUSTRATE:
            ${prompt}`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    }));

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Error generating diagram:", error);
  }
  return undefined;
}

const BATCH_SIZE = 3; // Further reduced batch size for maximum reliability and to avoid truncation

async function generateBatch(
  subject: string, 
  language: Language,
  examType: ExamType,
  count: number, 
  filesData?: { data: string, mimeType: string }[],
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD',
  mode: QuizMode = 'standard',
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
  
  ${examType === 'JEE_MAIN_MOCK' ? `Generate a high-quality set of questions for a JEE Main Mock Test. 
  CRITICAL: You MUST generate EXACTLY ${count} questions in total.
  
  Follow the 2020-2025 Trend Analysis for chapter weightage.
  Ensure a mix of Physics, Chemistry, and Mathematics if applicable to the subject ${subject}.
  
  For EACH subject section:
  - Questions should be Multiple Choice (MCQ) with 4 options or Numerical Value Type (NUMERICAL).
  
  Follow the 2026 JEE Main pattern (+4 for correct, -1 for wrong). 
  Ensure a mix of Easy, Moderate, and Hard difficulty.` : ''}

  ${examType === 'NEET_MOCK' ? `Generate a high-quality set of questions for a NEET Mock Test. 
  CRITICAL: You MUST generate EXACTLY ${count} questions for the subject: ${subject}.
  
  Follow the 2013-2025 Trend Analysis for ${subject} weightage.
  All questions MUST be Multiple Choice (MCQ) with 4 options.
  Follow the NEET pattern (+4 for correct, -1 for wrong).
  
  CRITICAL DIFFICULTY & STYLE GUIDELINES (Based on 2025 trends):
  - Overall Difficulty: 28% Hard, 38% Moderate, 33% Easy.
  - Shift away from direct memorization towards conceptual and application-based questions.
  - PHYSICS: Focus on analytical and numerical-heavy problems.
  - CHEMISTRY: Blend theoretical knowledge with tricky, application-based questions.
  - BIOLOGY: NCERT-based but highly conceptual.` : ''}
  
  IMPORTANT: 
  1. Use simple, clear formatting for questions and explanations.
  2. You may use LaTeX ($...$) ONLY for complex mathematical formulas or equations where plain text is insufficient.
  3. For chemical formulas and simple variables, prefer plain text (e.g., H2O, x, y) unless LaTeX is necessary for clarity.
  4. Avoid over-using LaTeX for every single number or unit.
  5. Include detailed step-by-step explanations in ${language}.
  6. Categorize each question as either 'Class 11' or 'Class 12' based on the standard NCERT curriculum.
  7. The difficulty should be ${difficulty ? difficulty : 'a mix of Easy, Moderate, and Hard (unless specified otherwise)'}.`;

  if (filesData && filesData.length > 0) {
    prompt = `I have provided ${filesData.length} document(s). 
    CRITICAL REQUIREMENT: You MUST generate ${count} high-quality multiple choice questions based EXCLUSIVELY on the content of the provided documents. 
    The questions should be in ${language} for the subject ${subject} at ${examType} level.
    
    Guidelines for Document-Based Generation:
    1. You MUST generate EXACTLY ${count} questions.
    2. Every question must be directly derived from the uploaded files.
    3. Use LaTeX for all formulas, equations, and symbols.
    4. Include detailed step-by-step explanations in ${language}.`;
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

    const generateCall = (model: string) => {
      const config: any = {
        systemInstruction: `You are a professional LaTeX Editor and Math Content Quality Checker with 20 years of experience in JEE and NEET paper setting.
        
        YOUR TASK:
        1. CLEAN TEXT: Remove any double-rendering or duplicate equations (e.g., change 'y2=8x y2 =8x' to just '$y^2 = 8x$').
        2. LATEX CONVERSION: Convert ALL mathematical AND chemical expressions into standard LaTeX using $ ... $ for inline math and $$...$$ for standalone equations. For example, never write H2SO4 as plain text; it MUST be $\\\\text{H}_2\\\\text{SO}_4$.
        3. TEXT IN LATEX: Use \\\\text{...} inside LaTeX for any words or labels (e.g., $\\\\text{adj}(2A)$).
        4. HINGLISH STYLE: Maintain the 'Hinglish' explanation style but fix the grammar and readability.
        5. STRUCTURE: Organize the solution into clear, numbered 'Steps'.
        6. FORMAT: Output the final result in clean Markdown format within a valid JSON array of objects.
        7. EXACT COUNT: You MUST generate EXACTLY the number of questions requested by the user. If the user asks for ${count} questions, you MUST return exactly ${count} questions in the JSON array. Do not generate more or fewer questions than requested.
        
        CONSTRAINTS:
        1. DIFFICULTY SCALING: For every 10 questions, ensure 3 are Easy (NCERT-based), 5 are Moderate (Application-based), and 2 are Hard (Multi-concept linkage).
        2. DISTRACTORS (OPTIONS): Do not use 'None of the above' or 'All of the above.' Create wrong options based on common student calculation mistakes (e.g., forgetting a $10^{-6}$ factor or a sign change).
        3. CLARITY: Every question must be unambiguous and mathematically sound.
        4. NO CONVERSATIONAL FILLER: Do not use phrases like "Here is a question" or "I hope this helps".
        
        EXPLANATION FORMAT:
        - Start with a brief introductory sentence in italics (wrapped in *...*).
        - Use numbered steps: "### Step 1: [Heading]" followed by the explanation.
        - STYLE: Write the explanation in 'Hinglish' (e.g., 'Is formula mein hum value put karenge...') to make it feel like a senior NITian is explaining it.
        - Keep the text inside each step concise and clear.
        - CRITICAL: The final answer MUST be enclosed in a special code block like this:
          \x60\x60\x60answer
          [Final Answer with LaTeX]
          \x60\x60\x60
        - Example:
          *This problem involves finding the equation of an ellipse given its foci and the constant sum of distances.*
          
          ### Step 1: Identify key parameters
          Foci points $(4,0)$ and $(-4,0)$ hain, toh distance between foci $2c = 8$ hoga. Matlab $c=4$.
          Constant sum $2a = 10$ diya hai, toh $a=5$.
          
          \x60\x60\x60answer
          $\\\\frac{x^2}{25} + \\\\frac{y^2}{9} = 1$
          \x60\x60\x60
        
        6. DIAGRAM PROMPT: ONLY provide a 'diagramPrompt' if the original source question explicitly includes a diagram or figure. CRITICAL: You MUST use Google Search to verify the accuracy of any diagram, graph, figure, or molecular structure. If it cannot be verified by a Google search, DO NOT include it. Do NOT invent diagrams.
        7. EXPLANATION DIAGRAM: You MAY provide an 'explanationDiagramPrompt' if a visual aid would help. CRITICAL: You MUST use Google Search to verify the accuracy of any graph, figure, or molecular structure. If it cannot be verified by a Google search, DO NOT include it.
        8. FORMAT: Return a valid JSON array. Never truncate.
        9. JSON VALIDITY: Ensure all strings are properly escaped. Do not include any text outside the JSON array.`,
        responseMimeType: "application/json",
        responseSchema: QUIZ_SCHEMA,
        tools: [{ googleSearch: {} }], // Grounding for up-to-date syllabus accuracy
        temperature: 0.2, 
        maxOutputTokens: 8192,
      };

      if (mode === 'thinking') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      return ai.models.generateContent({
        model: model, 
        contents: contents,
        config: config,
      });
    };

    let modelToUse = "gemini-3-flash-preview";
    if (mode === 'thinking') {
      modelToUse = "gemini-3.1-pro-preview";
    } else if (mode === 'fast') {
      modelToUse = "gemini-3.1-flash-lite-preview";
    }

    const response = await withRetry(() => generateCall(modelToUse));

    let text = response.text?.trim();
    
    if (!text) {
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.finishReason === 'SAFETY') {
          throw new Error("The request was blocked by safety filters. Try a different topic.");
        }
        if (candidate.finishReason === 'MAX_TOKENS') {
          throw new Error("The response was too long and got truncated. Try a smaller question count.");
        }
      }
      throw new Error("Empty response from NITian. Please try again.");
    }
    
    const jsonToParse = extractJson(text);
    
    try {
      const repairedJson = jsonrepair(jsonToParse);
      let rawQuestions = JSON.parse(repairedJson);
      
      if (rawQuestions && typeof rawQuestions === 'object' && !Array.isArray(rawQuestions)) {
        if (rawQuestions.questions && Array.isArray(rawQuestions.questions)) {
          rawQuestions = rawQuestions.questions;
        } else if (rawQuestions.items && Array.isArray(rawQuestions.items)) {
          rawQuestions = rawQuestions.items;
        } else {
          rawQuestions = [rawQuestions];
        }
      }

      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        throw new Error("Empty or invalid response from NITian");
      }

      return rawQuestions.map((q: any) => ({
        ...q,
        subject,
        language,
        examType
      }));
    } catch (parseError: any) {
      console.error("Failed to parse NITian response as JSON:", parseError);
      console.log("Raw text sample (first 500 chars):", text.substring(0, 500));
      console.log("Raw text sample (last 500 chars):", text.substring(Math.max(0, text.length - 500)));
      
      // Attempt recovery for various parsing errors (truncation, malformed strings, etc.)
      try {
        // Try to force close the JSON structure if it looks truncated
        let fixedText = jsonToParse;
        
        // If it's a "Colon expected" error, it might be a missing colon after a key
        // jsonrepair is usually good at this, but let's try to help it
        
        if (!fixedText.endsWith(']') && !fixedText.endsWith('}')) {
          // Try multiple closing patterns
          const patterns = ['"} ]', '"} } ]', '"} }', ' ]', ' }'];
          for (const pattern of patterns) {
            try {
              const repaired = jsonrepair(fixedText + pattern);
              const parsed = JSON.parse(repaired);
              if (parsed) {
                console.log(`Successfully recovered using pattern: ${pattern}`);
                let recoveredQuestions = parsed;
                if (recoveredQuestions.questions) recoveredQuestions = recoveredQuestions.questions;
                if (Array.isArray(recoveredQuestions) && recoveredQuestions.length > 0) {
                  return recoveredQuestions.map((q: any) => ({ ...q, subject, language, examType }));
                }
              }
            } catch (e) { /* continue */ }
          }
        }
        
        const repaired = jsonrepair(fixedText);
        const parsed = JSON.parse(repaired);
        let recoveredQuestions = parsed;
        
        if (recoveredQuestions && typeof recoveredQuestions === 'object' && !Array.isArray(recoveredQuestions)) {
          if (recoveredQuestions.questions && Array.isArray(recoveredQuestions.questions)) {
            recoveredQuestions = recoveredQuestions.questions;
          } else if (recoveredQuestions.items && Array.isArray(recoveredQuestions.items)) {
            recoveredQuestions = recoveredQuestions.items;
          } else {
            recoveredQuestions = [recoveredQuestions];
          }
        }

        if (Array.isArray(recoveredQuestions) && recoveredQuestions.length > 0) {
          console.log("Successfully recovered from malformed/truncated JSON");
          return recoveredQuestions.map((q: any) => ({
            ...q,
            subject,
            language,
            examType
          }));
        }
      } catch (recoveryError) {
        console.warn("Recovery attempt failed:", recoveryError);
      }
      
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateBatch(subject, language, examType, count, filesData, difficulty, mode, retryCount + 1);
      }
      
      throw new Error("The NITian response was invalid after multiple attempts. Please try again.");
    }
  } catch (error: any) {
    console.error("Error generating batch:", error);
    throw error;
  }
}

export async function generateQuestions(
  subject: string, 
  language: Language,
  examType: ExamType,
  count: number = 15, 
  filesData?: { data: string, mimeType: string }[],
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD',
  mode: QuizMode = 'standard'
): Promise<Question[]> {
  const allQuestions: Question[] = [];
  const numBatches = Math.ceil(count / BATCH_SIZE);

  for (let i = 0; i < numBatches; i++) {
    const currentBatchCount = Math.min(BATCH_SIZE, count - (i * BATCH_SIZE));
    
    // Add a significant delay between batches to strictly follow 15 RPM limit
    // 15 RPM = 1 request every 4 seconds. We use 4.5s to be safe.
    if (i > 0) {
      const delay = 4500; 
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (!getApiKey()) {
      throw new Error("API_KEY_MISSING");
    }

    try {
      const batchQuestions = await generateBatch(subject, language, examType, currentBatchCount, filesData, difficulty, mode);
      
      // Generate diagrams for questions and explanations
      const questionsWithDiagrams = await Promise.all(batchQuestions.map(async (q) => {
        let diagramUrl = q.diagramUrl;
        let explanationDiagramUrl = q.explanationDiagramUrl;

        if (q.diagramPrompt) {
          diagramUrl = await generateDiagram(q.diagramPrompt);
        }
        
        if (q.explanationDiagramPrompt) {
          explanationDiagramUrl = await generateDiagram(q.explanationDiagramPrompt);
        }

        return { ...q, diagramUrl, explanationDiagramUrl };
      }));
      
      allQuestions.push(...questionsWithDiagrams);
    } catch (error) {
      console.error(`Error in batch ${i + 1}:`, error);
      throw error; // Re-throw to be handled by the UI
    }
  }

  return allQuestions.map((q, index) => ({
    ...q,
    id: `${subject}-${Date.now()}-${index}`
  }));
}

export async function solveDoubt(
  questionText: string,
  image?: { data: string, mimeType: string },
  language: Language = 'English'
): Promise<DoubtResponse> {
  if (!getApiKey()) {
    throw new Error("API_KEY_MISSING");
  }

  const prompt = `You are a professional LaTeX Editor and Math Content Quality Checker with 20 years of experience in JEE and NEET.
  
  YOUR TASK:
  1. CLEAN TEXT: Remove any double-rendering or duplicate equations (e.g., change 'y2=8x y2 =8x' to just '$y^2 = 8x$').
  2. LATEX CONVERSION: Convert all mathematical expressions into standard LaTeX using $ ... $ for inline math and $$...$$ for standalone equations.
  3. TEXT IN LATEX: Use \\\\text{...} inside LaTeX for any words or labels (e.g., $\\\\text{adj}(2A)$).
  4. HINGLISH STYLE: Maintain the 'Hinglish' explanation style but fix the grammar and readability.
  5. STRUCTURE: Organize the solution into clear, numbered 'Steps'.
  6. FORMAT: Output the final result in clean Markdown format.

  DOUBT:
  ${questionText}
  
  INSTRUCTIONS:
  1. PROFESSIONALISM: Use clear, concise, and academic language for the question analysis.
  2. EXPLANATION FORMAT:
     - Start with a brief introductory sentence in italics (wrapped in *...*).
     - Use numbered steps: "### Step 1: [Heading]" followed by the explanation.
     - STYLE: Write the explanation in 'Hinglish' (e.g., 'Is formula mein hum value put karenge...') to make it feel like a senior NITian is explaining it.
     - Keep the text inside each step concise and clear.
     - CRITICAL: The final answer MUST be enclosed in a special code block like this:
       \x60\x60\x60answer
       [Final Answer with LaTeX]
       \x60\x60\x60
  3. If a diagram would help, provide a detailed 'diagramPrompt'. Verify accuracy using Google Search.
  4. Identify the 'subject' and 'topic' of the question.`;

  try {
    const contents: any = { parts: [{ text: prompt }] };
    if (image) {
      contents.parts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType
        }
      });
    }

    const generateCall = (model: string) => ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            diagramPrompt: { type: Type.STRING },
            subject: { type: Type.STRING },
            topic: { type: Type.STRING }
          },
          required: ["explanation", "subject", "topic"]
        },
        tools: [{ googleSearch: {} }], // Grounding for up-to-date syllabus accuracy
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    const response = await withRetry(() => generateCall("gemini-3-flash-preview"));

    const text = response.text?.trim();
    if (!text) {
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.finishReason === 'SAFETY') {
          throw new Error("The request was blocked by safety filters.");
        }
      }
      throw new Error("Empty response from NITian.");
    }

    const jsonToParse = extractJson(text);

    let result;
    try {
      const repairedJson = jsonrepair(jsonToParse);
      result = JSON.parse(repairedJson);
    } catch (e) {
      console.error("Failed to parse doubt response:", e);
      console.log("Raw doubt text (first 500 chars):", text.substring(0, 500) + "...");
      throw new Error("Failed to parse response from NITian.");
    }
    
    // Extract grounding sources if available
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
      title: chunk.web?.title,
      uri: chunk.web?.uri
    })).filter(s => s.title && s.uri);

    let diagramUrl = undefined;
    if (result.diagramPrompt) {
      diagramUrl = await generateDiagram(result.diagramPrompt);
    }

    return {
      explanation: result.explanation,
      diagramUrl,
      subject: result.subject,
      topic: result.topic,
      sources: sources?.length ? sources : undefined
    };
  } catch (error) {
    console.error("Error solving doubt:", error);
    throw error;
  }
}

export async function chatDuringLoading(
  messages: { role: 'user' | 'assistant', content: string }[]
): Promise<string> {
  if (!getApiKey()) {
    throw new Error("API_KEY_MISSING");
  }

  const prompt = `You are NITian Assistant, a friendly, helpful AI assistant for JEE and NEET aspirants. 
  The user is currently waiting for a quiz to be generated. 
  
  CRITICAL INSTRUCTIONS:
  1. Always reply in a native Indian human language (Hinglish/Hindi mixed with English) that feels natural to a student.
  2. If the user asks about improving Organic Chemistry, you MUST give this specific advice:
     Step 1. Sabse Pahle aap ye ensure karo ki apka IUPAC Name or GOC accha ho.
     Step 2. Yadi achha nhi hai, tab sabse pahle aapko IUPAC or GOC ko achha karna hai. Kyunki IUPAC or GOC organic chemistry ka jan hai.
     Step 3. GOC ke bina reaction mechanism ko samajhna namunkin hai.
     Step 4. Iske bad isomerism pe focus karo.
     Step 5. Iske bad reaction mechanism ko samajhna asan ho jayega.
     Step 6. Aapko organic chemistry ke Youtube pe achhe teacher free mil jayega for example M.S. Chauhan sir.
  3. For Math and Physics, give similar structured, practical advice in the same native tone.
  4. Keep them engaged and maintain a positive, motivating tone.`;

  try {
    const historyString = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
    
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `${prompt}\n\nConversation History:\n${historyString}\n\nAssistant:`,
    }));

    return response.text || "I'm here! Still working on your quiz.";
  } catch (error) {
    console.error("Error in chat:", error);
    return "I'm having a bit of trouble connecting right now, but your quiz is still generating!";
  }
}
