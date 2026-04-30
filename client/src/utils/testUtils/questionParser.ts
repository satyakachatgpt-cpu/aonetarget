import mammoth from "mammoth";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker (matching original Tests.tsx configuration)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "5.5.207"}/build/pdf.worker.min.mjs`;

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
          positiveMarks: Number(row.Marks || row.marks || 4),
          negativeMarks: Number(row.Negative || row.negative || 1),
        }));
        
        return { questions: parsedQuestions, extractedImages: [] };
      } catch (err) {
        console.error("Excel parsing error:", err);
        return { questions: [], extractedImages: [] };
      }
    } else if (extension === "pdf") {
      try {
        console.log("Starting PDF parsing for:", file.name);
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        const pageMap: { startIndex: number; pageNumber: number; embeddedImages: { dataUrl: string; y: number }[]; pageDataUrl: string }[] = [];
        const allExtractedImages: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const viewport = page.getViewport({ scale: 1.0 });
          const pageWidth = viewport.width;

          const items = (textContent.items as any[]).map(item => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width || 0,
            height: item.height || 12,
          })).filter(item => item.str.trim().length > 0);

          let pageText = "";
          if (items.length > 0) {
            const lines: any[][] = [];
            items.sort((a, b) => b.y - a.y);
            items.forEach(item => {
              let placed = false;
              for (const line of lines) {
                if (Math.abs(line[0].y - item.y) < 5) {
                  line.push(item);
                  placed = true;
                  break;
                }
              }
              if (!placed) lines.push([item]);
            });

            lines.forEach(line => line.sort((a, b) => a.x - b.x));
            lines.sort((a, b) => b[0].y - a[0].y);

            const mid = pageWidth / 2;
            let leftCount = 0;
            let rightCount = 0;
            items.forEach(it => {
              if (it.x + it.width < mid - 20) leftCount++;
              else if (it.x > mid + 20) rightCount++;
            });

            const isTwoColumn = leftCount > items.length * 0.3 && rightCount > items.length * 0.3;

            if (isTwoColumn) {
              const leftItems = items.filter(it => it.x < mid).sort((a, b) => b.y - a.y || a.x - b.x);
              const rightItems = items.filter(it => it.x >= mid).sort((a, b) => b.y - a.y || a.x - b.x);
              const colToText = (cItems: any[]) => {
                let txt = "";
                let ly = -1;
                cItems.forEach(it => {
                  if (ly !== -1 && Math.abs(it.y - ly) > 5) txt += "\n";
                  txt += it.str + " ";
                  ly = it.y;
                });
                return txt;
              };
              pageText = colToText(leftItems) + "\n" + colToText(rightItems);
            } else {
              lines.forEach(line => {
                line.forEach(it => { pageText += it.str + " "; });
                pageText += "\n";
              });
            }
          }

          pageText = pageText.split('\n')
            .filter(l => !/^\s*\d+\s*$/.test(l))
            .filter(l => !/IMPORTANT INSTRUCTIONS|Name of Candidate|Answer Sheet Code|Roll No/i.test(l))
            .join('\n');

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
      } catch (err) {
        console.error("PDF parsing error:", err);
        return { questions: [], extractedImages: [] };
      }
    }
    return { questions: [], extractedImages: [] };
}

export function extractQuestionsFromText(text: string, pageMap: any[] = [], originalFullText: string = ""): any[] {
    const questions: any[] = [];
    const normalizedText = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");
    const answerKeySource = originalFullText || normalizedText;

    const parseAnswerKeyFromText = (fullText: string) => {
      const keyMap: { [key: number]: string } = {};
      const lines = fullText.split('\n');
      const searchBlocks = [lines.slice(-500).join('\n'), fullText]; 
      
      const tablePatterns = [
        /(\d+)\s+([A-D1-4])(?:\s+|$)/g,
        /Q\.\s*(\d+)\s*Ans\.\s*([A-D1-4])/gi,
        /\b(\d+)\s*[\.\)]?\s*([A-D])\b/gi
      ];

      searchBlocks.forEach((block, idx) => {
        tablePatterns.forEach(regex => {
          let match;
          regex.lastIndex = 0;
          while ((match = regex.exec(block)) !== null) {
            const qNum = parseInt(match[1]);
            let ans = match[2].toUpperCase();
            if (ans === '1') ans = 'A';
            else if (ans === '2') ans = 'B';
            else if (ans === '3') ans = 'C';
            else if (ans === '4') ans = 'D';
            
            if (qNum > 0 && qNum < 500) {
                if (idx === 0 || !keyMap[qNum]) {
                    keyMap[qNum] = ans;
                }
            }
          }
        });
      });
      return keyMap;
    };

    const answerKeyMap = parseAnswerKeyFromText(answerKeySource);

    const splitQuestionBlocks = (fullText: string) => {
      const blocks: { number: number; text: string; startIndex: number }[] = [];
      // Task 2: Decimal protection
      const qStartRegex = /^\s*(\d{1,3})\s*(?:[\.\)](?=\s|[A-Za-z\u0900-\u097F]|$)|[ \t]+(?=[A-Za-z\u0900-\u097F]|$))/gm;
      
      // Stop splitting at Answer Key section (Task 6)
      const answerKeyMarkers = ["Answer Key", "ANSWER KEY", "Answer Sheet", "उत्तर कुंजी", "Correct Answer Table"];
      let cutoffIndex = fullText.length;
      for (const marker of answerKeyMarkers) {
        const idx = fullText.lastIndexOf(marker);
        if (idx !== -1 && idx > fullText.length * 0.7) {
          cutoffIndex = Math.min(cutoffIndex, idx);
        }
      }
      // TASK 2: Boundary Normalization
      const textToSplit = fullText.substring(0, cutoffIndex)
        .replace(/([^\n])\s+(\d{1,3})\.\s/g, (match, p1, p2) => {
            const n = parseInt(p2);
            if (n > 0 && n <= 500) return p1 + "\n" + p2 + ". ";
            return match;
        });

      let match;
      let lastMatch = null;
      let lastAcceptedNumber = 0;

      while ((match = qStartRegex.exec(textToSplit)) !== null) {
        const qNum = parseInt(match[1]);
        const matchedLine = textToSplit.substring(match.index, match.index + 50);
        const rawStart = matchedLine.slice(0, 12);

        // TASK 2: Hard decimal guard
        const isDecimal = /^\s*\d{1,3}\.\d/.test(rawStart);
        if (isDecimal) {
          if (qNum >= 84 && qNum <= 88) console.log(`[Parser-Trace] Q${qNum} DECIMAL CHECK: ${isDecimal}`);
          continue;
        }

        // TASK 3: Sequence filtering
        if (qNum <= lastAcceptedNumber) {
          if (qNum >= 84 && qNum <= 88) console.log(`[Parser-Trace] Q${qNum} SEQUENCE REJECT (Last: ${lastAcceptedNumber})`);
          continue;
        }

        if (qNum >= 84 && qNum <= 88) console.log(`[Parser-Trace] Detected candidate ${qNum}`);

        if (lastMatch) {
          const lastNum = parseInt(lastMatch[1]);
          const blockText = textToSplit.substring(lastMatch.index, match.index);
          blocks.push({ 
            number: lastNum, 
            text: blockText, 
            startIndex: lastMatch.index 
          });
          if (lastNum >= 84 && lastNum <= 88) console.log(`[Parser-Trace] Created block for Q${lastNum}`);
        }
        lastMatch = match;
        lastAcceptedNumber = qNum;
      }
      if (lastMatch) {
        const lastNum = parseInt(lastMatch[1]);
        const blockText = textToSplit.substring(lastMatch.index);
        blocks.push({ 
          number: lastNum, 
          text: blockText, 
          startIndex: lastMatch.index 
        });
        if (lastNum >= 84 && lastNum <= 88) console.log(`[Parser-Trace] Created final block for Q${lastNum}`);
      }
      const filtered = blocks.filter(b => {
        const t = b.text.trim();
        if (t.length < 10) return false;
        // Detect answer key table rows: "10 A 20 A 30 B" or "A 20 A 30 B"
        const answerKeyPattern = /\b\d{1,3}\s+[A-D1-4]\b/g;
        const matches = t.match(answerKeyPattern);
        
        // REFINED: Only drop if it's very dense with answers and relatively short
        if (matches && matches.length >= 5 && t.length < 150 && !t.includes('?') && !t.includes('।')) {
           return false;
        }
        
        if (b.number >= 84 && b.number <= 88) console.log(`[Parser-Trace] Q${b.number} passed block filter`);
        
        if (t.includes("Q. A. Q. A.") && t.length < 100) return false;
        
        return true;
      });
      return filtered;
    };

    const parseOptions = (blockText: string) => {
      let options: string[] = [];
      let mode: 'numeric' | 'upper' | 'lower' | 'none' = 'none';
      let stem = blockText;

      const numericMatches = [...blockText.matchAll(/\((1|2|3|4)\)/g)];
      const upperMatches = [...blockText.matchAll(/(?:\n|[ \t])([A-D])[\.\)]\s/g)];
      const lowerMatches = [...blockText.matchAll(/\(([a-d])\)/g)];
      const lowerDotMatches = [...blockText.matchAll(/(?:\n|[ \t])([a-d])[\.\)]\s/g)];

      if (numericMatches.length >= 4) {
        mode = 'numeric';
        const firstOptIndex = numericMatches[0].index!;
        stem = blockText.substring(0, firstOptIndex).trim();
        const parts = blockText.substring(firstOptIndex).split(/\((1|2|3|4)\)/);
        for (let i = 2; i < parts.length; i += 2) {
           options.push(parts[i].trim());
        }
      } else if (upperMatches.length >= 4) {
        mode = 'upper';
        const firstOptIndex = upperMatches[0].index!;
        stem = blockText.substring(0, firstOptIndex).trim();
        const parts = blockText.substring(firstOptIndex).split(/(?:\n|[ \t])[A-D][\.\)]\s/);
        options = parts.filter(p => p.trim().length > 0).map(p => p.trim());
      } else if (lowerMatches.length >= 4) {
        mode = 'lower';
        const firstOptIndex = lowerMatches[0].index!;
        stem = blockText.substring(0, firstOptIndex).trim();
        const parts = blockText.substring(firstOptIndex).split(/\(([a-d])\)/);
        for (let i = 2; i < parts.length; i += 2) {
          options.push(parts[i].trim());
        }
      } else if (lowerDotMatches.length >= 4) {
        mode = 'lower';
        const firstOptIndex = lowerDotMatches[0].index!;
        stem = blockText.substring(0, firstOptIndex).trim();
        const parts = blockText.substring(firstOptIndex).split(/(?:\n|[ \t])[a-d][\.\)]\s/);
        options = parts.filter(p => p.trim().length > 0).map(p => p.trim());
      }

      // Task 3: Option Guard
      options = options.map(opt => {
        const nextQ = opt.match(/(?:\b|\s|^)(\d{1,3})\.\s/);
        if (nextQ) {
          const n = parseInt(nextQ[1]);
          if (n > 0 && n <= 500) return opt.substring(0, nextQ.index).trim();
        }
        return opt;
      });

      return { options: options.slice(0, 4), stem, mode };
    };

    const normalizeLanguages = (stem: string) => {
      const hindiRegex = /[\u0900-\u097F]/;
      const lines = stem.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let enLines: string[] = [];
      let hiLines: string[] = [];

      lines.forEach(l => {
        if (hindiRegex.test(l)) hiLines.push(l);
        else enLines.push(l);
      });

      // Detect complex formula questions to preserve line breaks
      const mathSymbols = stem.match(/[\+\-\=\×\÷\>\<\%\$]/g) || [];
      const decimals = stem.match(/\d+\.\d+/g) || [];
      const isComplexFormula = (mathSymbols.length + decimals.length) >= 3;

      let qEn = enLines.join(isComplexFormula ? '\n' : ' ').trim();
      let qHi = hiLines.join(isComplexFormula ? '\n' : ' ').trim();
      if (!qEn && qHi) qEn = qHi;

      return { qEn, qHi, isComplexFormula };
    };

    const rawBlocks = splitQuestionBlocks(normalizedText);
    const parsedNumbers = new Set<number>();

    const legacyHindiRegex = /fuEufyf|gfj;k.kk|dks|iz|vk|;g/i;

    rawBlocks.forEach((blockObj) => {
      const { number, text: blockText, startIndex } = blockObj;
      const { options, stem, mode } = parseOptions(blockText);
      const { qEn, qHi, isComplexFormula } = normalizeLanguages(stem);

      let answer = answerKeyMap[number] || "";
      if (!answer) {
        const inlineAns = blockText.match(/(?:Ans(?:wer)?|Correct|उत्तर)[:.\s]*([A-D1-4])/i);
        if (inlineAns) {
          answer = inlineAns[1].toUpperCase();
          if (answer === '1') answer = 'A';
          else if (answer === '2') answer = 'B';
          else if (answer === '3') answer = 'C';
          else if (answer === '4') answer = 'D';
        }
      }

      const solMatch = blockText.match(/(?:Sol(?:ution)?|Expl(?:anation)?|हल)[:.\s]+([\s\S]*)/i);
      const solution = ""; // Task 6

      let qPageNum = 1;
      let matchedPage = null;
      if (pageMap && pageMap.length > 0) {
        for (const p of pageMap) {
          if (startIndex >= p.startIndex) {
            qPageNum = p.pageNumber;
            matchedPage = p;
          } else break;
        }
      }

      let questionImage = "";
      if (matchedPage && matchedPage.embeddedImages?.length > 0) {
        questionImage = matchedPage.embeddedImages[0].dataUrl;
      }

      const cleanQEn = qEn.replace(/^\s*\d+[\.\)]?\s*/, "").trim();
      const cleanQHi = qHi.replace(/^\s*\d+[\.\)]?\s*/, "").trim();
      
      const isLegacyHindi = legacyHindiRegex.test(cleanQEn) || legacyHindiRegex.test(cleanQHi) || legacyHindiRegex.test(options.join(" "));

      if (cleanQEn || cleanQHi) {
        if (number >= 84 && number <= 88) console.log(`[Parser-Trace] Q${number} normalized. enLen: ${cleanQEn.length}`);
        parsedNumbers.add(number);
        questions.push({
          id: questions.length + 1,
          questionNumber: number,
          originalQuestionNumber: number,
          orderIndex: number,
          questionEn: cleanQEn,
          questionHi: cleanQHi,
          type: "Multiple Choice",
          options: options.length >= 4 ? options.slice(0, 4) : ["", "", "", ""],
          correctAnswer: answer,
          positiveMarks: undefined,
          negativeMarks: undefined,
          solution: "",
          explanation: "",
          detailedExplanation: "",
          answerExplanation: "",
          pageNumber: qPageNum,
          hasDiagramOptions: options.length < 2 && mode === 'none',
          questionImage,
          needsReview: !answer || options.length < 4 || isLegacyHindi || isComplexFormula,
          warningReason: isLegacyHindi ? "Legacy encoded Hindi text detected; PDF text layer is not Unicode." : undefined,
          reviewReason: isLegacyHindi ? "Legacy Hindi text detected" : 
                        isComplexFormula ? "Complex formula layout detected; verify against PDF." : 
                        !answer ? "Missing answer" : "Incomplete options"
        });
      }
    });

    // Task B: Handle duplicates and sort (Task 2)
    const grouped = new Map<number, any[]>();
    questions.forEach(q => {
      const num = q.originalQuestionNumber;
      if (!grouped.has(num)) grouped.set(num, []);
      grouped.get(num)!.push(q);
    });

    const uniqueQuestions: any[] = [];
    grouped.forEach((list, num) => {
      if (list.length === 1) {
        uniqueQuestions.push(list[0]);
      } else {
        // Pick the best one: usually the one with longest English text
        const best = list.reduce((prev, curr) => {
           const prevLen = (prev.questionEn || "").length;
           const currLen = (curr.questionEn || "").length;
           return currLen > prevLen ? curr : prev;
        });
        uniqueQuestions.push(best);
      }
    });

    uniqueQuestions.sort((a, b) => (a.originalQuestionNumber || 0) - (b.originalQuestionNumber || 0));

    // Task 5: Sequence Validation
    const finalNumbersArr = uniqueQuestions.map(q => q.originalQuestionNumber).sort((a,b) => a-b);
    const finalNumbers = new Set(finalNumbersArr);
    const missing = [];
    const duplicates = [];
    const targetCount = 100;
    
    for (let i = 1; i <= targetCount; i++) {
      if (!finalNumbers.has(i)) missing.push(i);
    }
    
    const seen = new Set();
    uniqueQuestions.forEach(q => {
      if (seen.has(q.originalQuestionNumber)) duplicates.push(q.originalQuestionNumber);
      seen.add(q.originalQuestionNumber);
    });

    if (missing.length > 0 || duplicates.length > 0 || uniqueQuestions.length !== targetCount) {
      console.warn(`[Parser] Validation Failed: Missing ${missing.join(",")}, Duplicates ${duplicates.join(",")}`);
      (uniqueQuestions as any).isInvalidSequence = true;
      (uniqueQuestions as any).errorDetail = `Missing ${missing.length}, Duplicates ${duplicates.length}`;
    }

    return uniqueQuestions;
}
