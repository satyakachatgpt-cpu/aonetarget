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
Act as an expert exam paper digitizer. Extract all questions from the provided PDF exam paper.

STRICT RULES:

1. Extraction: Extract every question and its options (A, B, C, D) in exact order.

2. Language: Support mixed Hindi and English text perfectly. Use UTF-8 for Hindi.

3. Math/Science: Convert ALL mathematical equations, formulas, and scientific symbols into LaTeX format (surrounded by $ symbols). Do NOT use LaTeX for table content.

4. Answer Key: Find the "Answer Table" or "Key". Always normalize correctAnswer to "A", "B", "C", or "D". If PDF uses 1,2,3,4 map them: 1->A, 2->B, 3->C, 4->D.

5. Output Format: Return ONLY a valid JSON array. No extra text before or after. Schema:
{
  "questionNumber": number,
  "questionEn": "question text here — if table exists embed HTML table here",
  "questionHi": "Hindi version if separately present, else empty string",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correctAnswer": "A" | "B" | "C" | "D",
  "solution": "explanation if present, else empty string"
}

6. Extraction Detail: Do not include primary option labels (A., (1)) in options text. Preserve statement labels like (a) if present.

7. TABLE RULE — THIS IS MANDATORY:
If ANY question contains a table (match the following, column matching, assertion-reason table, or any grid of data), you MUST convert that table into an HTML table string and embed it inside questionEn (and questionHi if applicable).
- The question stem text must come BEFORE the HTML table tag as plain text.
- Use ONLY inline styles. Zero CSS classes allowed.
- The HTML must be a single unbroken line — NO newline characters inside the string.
- Options A/B/C/D stay as normal plain text strings outside the table.

EXAMPLE — if PDF has this question:
"100. Match the following. / सही मिलान कीजिए।
Column I: A. Tuberculosis  B. Influenza  C. Scabies  D. Cholera
Column II: I. Droplet  II. Contact/enteric  III. Airborne  IV. Contact"

Then questionEn MUST be exactly like this (single line, HTML embedded):
"Match the following. / सही मिलान कीजिए।<table style=\"border-collapse:collapse;width:100%;margin-top:8px;\"><thead><tr style=\"background:#f3f4f6;\"><th style=\"border:1px solid #d1d5db;padding:8px 12px;text-align:left;font-weight:600;\">Column I / कॉलम I</th><th style=\"border:1px solid #d1d5db;padding:8px 12px;text-align:left;font-weight:600;\">Item / विषय</th><th style=\"border:1px solid #d1d5db;padding:8px 12px;text-align:left;font-weight:600;\">Column II / कॉलम II</th><th style=\"border:1px solid #d1d5db;padding:8px 12px;text-align:left;font-weight:600;\">Description / विवरण</th></tr></thead><tbody><tr><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">A</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">Tuberculosis / टीबी</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">I</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">Droplet precaution / ड्रॉपलेट प्रीकॉशन</td></tr><tr><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">B</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">Influenza / इन्फ्लुएंजा</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">II</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">Contact/enteric precaution / कॉन्टैक्ट/एंटेरिक प्रीकॉशन</td></tr><tr><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">C</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">Scabies / स्केबीज</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">III</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">Airborne precaution / एयरबोर्न प्रीकॉशन</td></tr><tr><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">D</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">Cholera / कॉलरा</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">IV</td><td style=\"border:1px solid #d1d5db;padding:8px 12px;\">Contact precaution / कॉन्टैक्ट प्रीकॉशन</td></tr></tbody></table>"

Follow this exact pattern for every table question in the PDF. Adjust rows and columns to match the actual table in the PDF.

Combine multi-page questions logically. Ignore headers, footers, and page numbers.
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

    console.log(`[Gemini] Successfully parsed ${questions.length} questions`);

    res.json({
      success: true,
      questions: questions.map((q, idx) => {
        const cleanedOptions = (q.options || []).map(opt => stripOptionMarkers(opt));
        return {
          ...q,
          id: idx + 1,
          orderIndex: idx + 1,
          question: q.questionEn || "",
          questionEn: q.questionEn || "",
          questionHi: q.questionHi || "",
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