import { GoogleGenerativeAI } from "@google/generative-ai";

export const parsePDFWithGemini = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelName = "gemini-flash-latest";
    const model = genAI.getGenerativeModel({ model: modelName });

    console.log(`[Gemini] Starting AI analysis for: ${req.file.originalname}`);

    const systemPrompt = `
Act as an expert exam paper digitizer. Extract ALL questions from the provided PDF exam paper without missing any.

STRICT RULES:

1. Extraction: Extract every single question and its options (A, B, C, D) in the exact order they appear. Do not skip any question.

2. Language: Support mixed Hindi and English text perfectly. Use UTF-8 for Hindi characters.

3. Math/Science: Convert ALL mathematical equations, formulas, and scientific symbols into LaTeX format surrounded by $ symbols (e.g. $x^2 + y^2 = z^2$). Do NOT use LaTeX for table content — use HTML tables instead (see rule 8).

4. Answer Key: Find the "Answer Table" or "Key" section. Always normalize correctAnswer to "A", "B", "C", or "D". If the PDF uses numbers map them: 1->A, 2->B, 3->C, 4->D. If no answer key exists set correctAnswer to "A" as placeholder.

5. Output Format: Return ONLY a valid JSON array. No markdown, no code fences, no extra text before or after. Every object must follow this schema exactly:
{
  "questionNumber": number,
  "questionEn": "full question text in English or mixed — embed HTML table here if question has a table",
  "questionHi": "full question text in Hindi if it exists separately in the PDF, otherwise empty string",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correctAnswer": "A" | "B" | "C" | "D",
  "solution": "explanation or solution if provided in the PDF, otherwise empty string",
  "questionImageBase64": "always empty string",
  "optionImagesBase64": ["", "", "", ""]
}

6. Option Labels: Do not include the primary option labels (A., B., (1), (2)) in the options text. However preserve internal statement labels like (a), (i), (I) if they appear inside the option text.

7. SPECIAL QUESTION TYPES — handle each type as follows:

  TYPE A — Assertion-Reason questions:
  These have "Assertion (A):" and "Reason (R):" statements followed by 4 options.
  Put the full assertion and reason text inside questionEn like this:
  "Assertion (A): [assertion text here] Reason (R): [reason text here]"
  The 4 options are always the standard assertion-reason choices, extract them as-is.

  TYPE B — Statement based questions (Statement 1 and Statement 2, or multiple statements):
  Put all statements inside questionEn clearly labeled.
  EXAMPLE questionEn: "Consider the following statements: Statement 1: [text] Statement 2: [text] Which of the above statements is/are correct?"

  TYPE C — Passage/Comprehension based questions:
  The passage text goes into questionEn BEFORE the actual question, separated clearly.
  EXAMPLE questionEn: "PASSAGE: [full passage text here] QUESTION: [the actual question being asked]"
  Each sub-question of a passage is a SEPARATE question object in the JSON array with the passage repeated in questionEn.

  TYPE D — Integer/Numerical type questions (no options, answer is a number):
  These questions have no A/B/C/D options in the PDF. Handle them like this:
  - The actual correct answer is a specific number (e.g. 60)
  - Create 4 options where one is the correct number and three are plausible wrong numbers (nearby values)
  - Set correctAnswer to whichever option letter contains the actual correct number
  - Add "[Integer Type]" at the end of questionEn
  - EXAMPLE: if answer is 60, options could be ["45", "60", "75", "90"] and correctAnswer "B"

  TYPE E — Fill in the blank questions:
  Extract as normal MCQ. Show the blank as "______" in questionEn.

  TYPE F — True/False questions:
  Set options to ["True", "False", "Cannot be determined", "None of these"].
  correctAnswer maps to A for True, B for False.

8. TABLE RULE — MANDATORY:
If ANY question contains a table (match the following, column matching, or any grid of data), convert the full table into HTML and embed it inside questionEn. The question stem text must appear as plain text BEFORE the HTML table. Use ONLY inline styles, no CSS classes. HTML must be a single unbroken line with NO newline characters inside the JSON string.

EXAMPLE for match-the-following — questionEn must look like:
"Match the following. / सही मिलान कीजिए।<table style=\"border-collapse:collapse;width:100%;margin-top:8px;\"><thead><tr style=\"background:#f3f4f6;\"><th style=\"border:1px solid #d1d5db;padding:8px 12px;text-align:left;font-weight:600;\">Column I / कॉलम I</th><th style=\"border:1px solid #d1d5db;padding:8px 12px;text-align:left;font-weight:600;\">Item / विषय</th><th style=\"border:1px solid #d1d5db;padding:8px 12px;text-align:left;font-weight:600;\">Column II / कॉलम II</th><th style=\"border:1px solid #d1d5db;padding:8px 12px;text-align:left;font-weight:600;\">Description / विवरण</th></tr></thead><tbody><tr><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">A</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">Item text</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">I</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">Description text</td></tr></tbody></table>"
Adjust rows and columns to match the actual table. Options A/B/C/D stay as plain text outside the table.

9. IMAGE RULE:
- DO NOT extract any images.
- Always set "questionImageBase64" to an empty string "".
- Always set "optionImagesBase64" to ["", "", "", ""].

Combine multi-page questions logically. Ignore headers, footers, watermarks, and page numbers.
    `;

    const pdfPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: "application/pdf"
      }
    };

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

    const stripOptionMarkers = (text) => {
      if (!text) return "";
      return text.trim().replace(/^[\(\[]?([a-zA-Z0-9])[\)\].:]\s*/, "").trim();
    };

    // Helper — validate base64 data URL
    const isValidBase64Image = (str) => {
      if (!str || typeof str !== "string") return false;
      return str.startsWith("data:image/") && str.includes(";base64,") && str.length > 100;
    };

    console.log(`[Gemini] Successfully parsed ${questions.length} questions`);

    res.json({
      success: true,
      questions: questions.map((q, idx) => {
        const cleanedOptions = (q.options || []).map(opt => stripOptionMarkers(opt));

        // Process question image
        const questionImage = isValidBase64Image(q.questionImageBase64)
          ? q.questionImageBase64
          : "";

        // Process option images
        const rawOptionImages = Array.isArray(q.optionImagesBase64)
          ? q.optionImagesBase64
          : ["", "", "", ""];
        const optionImages = rawOptionImages.map(img =>
          isValidBase64Image(img) ? img : ""
        );

        // If any option image exists, mark hasDiagramOptions
        const hasDiagramOptions = optionImages.some(img => img !== "");

        return {
          ...q,
          id: idx + 1,
          orderIndex: idx + 1,
          question: q.questionEn || "",
          questionEn: q.questionEn || "",
          questionHi: q.questionHi || "",
          questionImage: questionImage,
          optionImages: optionImages,
          hasDiagramOptions: hasDiagramOptions,
          optionA: cleanedOptions[0] || "",
          optionB: cleanedOptions[1] || "",
          optionC: cleanedOptions[2] || "",
          optionD: cleanedOptions[3] || "",
          options: cleanedOptions,
          type: "Multiple Choice Question",
          marks: 4,
          negative: -1,
          displayOptions: cleanedOptions.map((opt, i) => ({
            id: i + 1,
            text: opt,
            image: optionImages[i] || "",
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