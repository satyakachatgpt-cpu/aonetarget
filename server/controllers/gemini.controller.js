import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini 1.5 Flash PDF Parser Controller
 * Optimized: Sends PDF directly to Gemini without requiring 'canvas' or 'pdf-img-convert'
 */
export const parsePDFWithGemini = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const modelName = "gemini-flash-latest";
    const model = genAI.getGenerativeModel({ model: modelName });

    console.log(`[Gemini] Starting AI analysis for: ${req.file.originalname}`);

    // 1. Prepare Gemini Prompt
    const systemPrompt = `
      Act as an expert exam paper digitizer. Your task is to extract questions from the provided PDF of an exam paper.
      
      STRICT RULES:
      1. Extraction: Extract every question and its options (A, B, C, D) in the exact order they appear.
      2. Language: Support mixed Hindi and English text perfectly. Use UTF-8 for Hindi.
      3. Math/Science: Convert ALL mathematical equations, formulas, and scientific symbols into standard LaTeX format (surrounded by $ symbols).
      4. Answer Key: Find the "Answer Table" or "Key" (usually on the last page). Match the correct answer (A, B, C, or D) to each question number.
      5. Output Format: Return ONLY a valid JSON array of objects. Do not include any introductory or concluding text. Follow this schema exactly:
      {
        "questionNumber": number,
        "questionEn": "English version of question or mixed text",
        "questionHi": "Hindi version of question if exists separately, otherwise empty string",
        "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
        "correctAnswer": "A" | "B" | "C" | "D",
        "solution": "Explanation if provided in the text, otherwise empty"
      }
      
      Combine multi-page questions logically. Ignore headers, footers, and page numbers.
    `;

    // 2. Prepare PDF Part
    const pdfPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: "application/pdf"
      }
    };

    // 3. Generate Content
    const result = await model.generateContent([systemPrompt, pdfPart]);
    const response = await result.response;
    const text = response.text();
    
    let questions = [];
    try {
      questions = JSON.parse(text);
    } catch (parseErr) {
      console.error("[Gemini] JSON Parse Error:", parseErr);
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Gemini returned invalid JSON format");
      }
    }

    // Helper to strip common option markers like (a), (b), A., etc.
    const stripOptionMarkers = (text) => {
      if (!text) return "";
      // Matches (a), (A), a), A), A., a. at the start of the string
      return text.replace(/^\s*[\(\[]?([a-dA-D])[\)\].:]\s*/, "").trim();
    };

    console.log(`[Gemini] Successfully parsed ${questions.length} questions`);

    res.json({
      success: true,
      questions: questions.map((q, idx) => {
        // Clean options of duplicate markers
        const cleanedOptions = (q.options || []).map(opt => stripOptionMarkers(opt));
        
        return {
          ...q,
          id: idx + 1,
          questionEn: q.questionEn || "",
          questionHi: q.questionHi || "",
          options: cleanedOptions,
          type: "Multiple Choice Question",
          marks: 4, 
          negative: -1,
          displayOptions: cleanedOptions.map((opt, i) => ({
            id: i + 1,
            text: opt,
            image: "",
            isCorrect: q.correctAnswer === String.fromCharCode(65 + i)
          })),
          explanation: q.solution || "Extracted via Gemini AI"
        };
      })
    });

  } catch (error) {
    console.error('[Gemini Controller] Error:', error);
    res.status(500).json({ 
      error: 'AI Processing failed', 
      details: error.message 
    });
  }
};
