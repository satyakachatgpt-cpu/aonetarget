import mammoth from "mammoth";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "5.5.207"}/build/pdf.worker.min.mjs`;

import { getAdminHeaders } from "../services/baseService";

export async function parseFile(file: File): Promise<{ questions: any[], extractedImages: string[] }> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (extension === "docx") {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { questions: extractQuestionsFromText(result.value), extractedImages: [] };
    } catch (err) {
      console.error("DOCX parsing error:", err);
      return { questions: [], extractedImages: [] };
    }
  } else if (extension === "xlsx" || extension === "xls") {
    try {
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const parsedQuestions = jsonData.map((row: any, idx) => ({
        id: idx + 1,
        questionEn:
          row.Question || row.question || row.text || "No question text",
        questionHi: row.QuestionHi || row.question_hindi || "",
        type: "Multiple Choice",
        options: [
          row.OptionA || row.A || row.option1 || "",
          row.OptionB || row.B || row.option2 || "",
          row.OptionC || row.C || row.option3 || "",
          row.OptionD || row.D || row.option4 || "",
        ].filter(Boolean),
        correctAnswer:
          row.CorrectAnswer || row.correct || row.Answer || row.answer,
        solution: row.Solution || row.solution || row.Explanation || "",
        positiveMarks: Number(row.Marks || row.marks || 0),
        negativeMarks: Number(row.Negative || row.negative || 0),
      }));
      
      return { questions: parsedQuestions, extractedImages: [] };
    } catch (err) {
      console.error("Excel parsing error:", err);
      return { questions: [], extractedImages: [] };
    }
  } else if (extension === "pdf") {
    try {
      console.log("[testParser] Sending PDF to Gemini AI Backend...");
      
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/v2/parse/gemini-pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'x-admin-id': localStorage.getItem('adminId') || ''
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gemini Parsing failed');
      }

      const result = await response.json();
      return { 
        questions: result.questions, 
        extractedImages: [] // Gemini doesn't return separate images yet in this flow
      };
      /* 
      // OLD PDF PARSING LOGIC (DISABLED FOR GEMINI)
      try {
        console.log("Starting PDF parsing for:", file.name);
      console.log("Starting PDF parsing for:", file.name);
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      const pageMap: { startIndex: number; pageNumber: number; embeddedImages: { dataUrl: string; y: number }[]; pageDataUrl: string }[] = [];
      const allExtractedImages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        let lastY = -1;
        let pageText = "";

        for (const item of textContent.items as any[]) {
          const currentY = item.transform[5];
          if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
            pageText += "\n";
          }
          pageText += item.str + " ";
          lastY = currentY;
        }

        const embeddedImages: { dataUrl: string; y: number }[] = [];
        try {
          const opList = await (page as any).getOperatorList();
          const commonObjs = (page as any).commonObjs;
          const objs = (page as any).objs;

          const fnArray = opList.fnArray as number[];
          const argsArray = opList.argsArray as any[][];
          let currentY = 0;

          for (let opIdx = 0; opIdx < fnArray.length; opIdx++) {
            const fn = fnArray[opIdx];
            const args = argsArray[opIdx];

            if (fn === 12 && args && args.length >= 6) {
              currentY = args[5];
            }

            if ((fn === 85 || fn === 84) && args && args[0]) {
              const imgName = args[0];
              const imgObj = objs.has && objs.has(imgName) ? objs.get(imgName) :
                             (commonObjs.has && commonObjs.has(imgName) ? commonObjs.get(imgName) : null);

              if (imgObj && imgObj.data && imgObj.width && imgObj.height) {
                try {
                  const imgCanvas = document.createElement('canvas');
                  imgCanvas.width = imgObj.width;
                  imgCanvas.height = imgObj.height;
                  const imgCtx = imgCanvas.getContext('2d');
                  if (imgCtx) {
                    const imageData = imgCtx.createImageData(imgObj.width, imgObj.height);
                    if (imgObj.data.length === imgObj.width * imgObj.height * 4) {
                      imageData.data.set(imgObj.data);
                    } else if (imgObj.data.length === imgObj.width * imgObj.height) {
                      for (let px = 0; px < imgObj.width * imgObj.height; px++) {
                        const v = imgObj.data[px];
                        imageData.data[px * 4] = v;
                        imageData.data[px * 4 + 1] = v;
                        imageData.data[px * 4 + 2] = v;
                        imageData.data[px * 4 + 3] = 255;
                      }
                    } else if (imgObj.data.length === imgObj.width * imgObj.height * 3) {
                      for (let px = 0; px < imgObj.width * imgObj.height; px++) {
                        imageData.data[px * 4] = imgObj.data[px * 3];
                        imageData.data[px * 4 + 1] = imgObj.data[px * 3 + 1];
                        imageData.data[px * 4 + 2] = imgObj.data[px * 3 + 2];
                        imageData.data[px * 4 + 3] = 255;
                      }
                    }
                    imgCtx.putImageData(imageData, 0, 0);
                    if (imgObj.width > 60 && imgObj.height > 60) {
                      const dataUrl = imgCanvas.toDataURL('image/jpeg', 0.75);
                      embeddedImages.push({
                        dataUrl,
                        y: currentY
                      });
                      if (!allExtractedImages.includes(dataUrl)) {
                        allExtractedImages.push(dataUrl);
                      }
                    }
                  }
                } catch (imgErr) {
                  // skip
                }
              }
            }
          }
        } catch (opErr) {
          console.warn(`Could not extract images from page ${i}:`, opErr);
        }

        const normalizedPageText = pageText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

        let pageDataUrl = "";
        try {
          const viewport = page.getViewport({ scale: 1.0 });
          const renderCanvas = document.createElement('canvas');
          renderCanvas.width = viewport.width;
          renderCanvas.height = viewport.height;
          const renderCtx = renderCanvas.getContext('2d');
          if (renderCtx) {
            await (page as any).render({ canvasContext: renderCtx, viewport, canvas: renderCanvas }).promise;
            pageDataUrl = renderCanvas.toDataURL('image/jpeg', 0.50);
          }
        } catch (renderErr) {
          console.warn(`Could not render page ${i} for diagram detection:`, renderErr);
        }
        
        pageMap.push({
          startIndex: fullText.length,
          pageNumber: i,
          embeddedImages,
          pageDataUrl
        });
        fullText += normalizedPageText + "\n\n";
      }

      const questions = extractQuestionsFromText(fullText, pageMap);
      return { questions, extractedImages: allExtractedImages };
      */
    } catch (err: any) {
      console.error("PDF AI parsing error:", err);
      // Optional: alert user or return empty
      throw err;
    }
  }
  return { questions: [], extractedImages: [] };
}

export function extractQuestionsFromText(text: string, pageMap: any[] = []): any[] {
  const questions: any[] = [];
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

  const qSplitRegex = /^\s*(\d+)[\.|\)]\s+/gm;
  let match;
  const blockInfos: { start: number; text: string }[] = [];

  while ((match = qSplitRegex.exec(normalizedText)) !== null) {
    const start = match.index;
    if (blockInfos.length > 0) {
      blockInfos[blockInfos.length - 1].text = normalizedText.substring(blockInfos[blockInfos.length - 1].start, start);
    }
    blockInfos.push({ start, text: "" });
  }

  if (blockInfos.length > 0) {
    blockInfos[blockInfos.length - 1].text = normalizedText.substring(blockInfos[blockInfos.length - 1].start);
  }

  const validBlockInfos = blockInfos.filter(b => b.text.trim().length > 0);
  const blocks = validBlockInfos.map(b => b.text);
  const blockStarts = validBlockInfos.map(b => b.start);

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    const firstLine = block.split('\n')[0];
    if (/Unit-|Assignment-|ELECTRONIC DEVICES|CHAPTER/i.test(firstLine)) continue;
    
    const hasOptions = /\([a-dA-D]\)|[A-D][\.|\)]\s/i.test(block);
    if (!hasOptions) continue;

    const optionMarkerRegex =
      /(?:\n|[ \t])(?:\(?([A-Da-d])[\s\).\]:]|Option\s*([A-Da-d])[\s.:])(?!\w)/gi;

    let matchOpt;
    const optionMatches = [];
    const tempGlobalRegex = new RegExp(optionMarkerRegex);
    while ((matchOpt = tempGlobalRegex.exec(block)) !== null) {
      optionMatches.push({
        index: matchOpt.index,
        marker: matchOpt[0],
        label: (matchOpt[1] || matchOpt[2]).toUpperCase(),
      });
    }

    let questionPart = "";
    let optionsArray: string[] = [];
    let answer = "A";
    let solution = "";

    if (optionMatches.length > 0) {
      questionPart = block.substring(0, optionMatches[0].index).trim();
      for (let i = 0; i < optionMatches.length; i++) {
        const start = optionMatches[i].index + optionMatches[i].marker.length;
        const end = i + 1 < optionMatches.length ? optionMatches[i + 1].index : block.length;
        let optText = block.substring(start, end).trim();

        const ansMatch = optText.match(/(?:Ans(?:wer)?|Correct|उत्तर)[:.\s]*([A-D])/i);
        if (ansMatch) {
          answer = ansMatch[1].toUpperCase();
          optText = optText.substring(0, ansMatch.index).trim();
        }

        const solMatch = optText.match(/(?:Sol(?:ution)?|Expl(?:anation)?|हल)[:.\s]*([\s\S]*)/i);
        if (solMatch) {
          solution = solMatch[1].trim();
          optText = optText.substring(0, solMatch.index).trim();
        }
        if (optText) optionsArray.push(optText);
      }
    } else {
      questionPart = block.trim();
    }

    let questionEn = questionPart.replace(/^\s*\d+[\.|\)]\s*/i, "").trim();
    let questionHi = "";

    const hindiRegex = /[\u0900-\u097F]/;
    if (hindiRegex.test(questionEn)) {
      const lines = questionEn.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length >= 2) {
        const hasHindi0 = hindiRegex.test(lines[0]);
        const hasHindi1 = hindiRegex.test(lines[1]);
        if (hasHindi0 && !hasHindi1) {
          questionHi = lines[0];
          questionEn = lines.slice(1).join(" ");
        } else if (!hasHindi0 && hasHindi1) {
          questionEn = lines[0];
          questionHi = lines.slice(1).join(" ");
        } else if (hasHindi0 && hasHindi1) {
          questionHi = questionEn;
          questionEn = "";
        }
      } else if (hindiRegex.test(questionEn)) {
        questionHi = questionEn;
        questionEn = "";
      }
    }

    if (answer === "A") {
      const globalAns = block.match(/(?:Ans(?:wer)?|Correct|उत्तर)[:.\s]*([A-D])\b/i);
      if (globalAns) answer = globalAns[1].toUpperCase();
    }

    const globalSol = block.match(/(?:Sol(?:ution)?|Expl(?:anation)?|हल)[:.\s]*([\s\S]{5,})/i);
    if (globalSol) solution = globalSol[1].trim();

    const realTextOptions = optionsArray.filter(o => o.trim().replace(/^[a-d][\s\)\.:]/i, '').trim().length > 5);
    const hasDiagramOptions = realTextOptions.length < 2;

    let qPageNum = 1;
    let questionImage = "";
    let hasDiagramOptionsFlag = false;
    let needsReview = false;

    if (pageMap && pageMap.length > 0) {
      const startIdx = blockStarts[bIdx];
      let matchedPage: any = null;
      for (const p of pageMap) {
        if (startIdx >= p.startIndex) {
          qPageNum = p.pageNumber;
          matchedPage = p;
        } else {
          break;
        }
      }

      if (matchedPage) {
        const questionText = (questionEn + questionHi + block).toLowerCase();
        const hasFigureRef = /fig(ure)?[\s.]*\d|diagram|circuit|graph|wave|shown below|given below|following figure|refer to|arrangement/i.test(questionText);

        if (hasDiagramOptions) {
          hasDiagramOptionsFlag = true;
          questionImage = ""; 
          needsReview = true;
        } else if (matchedPage.embeddedImages && matchedPage.embeddedImages.length > 0) {
          if (hasFigureRef) {
            questionImage = matchedPage.embeddedImages[0].dataUrl;
            needsReview = matchedPage.embeddedImages.length > 1; 
          } else if (matchedPage.embeddedImages.length === 1) {
            questionImage = matchedPage.embeddedImages[0].dataUrl;
            needsReview = false;
          } else {
            questionImage = matchedPage.embeddedImages[0].dataUrl;
            needsReview = true;
          }
        }
      }
    }

    if (!hasDiagramOptionsFlag && optionsArray.length < 2) {
        needsReview = true;
    }

    const finalOptions = hasDiagramOptionsFlag
      ? ["A", "B", "C", "D"]
      : (optionsArray.length >= 2 ? optionsArray.slice(0, 4) : ["Option A", "Option B", "Option C", "Option D"]);

    if (questionEn || questionHi) {
      questions.push({
        id: questions.length + 1,
        questionEn: questionEn || questionHi,
        questionHi: questionEn ? questionHi : "",
        type: "Multiple Choice",
        options: finalOptions,
        correctAnswer: answer,
        positiveMarks: 4,
        negativeMarks: -1,
        solution: solution || "Extracted from document",
        pageNumber: qPageNum,
        hasDiagramOptions: hasDiagramOptionsFlag,
        questionImage,
        needsReview
      });
    }
  }

  return questions;
}
