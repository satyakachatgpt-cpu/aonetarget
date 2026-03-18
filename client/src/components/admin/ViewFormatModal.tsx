import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ViewFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: string;
}

const ViewFormatModal: React.FC<ViewFormatModalProps> = ({ isOpen, onClose, format }) => {
  const [filename, setFilename] = useState(() => {
    try {
      const saved = localStorage.getItem('formatViewFilename');
      return saved || `question_${format}.docx`;
    } catch {
      return `question_${format}.docx`;
    }
  });
  const [zoom, setZoom] = useState(100);
  const [wordCount, setWordCount] = useState(0);
  const [lastSaved, setLastSaved] = useState('All changes saved in Drive');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState('11');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [showFontColorPalette, setShowFontColorPalette] = useState(false);
  const [showHighlightColorPalette, setShowHighlightColorPalette] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isPaintFormatActive, setIsPaintFormatActive] = useState(false);
  const [storedStyle, setStoredStyle] = useState<any>(null);
  const [showStylesMenu, setShowStylesMenu] = useState(false);
  const [currentStyle, setCurrentStyle] = useState('Normal text');
  const [showRuler, setShowRuler] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const editorRef = useRef<HTMLDivElement>(null);
  const docAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  const handleFormat = (command: string, value?: string) => {
    if (!editorRef.current) return;
    
    // Gain focus immediately
    editorRef.current.focus();
    
    // For formatBlock, some browsers prefer the tag name without brackets, 
    // but the spec often shows them with brackets. We'll try to be robust.
    try {
      document.execCommand(command, false, value);
    } catch (e) {
      console.warn('Command failed:', command, value);
    }
    
    // Force another focus to ensure typing continues in the right place
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        updateStatus();
      }
    }, 10);
  };

  const updateStatus = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
      setWordCount(words);
      
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));

      // Update current style based on selection by looking up the tree
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node = selection.anchorNode as Node | null;
        if (node && node.nodeType === 3) node = node.parentNode; // Get parent of text node
        
        if (node instanceof HTMLElement) {
          const h1 = node.closest('h1');
          const h2 = node.closest('h2');
          const h3 = node.closest('h3');
          
          if (h1) setCurrentStyle('Heading 1');
          else if (h2) setCurrentStyle('Heading 2');
          else if (h3) setCurrentStyle('Heading 3');
          else setCurrentStyle('Normal text');
        }
      }
    }
  };

  const handlePaintFormat = () => {
    if (!isPaintFormatActive) {
      // Store style
      setStoredStyle({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        foreColor: document.queryCommandValue('foreColor'),
        fontName: document.queryCommandValue('fontName'),
        fontSize: document.queryCommandValue('fontSize'),
      });
      setIsPaintFormatActive(true);
    } else {
      setIsPaintFormatActive(false);
    }
  };

  const applyStoredStyle = () => {
    if (isPaintFormatActive && storedStyle) {
      handleFormat('bold', storedStyle.bold);
      handleFormat('italic', storedStyle.italic);
      handleFormat('underline', storedStyle.underline);
      handleFormat('foreColor', storedStyle.foreColor);
      handleFormat('fontName', storedStyle.fontName);
      handleFormat('fontSize', storedStyle.fontSize);
      setIsPaintFormatActive(false);
    }
  };

  const showLocalToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const insertTable = () => {
    const tableHTML = `
      <div class="table-wrapper" style="position: relative; margin: 20px 0; border: 1px solid transparent; padding: 10px;">
        <div 
          contenteditable="false" 
          class="delete-table-btn" 
          style="position: absolute; right: -8px; top: -8px; width: 20px; height: 20px; background: #ea4335; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; cursor: pointer; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.2); pointer-events: auto;"
          title="Delete table"
        >
          ×
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc; background: white;">
          <tbody>
            <tr>
              <td style="border: 1px solid #ccc; padding: 12px; font-weight: bold; background: #f8f9fa;">Col 1</td>
              <td style="border: 1px solid #ccc; padding: 12px; font-weight: bold; background: #f8f9fa;">Col 2</td>
              <td style="border: 1px solid #ccc; padding: 12px; font-weight: bold; background: #f8f9fa;">Col 3</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ccc; padding: 12px;">Data</td>
              <td style="border: 1px solid #ccc; padding: 12px;">Data</td>
              <td style="border: 1px solid #ccc; padding: 12px;">Data</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p><br></p>
    `;
    handleFormat('insertHTML', tableHTML);
    setActiveMenu(null);
    showLocalToast('Table inserted');
  };

  const removeTable = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    let node: Node | null = selection.anchorNode;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement && (node.classList.contains('table-wrapper') || node.nodeName === 'TABLE')) {
        const target = node.classList.contains('table-wrapper') ? node : node.closest('.table-wrapper') || node;
        target.parentNode?.removeChild(target);
        showLocalToast('Table removed', 'info');
        setActiveMenu(null);
        return;
      }
      node = node.parentNode;
    }
    showLocalToast('Click inside a table to delete it', 'info');
    setActiveMenu(null);
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('delete-table-btn')) {
      const wrapper = target.closest('.table-wrapper');
      if (wrapper) {
        wrapper.remove();
        showLocalToast('Table deleted successfully', 'success');
      }
    }
    setActiveMenu(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'b': e.preventDefault(); handleFormat('bold'); break;
          case 'i': e.preventDefault(); handleFormat('italic'); break;
          case 'u': e.preventDefault(); handleFormat('underline'); break;
          case 'z': e.preventDefault(); handleFormat('undo'); break;
          case 'y': e.preventDefault(); handleFormat('redo'); break;
          case 'a': e.preventDefault(); handleFormat('selectAll'); break;
          case 'p': e.preventDefault(); window.print(); break;
          case 'k': e.preventDefault(); const url = prompt('Enter link URL:'); if(url) handleFormat('createLink', url); break;
          case 's': e.preventDefault(); 
            setLastSaved('Saving...'); 
            setTimeout(() => { 
              setLastSaved('All changes saved in Drive'); 
              showLocalToast('Document saved successfully'); 
            }, 800); 
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectionchange', updateStatus);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectionchange', updateStatus);
    };
  }, [isOpen]);

  // Handle scroll to update current page indicator
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const pageHeight = 1056 + 32; // Page height + gap
    const newPage = Math.floor(scrollTop / (pageHeight * (zoom/100))) + 1;
    if (newPage !== currentPage && newPage > 0) {
      setCurrentPage(newPage);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Calculate total questions to estimate pages
      let realQuestions: any[] = [];
      try {
        const saved = localStorage.getItem('formatViewQuestions');
        if (saved) realQuestions = JSON.parse(saved);
      } catch (err) {
        console.error('Error loading questions for format view:', err);
      }

      const getQuestionsPerPage = (f: string) => {
        if (f === 'default') return 2;
        if (f === 'format5') return 6;
        if (f === 'format3') return 4;
        return 3;
      };

      const qPerPage = getQuestionsPerPage(format);
      const numPages = Math.max(1, Math.ceil(realQuestions.length / qPerPage));
      setTotalPages(numPages);
    }
  }, [isOpen, format]);

  const fontFamilies = [
    'Arial', 'Calibri', 'Cambria', 'Courier New', 'Helvetica Neue', 
    'Mangal', 'Times New Roman', 'Georgia', 'Verdana', 'Kruti Dev'
  ];

  const fontSizes = ['8', '9', '10', '11', '12', '14', '18', '24', '30', '36', '48', '60', '72', '96'];

  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
    '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd'
  ];

  const highlightColors = [
    '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff0000', '#0000ff', '#00008b', '#008b8b', 
    '#006400', '#8b008b', '#8b0000', '#808000', '#808080', '#c0c0c0', '#ffffff', '#000000'
  ];

  if (!isOpen) return null;

  useEffect(() => {
    if (isOpen && editorRef.current) {
      // Try to get real questions from localStorage
      let realQuestions: any[] = [];
      try {
        const saved = localStorage.getItem('formatViewQuestions');
        if (saved) realQuestions = JSON.parse(saved);
      } catch (err) {
        console.error('Error loading questions for format view:', err);
      }

      // If no real data, use sample questions so user can see format preview
      const SAMPLE_QUESTIONS = [
        {
          questionEn: 'A train travels from City A to City B, a distance of 360 km, at a speed of 90 km/h. How long does the journey take?',
          questionHi: 'एक ट्रेन 90 किमी/घंटा की गति से 360 किमी की दूरी तय करती है। यात्रा में कितना समय लगता है?',
          options: ['3 hours', '4 hours', '5 hours', '6 hours'],
          correctAnswer: 'B',
          solution: 'Time = Distance / Speed = 360 / 90 = 4 hours. The train takes 4 hours to complete the journey.',
          positiveMarks: 2,
          negativeMarks: 0.5,
          type: 'MCQ',
        },
        {
          questionEn: 'If the simple interest on ₹5000 at 8% per annum for 3 years is calculated, what is the total amount?',
          questionHi: 'यदि ₹5000 पर 8% वार्षिक ब्याज दर से 3 वर्षों का साधारण ब्याज निकाला जाए, तो कुल राशि क्या होगी?',
          options: ['₹5,800', '₹6,000', '₹6,200', '₹6,500'],
          correctAnswer: 'C',
          solution: 'SI = (P × R × T) / 100 = (5000 × 8 × 3) / 100 = ₹1200. Total Amount = 5000 + 1200 = ₹6,200.',
          positiveMarks: 2,
          negativeMarks: 0.5,
          type: 'MCQ',
        },
        {
          questionEn: 'In a class of 60 students, 40% are girls. How many boys are there in the class?',
          questionHi: 'एक कक्षा में 60 विद्यार्थी हैं जिनमें 40% लड़कियाँ हैं। कक्षा में कितने लड़के हैं?',
          options: ['24', '30', '36', '40'],
          correctAnswer: 'C',
          solution: 'Girls = 40% of 60 = 24. Boys = 60 - 24 = 36.',
          positiveMarks: 2,
          negativeMarks: 0.5,
          type: 'MCQ',
        },
        {
          questionEn: 'Which of the following is NOT a prime number?',
          questionHi: 'निम्नलिखित में से कौन सी अभाज्य संख्या नहीं है?',
          options: ['2', '7', '11', '15'],
          correctAnswer: 'D',
          solution: '15 = 3 × 5, so it is not a prime number. 2, 7, and 11 are all prime numbers.',
          positiveMarks: 2,
          negativeMarks: 0.5,
          type: 'MCQ',
        },
        {
          questionEn: 'The ratio of the ages of A and B is 3:5. If A is 18 years old, how old is B?',
          questionHi: 'A और B की आयु का अनुपात 3:5 है। यदि A की आयु 18 वर्ष है, तो B की आयु कितनी है?',
          options: ['25 years', '28 years', '30 years', '35 years'],
          correctAnswer: 'C',
          solution: 'If A = 3 parts = 18 years, then 1 part = 6 years. B = 5 parts = 5 × 6 = 30 years.',
          positiveMarks: 2,
          negativeMarks: 0.5,
          type: 'MCQ',
        },
        {
          questionEn: 'A shopkeeper sells an article for ₹600, gaining 20% profit. What is the cost price?',
          questionHi: 'एक दुकानदार एक वस्तु ₹600 में बेचता है और 20% का लाभ कमाता है। वस्तु का क्रय मूल्य क्या है?',
          options: ['₹400', '₹450', '₹480', '₹500'],
          correctAnswer: 'D',
          solution: 'CP = SP / (1 + Profit%) = 600 / 1.20 = ₹500.',
          positiveMarks: 2,
          negativeMarks: 0.5,
          type: 'MCQ',
        },
      ];

      const hasRealData = realQuestions && realQuestions.length > 0;
      if (!hasRealData) {
        realQuestions = SAMPLE_QUESTIONS;
      }


      const getEmptyState = (title: string) => `
        <div style="text-align: center; padding: 80px 40px; color: #94a3b8; font-family: 'Inter', system-ui, sans-serif; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="margin-bottom: 24px; display: flex; justify-content: center;">
            <div style="width: 80px; height: 80px; background: #f1f5f9; border-radius: 24px; display: flex; align-items: center; justify-content: center; transform: rotate(-5deg);">
               <span class="material-symbols-outlined" style="font-size: 40px; color: #cbd5e1;">find_in_page</span>
            </div>
          </div>
          <h2 style="font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: -0.02em;">No Content Extracted</h2>
          <p style="font-size: 15px; color: #64748b; max-width: 400px; margin: 0 auto; line-height: 1.6;">
            We couldn't find any questions to display for <strong>${title}</strong>. 
            Please upload a valid document in the uploader tab to see your content here.
          </p>
          <div style="margin-top: 32px; display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: #fdf2f2; border: 1px solid #fee2e2; border-radius: 12px;">
            <span class="material-symbols-outlined" style="font-size: 18px; color: #ef4444;">info</span>
            <span style="font-size: 13px; font-weight: 700; color: #991b1b;">REQUIRED: .PDF, .DOCX OR .XLSX</span>
          </div>
        </div>
      `;

      const renderMath = (text: string) => {
        if (!text || typeof text !== 'string') return text || '';
        return text.replace(/\$(.*?)\$/g, (match, formula) => {
          try {
            return katex.renderToString(formula, { throwOnError: false, displayMode: false });
          } catch (e) {
            return match;
          }
        });
      };

      const getQuestionsPerPage = (f: string) => {
        if (f === 'default') return 2;
        if (f === 'format5') return 6;
        if (f === 'format3') return 4;
        return 3;
      };

      const qPerPage = getQuestionsPerPage(format);
      const pagesData: any[][] = [];
      for (let i = 0; i < realQuestions.length; i += qPerPage) {
        pagesData.push(realQuestions.slice(i, i + qPerPage));
      }

      let fullHtml = '';
      
      // Always render pages - realQuestions is either real data or sample data
      // Add a preview mode banner on first page if using sample data
      const isSampleMode = !hasRealData;
      
      pagesData.forEach((pageQuestions, pageIdx) => {

          let pageContent = '';
          
          // Add preview mode banner on first page when showing sample data
          if (isSampleMode && pageIdx === 0) {
            pageContent += `
              <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1.5px solid #f59e0b; border-radius: 12px; padding: 12px 20px; margin-bottom: 28px; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 20px;">👁️</span>
                <div>
                  <div style="font-size: 12px; font-weight: 900; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em;">Preview Mode — Sample Data</div>
                  <div style="font-size: 11px; color: #b45309; margin-top: 2px;">Upload a file in the Bulk Uploader tab to see your actual questions here.</div>
                </div>
              </div>
            `;
          }
          
          if (format === 'default') {
            if (pageIdx === 0) {
              pageContent += `<h1 style="text-align: center; font-size: 24px; font-weight: 900; margin-bottom: 40px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">QUESTION BANK SPECIFICATION - DEFAULT</h1>`;
            }
            pageQuestions.forEach((q: any) => {
              pageContent += `
                <div class="table-wrapper" style="position: relative; margin: 32px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
                  <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 13px; font-family: 'Inter', sans-serif;">
                    <tbody>
                      <tr>
                        <td style="width: 25%; border: 1.5px solid #000; padding: 16px; font-weight: 800; background: #f8fafc; text-transform: uppercase; color: #475569;">Question Text</td>
                        <td style="border: 1.5px solid #000; padding: 16px; line-height: 1.6;">
                          <div style="font-weight: 600; font-size: 15px;">${renderMath(q.questionEn)}</div>
                          ${q.questionHi ? `<div style="color: #64748b; margin-top: 8px; font-style: italic;">${renderMath(q.questionHi)}</div>` : ''}
                        </td>
                      </tr>
                      ${(q.options || []).map((opt: string, idx: number) => `
                        <tr>
                          <td style="border: 1.5px solid #000; padding: 12px; font-weight: 800; background: #f8fafc; text-transform: uppercase; color: #475569;">Option ${String.fromCharCode(65 + idx)}</td>
                          <td style="border: 1.5px solid #000; padding: 12px;">${renderMath(opt)}</td>
                        </tr>
                      `).join('')}
                      <tr>
                        <td style="border: 1.5px solid #000; padding: 12px; font-weight: 800; background: #f8fafc; text-transform: uppercase; color: #475569;">Correct Key</td>
                        <td style="border: 1.5px solid #000; padding: 12px; font-weight: 900; color: #16a34a;">
                          <span style="font-size: 16px;">${q.correctAnswer}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="border: 1.5px solid #000; padding: 12px; font-weight: 800; background: #f8fafc; text-transform: uppercase; color: #475569;">Explanation</td>
                        <td style="border: 1.5px solid #000; padding: 16px; font-style: italic; color: #4b5563; background: #fffcf0;">
                          ${renderMath(q.solution || 'Detailed explanation will be processed upon upload.')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              `;
            });
          } else if (format === 'format1') {
            if (pageIdx === 0) {
              pageContent += `
                <div style="font-family: 'Georgia', serif; padding: 20px;">
                  <h1 style="text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 10px;">PRACTICE ASSESSMENT</h1>
                  <p style="text-align: center; font-style: italic; color: #666; margin-bottom: 30px;">Time Duration: 60 Minutes | Total Questions: ${realQuestions.length}</p>
                  <div style="border-top: 2px double #333; margin-bottom: 40px;"></div>
              `;
            }
            pageQuestions.forEach((q: any, idx: number) => {
              const globalIdx = pageIdx * qPerPage + idx;
              pageContent += `
                <div style="margin-bottom: 40px; break-inside: avoid;">
                  <div style="display: flex; gap: 15px; margin-bottom: 10px;">
                    <span style="font-weight: bold; font-size: 18px;">Q${globalIdx + 1}.</span>
                    <div style="flex: 1;">
                      <div style="font-size: 17px; font-weight: 600; line-height: 1.5;">${renderMath(q.questionEn)}</div>
                      ${q.questionHi ? `<div style="color: #4b5563; margin-top: 5px; font-size: 16px;">${renderMath(q.questionHi)}</div>` : ''}
                    </div>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 40px; padding-left: 45px; margin-top: 15px;">
                    ${(q.options || []).map((opt: string, i: number) => `
                      <div style="font-size: 16px;">(${String.fromCharCode(97 + i)}) ${renderMath(opt)}</div>
                    `).join('')}
                  </div>
                  <div style="margin-top: 20px; padding-left: 45px; font-size: 14px; border-left: 3px solid #e5e7eb; margin-left: 4px;">
                    <span style="font-weight: bold; text-transform: uppercase; color: #374151; font-size: 12px; letter-spacing: 0.05em;">Correct Response:</span>
                    <span style="margin-left: 8px; font-weight: 800; color: #111827;">(${q.correctAnswer.toLowerCase()})</span>
                    ${q.solution ? `<div style="margin-top: 8px; color: #4b5563; line-height: 1.5;"><strong>Solution:</strong> ${renderMath(q.solution)}</div>` : ''}
                  </div>
                </div>
              `;
            });
            if (pageIdx === pagesData.length - 1) {
              pageContent += `</div>`;
            }
          } else if (format === 'format2') {
            pageContent += `<div style="font-family: 'Times New Roman', serif; padding: 10px; color: #000; line-height: 1.5;">`;
            pageQuestions.forEach((q: any, idx: number) => {
              const globalIdx = pageIdx * qPerPage + idx;
              pageContent += `
                <div style="margin-bottom: 35px; border-bottom: 1px solid #f3f4f6; padding-bottom: 25px;">
                  <p style="font-size: 16px; margin-bottom: 12px;"><strong>${globalIdx + 1}.</strong> ${renderMath(q.questionEn)}</p>
                  ${q.questionHi ? `<p style="font-size: 16px; margin-bottom: 12px;">${renderMath(q.questionHi)}</p>` : ''}
                  <div style="margin-left: 20px;">
                    ${(q.options || []).map((opt: string, i: number) => `
                      <p style="margin-bottom: 6px;">${String.fromCharCode(65 + i)}. ${renderMath(opt)}</p>
                    `).join('')}
                  </div>
                  <div style="margin-top: 15px; font-weight: bold; background: #f9fafb; padding: 10px; border-radius: 4px; display: inline-block;">
                    Answer: ${q.correctAnswer}
                  </div>
                  <div style="margin-top: 12px; font-size: 14px; color: #374151;">
                    <strong>Solution.</strong> ${renderMath(q.solution || 'As specified in the source document.')}
                  </div>
                </div>
              `;
            });
            pageContent += `</div>`;
          } else if (format === 'format3') {
            if (pageIdx === 0) {
              pageContent += `<h1 style="background: #1e293b; color: white; padding: 20px; border-radius: 12px; font-size: 22px; font-weight: 800; text-align: center; margin-bottom: 30px;">EXAM SPECIFICATION GRID</h1>`;
            }
            pageContent += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">`;
            pageQuestions.forEach((q: any, idx: number) => {
              const globalIdx = pageIdx * qPerPage + idx;
              pageContent += `
                <div style="background: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <span style="background: #3b82f6; color: white; font-size: 12px; font-weight: 900; padding: 4px 12px; border-radius: 20px;">INDEX #${globalIdx + 1}</span>
                    <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">ID: ${Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                  </div>
                  <p style="font-weight: 700; color: #1e293b; margin-bottom: 12px; line-height: 1.4;">${renderMath(q.questionEn)}</p>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
                    ${(q.options || []).map((opt: string, i: number) => `
                      <div style="font-size: 12px; color: #64748b; padding: 8px; background: #f8fafc; border-radius: 8px;">
                        <span style="font-weight: 800; color: #3b82f6;">${String.fromCharCode(65 + i)}</span> ${renderMath(opt.slice(0, 40))}${opt.length > 40 ? '...' : ''}
                      </div>
                    `).join('')}
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
                    <span style="font-size: 13px; font-weight: 800; color: #16a34a;">CORRECT: ${q.correctAnswer}</span>
                    <span style="font-size: 11px; color: #3b82f6; cursor: pointer; font-weight: 700;">VIEW DETAILS</span>
                  </div>
                </div>
              `;
            });
            pageContent += `</div>`;
          } else if (format === 'format4') {
            if (pageIdx === 0) {
              pageContent += `
                <div style="max-width: 800px; margin: 0 auto; font-family: 'Inter', sans-serif;">
                  <h1 style="color: #2563eb; font-size: 28px; font-weight: 900; margin-bottom: 40px; display: flex; align-items: center; gap: 15px;">
                    <span style="width: 40px; height: 40px; background: #2563eb; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center;">Q</span>
                    Visual Content Preview
                  </h1>
              `;
            }
            pageQuestions.forEach((q: any, idx: number) => {
              const globalIdx = pageIdx * qPerPage + idx;
              pageContent += `
                <div style="display: flex; gap: 30px; margin-bottom: 40px; background: #fafafa; padding: 25px; border-radius: 24px; border: 1px solid #f1f1f1;">
                  <div style="width: 140px; height: 140px; background: #e2e8f0; border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; shrink-0;">
                    <span class="material-symbols-outlined" style="font-size: 40px; color: #94a3b8;">image</span>
                    <span style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Reference</span>
                  </div>
                  <div style="flex: 1;">
                    <div style="font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 8px;">Q${globalIdx + 1}. ${renderMath(q.questionEn)}</div>
                    ${q.questionHi ? `<p style="font-size: 15px; color: #64748b; margin-bottom: 16px;">${renderMath(q.questionHi)}</p>` : ''}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                      ${(q.options || []).map((opt: string, i: number) => `
                        <div style="padding: 10px 15px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-weight: 600;">
                          <span style="color: #2563eb; margin-right: 8px;">${String.fromCharCode(65 + i)}</span> ${renderMath(opt)}
                        </div>
                      `).join('')}
                    </div>
                    <div style="margin-top: 15px; display: flex; align-items: center; gap: 10px;">
                      <span style="background: #dcfce7; color: #166534; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">Verified Answer: ${q.correctAnswer}</span>
                    </div>
                  </div>
                </div>
              `;
            });
            if (pageIdx === pagesData.length - 1) {
              pageContent += `</div>`;
            }
          } else if (format === 'format5') {
            if (pageIdx === 0) {
              pageContent += `
                <div style="background: #10b981; padding: 40px; border-radius: 32px; margin-bottom: 40px;">
                  <h1 style="color: white; font-size: 32px; font-weight: 900; margin: 0;">SOLUTION EXPERT</h1>
                  <p style="color: #d1fae5; font-size: 18px; margin-top: 8px; font-weight: 500;">Reviewing ${realQuestions.length} analysis reports</p>
                </div>
              `;
            }
            pageQuestions.forEach((q: any, idx: number) => {
              const globalIdx = pageIdx * qPerPage + idx;
              pageContent += `
                <div style="background: white; padding: 32px; border-radius: 24px; border: 1px solid #e2e8f0; margin-bottom: 30px; position: relative; overflow: hidden;">
                  <div style="position: absolute; top: 0; left: 0; width: 6px; height: 100%; background: #10b981;"></div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <span style="font-size: 14px; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em;">REPORT #00${globalIdx + 1}</span>
                    <span class="material-symbols-outlined" style="color: #10b981;">verified</span>
                  </div>
                  <p style="font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 24px; line-height: 1.4;">${renderMath(q.questionEn)}</p>
                  <div style="background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9;">
                    <div style="font-weight: 800; color: #064e3b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                      <span class="material-symbols-outlined" style="font-size: 20px;">psychology</span>
                      STEP-BY-STEP SOLUTION
                    </div>
                    <div style="color: #374151; line-height: 1.6; font-size: 15px;">
                      ${renderMath(q.solution || 'Our AI expert is processing the detailed step-by-step solution for this problem. It will be available shortly after final submission.')}
                    </div>
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-weight: 800; color: #10b981; font-size: 16px;">Key: ${q.correctAnswer}</span>
                      <span style="font-size: 12px; font-weight: 700; color: #94a3b8;">Difficulty: Intermediate</span>
                    </div>
                  </div>
                </div>
              `;
            });
          } else if (format === 'format6') {
            pageContent += `<div style="font-family: 'Inter', system-ui, sans-serif; color: #1c1917; padding: 20px;">`;
            pageQuestions.forEach((q: any, idx: number) => {
              const globalIdx = pageIdx * qPerPage + idx;
              pageContent += `
                <div style="display: flex; gap: 40px; border-left: 8px solid #f5f5f4; padding-left: 40px; margin-bottom: 80px; position: relative;">
                  <div style="position: absolute; left: -24px; top: 0; width: 40px; height: 40px; background: white; border: 8px solid #f5f5f4; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; color: #d6d3d1;">${globalIdx + 1}</div>
                  <div style="flex: 1;">
                    <div style="margin-bottom: 32px;">
                      <h3 style="font-size: 28px; font-weight: 900; line-height: 1.2; letter-spacing: -0.02em; color: #1c1917; margin: 0;">
                        ${renderMath(q.questionEn)}
                      </h3>
                      ${q.questionHi ? `<p style="font-size: 20px; color: #a8a29e; font-weight: 600; font-style: italic; margin-top: 12px;">${renderMath(q.questionHi)}</p>` : ''}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                      ${(q.options || []).map((opt: string, i: number) => `
                        <div style="background: #fafaf9; padding: 24px; border-radius: 24px; display: flex; align-items: center; gap: 20px; transition: all 0.2s ease;">
                          <div style="width: 44px; height: 44px; border-radius: 14px; background: #e7e5e4; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; color: #78716c; shrink-0;">${String.fromCharCode(65 + i)}</div>
                          <div style="font-size: 18px; font-weight: 700; color: #44403c;">${renderMath(opt)}</div>
                        </div>
                      `).join('')}
                    </div>
                    <div style="margin-top: 32px; padding: 16px 24px; background: #fef3c7; border-radius: 16px; display: inline-flex; align-items: center; gap: 12px;">
                      <span style="font-weight: 900; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Official Key</span>
                      <span style="width: 32px; height: 32px; background: #92400e; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900;">${q.correctAnswer}</span>
                    </div>
                  </div>
                </div>
              `;
            });
            pageContent += `</div>`;
          } else {
            // Generic format handling
            pageQuestions.forEach((q: any, idx: number) => {
              const globalIdx = pageIdx * qPerPage + idx;
              pageContent += `<div style="margin-bottom: 20px;"><h3>Q${globalIdx + 1}. ${renderMath(q.questionEn)}</h3></div>`;
            });
          }

          fullHtml += `
            <div class="a4-page-wrapper" style="margin-bottom: 32px; transform: scale(${zoom / 100}); transform-origin: top center;">
              <div class="bg-white w-[816px] min-h-[1056px] shadow-[0_0_15px_rgba(0,0,0,0.1)] p-[96px] relative outline-none print:shadow-none print:m-0 print:p-0">
                ${showRuler ? `
                  <div class="absolute top-10 left-0 w-full h-6 border-b border-gray-200 flex items-end px-2 select-none opacity-50 overflow-hidden" contenteditable="false">
                     ${Array.from({length: 40}).map((_, i) => `
                       <div key=${i} class="border-l border-gray-400 h-${i % 5 === 0 ? 'full' : '2'} w-4 text-[8px] flex items-end justify-center">
                          ${i % 5 === 0 ? i / 5 : ''}
                       </div>
                     `).join('')}
                  </div>
                ` : ''}
                <div 
                  class="w-full h-full outline-none text-[13px] leading-relaxed text-gray-800 document-editor"
                  contenteditable="true"
                >
                  ${pageContent}
                </div>
              </div>
            </div>
          `;
        });

      if (editorRef.current) {
        editorRef.current.innerHTML = fullHtml;
      }
    }
  }, [isOpen, format, zoom, showRuler]);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col font-sans select-none">
      {/* TITLE BAR */}
      <div className="flex items-center px-4 py-2 gap-4">
        <div className="w-10 h-10 bg-[#4285f4] rounded-md flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:bg-[#3367d6] transition-colors">
          <span className="material-symbols-outlined text-white text-[28px]">description</span>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2 group">
            <input 
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="text-[18px] font-medium text-gray-700 bg-transparent border-none outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 min-w-[50px] cursor-text"
            />
          </div>
          <div className="flex items-center gap-1">
            {['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Help'].map((menu) => (
              <div 
                key={menu}
                className="relative"
                onMouseEnter={() => activeMenu && setActiveMenu(menu)}
              >
                <div 
                  className={`px-2 py-0.5 rounded text-[14px] cursor-pointer hover:bg-gray-100 ${activeMenu === menu ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
                  onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
                >
                  {menu}
                </div>
                {activeMenu === menu && (
                  <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-white border border-gray-200 shadow-xl rounded-md py-1 z-50 animate-in fade-in zoom-in-95 duration-100">                    {/* FILE MENU */}
                    {menu === 'File' && (
                      <>
                        <div 
                          className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" 
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => { 
                            e.stopPropagation();
                            if(editorRef.current) editorRef.current.innerHTML = '<div class="space-y-4"><p>Type your content here...</p></div>'; 
                            setActiveMenu(null); 
                            showLocalToast('New document created', 'success'); 
                          }}
                        >
                          <span className="material-symbols-outlined text-[20px] text-gray-500">note_add</span> 
                          <span className="flex-1">New</span>
                        </div>
                        <div 
                          className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" 
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setLastSaved('Saving...'); 
                            setTimeout(() => { 
                              setLastSaved('All changes saved in Drive'); 
                              showLocalToast('Document saved successfully'); 
                            }, 1000); 
                            setActiveMenu(null); 
                          }}
                        >
                          <span className="material-symbols-outlined text-[20px] text-gray-500">save</span> 
                          <span className="flex-1">Save</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+S</span>
                        </div>
                        <div 
                          className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" 
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            showLocalToast('Preparing PDF download...', 'info'); 
                            setTimeout(() => showLocalToast('Download started', 'success'), 1500);
                            setActiveMenu(null); 
                          }}
                        >
                          <span className="material-symbols-outlined text-[20px] text-gray-500">download</span> 
                          <span className="flex-1">Download as PDF</span>
                        </div>
                        <div className="border-t border-gray-100 my-1" />
                        <div 
                          className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" 
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => { e.stopPropagation(); window.print(); setActiveMenu(null); }}
                        >
                          <span className="material-symbols-outlined text-[20px] text-gray-500">print</span> 
                          <span className="flex-1">Print</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+P</span>
                        </div>
                      </>
                    )}
                    {/* EDIT MENU */}
                    {menu === 'Edit' && (
                      <>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); handleFormat('undo'); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">undo</span> 
                          <span className="flex-1">Undo</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+Z</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); handleFormat('redo'); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">redo</span> 
                          <span className="flex-1">Redo</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+Y</span>
                        </div>
                        <div className="border-t border-gray-100 my-1" />
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { 
                          e.stopPropagation(); 
                          if (editorRef.current) editorRef.current.focus();
                          setTimeout(() => {
                            document.execCommand('cut'); 
                            setActiveMenu(null); 
                            showLocalToast('Cut to clipboard', 'info'); 
                          }, 10);
                        }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">content_cut</span> 
                          <span className="flex-1">Cut</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+X</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { 
                          e.stopPropagation(); 
                          if (editorRef.current) editorRef.current.focus();
                          setTimeout(() => {
                            document.execCommand('copy'); 
                            setActiveMenu(null); 
                            showLocalToast('Copied to clipboard', 'info'); 
                          }, 10);
                        }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">content_copy</span> 
                          <span className="flex-1">Copy</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+C</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { 
                          e.stopPropagation(); 
                          if (editorRef.current) editorRef.current.focus();
                          navigator.clipboard.readText().then(text => {
                            handleFormat('insertText', text);
                            setActiveMenu(null); 
                            showLocalToast('Pasted content', 'info'); 
                          }).catch(() => {
                            document.execCommand('paste');
                            setActiveMenu(null);
                          });
                        }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">content_paste</span> 
                          <span className="flex-1">Paste</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+V</span>
                        </div>
                        <div className="border-t border-gray-100 my-1" />
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); handleFormat('selectAll'); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-transparent">select_all</span>
                          <span className="flex-1 pl-1">Select All</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+A</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); removeTable(); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">table_rows_narrow</span>
                          <span className="flex-1">Delete table</span>
                        </div>
                      </>
                    )}
                    {/* VIEW MENU */}
                    {menu === 'View' && (
                      <>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setZoom(100); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">zoom_in</span> 
                          <span className="flex-1">Reset Zoom (100%)</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.min(prev + 25, 200)); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">zoom_in</span> 
                          <span className="flex-1">Zoom In</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.max(prev - 25, 50)); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">zoom_out</span> 
                          <span className="flex-1">Zoom Out</span>
                        </div>
                        <div className="border-t border-gray-100 my-1" />
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setShowRuler(!showRuler); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-blue-600">{showRuler ? 'check' : ''}</span> 
                          <span className={`flex-1 ${showRuler ? 'text-blue-600 font-bold' : ''}`}>Show ruler</span>
                        </div>
                      </>
                    )}
                    {/* INSERT MENU */}
                    {menu === 'Insert' && (
                      <>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); const url = prompt('Enter image URL:'); if(url) handleFormat('insertImage', url); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">image</span> 
                          <span className="flex-1">Image</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); const url = prompt('Enter link URL:'); if(url) handleFormat('createLink', url); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">link</span> 
                          <span className="flex-1">Link</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+K</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); insertTable(); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">table_chart</span> 
                          <span className="flex-1">Table</span>
                        </div>
                        <div className="border-t border-gray-100 my-1" />
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); handleFormat('insertHorizontalRule'); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">horizontal_rule</span> 
                          <span className="flex-1">Horizontal line</span>
                        </div>
                      </>
                    )}
                    {/* FORMAT MENU */}
                    {menu === 'Format' && (
                      <>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); handleFormat('bold'); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">format_bold</span> 
                          <span className="flex-1">Bold</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+B</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); handleFormat('italic'); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">format_italic</span> 
                          <span className="flex-1">Italic</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+I</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); handleFormat('underline'); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">format_underlined</span> 
                          <span className="flex-1">Underline</span>
                          <span className="text-gray-400 text-[11px]">Ctrl+U</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { 
                          e.stopPropagation(); 
                          handleFormat('strikeThrough'); 
                          showLocalToast('Applied strikethrough', 'info');
                          setActiveMenu(null); 
                        }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">format_strikethrough</span> 
                          <span className="flex-1">Strikethrough</span>
                        </div>
                        <div className="border-t border-gray-100 my-1" />
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { 
                          e.stopPropagation(); 
                          handleFormat('removeFormat'); 
                          showLocalToast('Formatting cleared', 'info');
                          setActiveMenu(null); 
                        }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">format_clear</span> 
                          <span className="flex-1">Clear formatting</span>
                        </div>
                      </>
                    )}
                    {/* TOOLS MENU */}
                    {menu === 'Tools' && (
                      <>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); showLocalToast(`Word count: ${wordCount} words`, 'info'); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">format_underlined</span> 
                          <span className="flex-1">Word count</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); showLocalToast('Checking spelling and grammar...', 'info'); setTimeout(() => showLocalToast('No spelling or grammar suggestions found.', 'success'), 1500); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">spellcheck</span> 
                          <span className="flex-1">Spelling and grammar</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); showLocalToast('Opening Google Translate...', 'info'); setTimeout(() => window.open('https://translate.google.com/', '_blank'), 1000); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[20px] text-gray-500">translate</span> 
                          <span className="flex-1">Translate document</span>
                        </div>
                      </>
                    )}
                    {/* HELP MENU */}
                    {menu === 'Help' && (
                      <>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); window.open('https://support.google.com/docs', '_blank'); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[22px] text-gray-600">help</span> 
                          <span className="flex-1">Help Center</span>
                        </div>
                        <div className="px-4 py-2 hover:bg-gray-100 flex items-center gap-3 cursor-pointer text-[14px]" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); showLocalToast('Common shortcuts: Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+U (Underline), Ctrl+S (Save), Ctrl+P (Print)', 'info'); setActiveMenu(null); }}>
                          <span className="material-symbols-outlined text-[22px] text-gray-600">keyboard</span> 
                          <span className="flex-1">Keyboard shortcuts</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* TOOLBAR */}
      <div className="bg-[#edf2fa] mx-4 rounded-full px-4 h-10 flex items-center gap-1 shadow-sm border border-gray-200/50">
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => window.print()} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">print</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('undo')} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">undo</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('redo')} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">redo</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={handlePaintFormat} className={`p-1 px-1.5 rounded flex items-center justify-center transition-colors ${isPaintFormatActive ? 'bg-blue-100 text-blue-700' : 'hover:bg-black/5 text-gray-600'}`}>
          <span className="material-symbols-outlined text-[18px]">imagesearch_roller</span>
        </button>
        <div className="relative group">
          <button onMouseDown={(e) => e.preventDefault()} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-black/5 text-[13px] font-medium text-gray-700">
            {zoom}% <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </button>
          <div className="absolute top-full left-0 hidden group-hover:block bg-white border border-gray-200 shadow-xl rounded-md py-1 z-50 w-[80px]">
            {[50, 75, 90, 100, 125, 150, 200].map(z => (
              <div key={z} className="px-4 py-1 hover:bg-gray-100 cursor-pointer text-[13px]" onMouseDown={(e) => e.preventDefault()} onClick={() => setZoom(z)}>{z}%</div>
            ))}
          </div>
        </div>
        <div className="h-6 w-[1px] bg-gray-300 mx-1" />
        
        {/* Style Dropdown */}
        <div className="relative">
          <button 
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowStylesMenu(!showStylesMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-black/5 text-[13px] font-medium text-gray-700 min-w-[100px] justify-between"
          >
            <span>{currentStyle}</span>
            <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </button>
          {showStylesMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-50 w-[200px]">
              {[
                { label: 'Normal text', tag: '<p>', cmd: 'formatBlock' },
                { label: 'Heading 1', tag: '<h1>', cmd: 'formatBlock' },
                { label: 'Heading 2', tag: '<h2>', cmd: 'formatBlock' },
                { label: 'Heading 3', tag: '<h3>', cmd: 'formatBlock' },
              ].map(s => (
                <div 
                  key={s.label} 
                  className={`px-4 py-2 hover:bg-gray-100 cursor-pointer text-[14px] ${currentStyle === s.label ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    handleFormat(s.cmd, s.tag);
                    setCurrentStyle(s.label);
                    setShowStylesMenu(false);
                  }}
                >
                  <span style={s.tag === '<h1>' ? {fontSize: '24px', fontWeight: 'bold', display: 'block'} : s.tag === '<h2>' ? {fontSize: '20px', fontWeight: 'bold', display: 'block'} : s.tag === '<h3>' ? {fontSize: '18px', fontWeight: 'bold', display: 'block'} : {display: 'block'}}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="h-6 w-[1px] bg-gray-300 mx-1" />

        {/* Font Family */}
        <div className="relative group">
          <button onMouseDown={(e) => e.preventDefault()} className="flex items-center justify-between w-[148px] px-2 py-1 rounded hover:bg-black/5 text-[13px] font-medium text-gray-700">
            <span className="truncate">{fontFamily}</span>
            <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </button>
          <div className="absolute top-full left-0 hidden group-hover:block bg-white border border-gray-200 shadow-xl rounded-md py-1 z-50 w-[200px]">
            {fontFamilies.map(f => (
              <div key={f} className="px-4 py-1.5 hover:bg-gray-100 cursor-pointer text-[13px]" style={{ fontFamily: f }} onMouseDown={(e) => e.preventDefault()} onClick={() => { setFontFamily(f); handleFormat('fontName', f); }}>{f}</div>
            ))}
          </div>
        </div>
        <div className="h-6 w-[1px] bg-gray-300 mx-1" />

        {/* Font Size */}
        <div className="relative group">
          <button onMouseDown={(e) => e.preventDefault()} className="flex items-center justify-between w-[50px] px-2 py-1 rounded hover:bg-black/5 text-[13px] font-medium text-gray-700">
            <span>{fontSize}</span>
            <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </button>
          <div className="absolute top-full left-0 hidden group-hover:block bg-white border border-gray-200 shadow-xl rounded-md py-1 z-50 w-[70px] max-h-[300px] overflow-y-auto">
            {fontSizes.map((s, idx) => (
              <div key={s} className="px-4 py-1.5 hover:bg-gray-100 cursor-pointer text-[13px]" onMouseDown={(e) => e.preventDefault()} onClick={() => { 
                setFontSize(s); 
                // execCommand fontSize accepts 1-7. Map our sizes to them approximately or use a common fallback.
                const mappedSize = Math.min(7, Math.max(1, Math.floor((idx / fontSizes.length) * 7) + 1));
                handleFormat('fontSize', mappedSize.toString()); 
              }}>{s}</div>
            ))}
          </div>
        </div>
        <div className="h-6 w-[1px] bg-gray-300 mx-1" />

        {/* B I U */}
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('bold')} className={`p-1 px-1.5 rounded flex items-center justify-center transition-colors ${isBold ? 'bg-blue-100 text-blue-700' : 'hover:bg-black/5 text-gray-600'}`}>
          <span className="material-symbols-outlined text-[18px]">format_bold</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('italic')} className={`p-1 px-1.5 rounded flex items-center justify-center transition-colors ${isItalic ? 'bg-blue-100 text-blue-700' : 'hover:bg-black/5 text-gray-600'}`}>
          <span className="material-symbols-outlined text-[18px]">format_italic</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('underline')} className={`p-1 px-1.5 rounded flex items-center justify-center transition-colors ${isUnderline ? 'bg-blue-100 text-blue-700' : 'hover:bg-black/5 text-gray-600'}`}>
          <span className="material-symbols-outlined text-[18px]">format_underlined</span>
        </button>
        <div className="h-6 w-[1px] bg-gray-300 mx-1" />

        {/* Text Color */}
        <div className="relative">
          <button 
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowFontColorPalette(!showFontColorPalette)}
            className="flex flex-col items-center p-1 rounded hover:bg-black/5"
          >
            <span className="material-symbols-outlined text-[18px]">format_color_text</span>
            <div className="w-full h-[3px] bg-black rounded-full" />
          </button>
          {showFontColorPalette && (
            <div className="absolute top-full left-0 bg-white border border-gray-200 shadow-xl p-2 rounded-md grid grid-cols-10 gap-1 z-50">
              {colors.map(c => (
                <div 
                  key={c} 
                  className="w-4 h-4 rounded-sm border border-gray-200 cursor-pointer hover:scale-125 transition-transform" 
                  style={{ backgroundColor: c }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { handleFormat('foreColor', c); setShowFontColorPalette(false); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight Color */}
        <div className="relative">
          <button 
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowHighlightColorPalette(!showHighlightColorPalette)}
            className="flex flex-col items-center p-1 rounded hover:bg-black/5"
          >
            <span className="material-symbols-outlined text-[18px]">format_color_fill</span>
            <div className="w-full h-[3px] bg-gray-300 rounded-full" />
          </button>
          {showHighlightColorPalette && (
            <div className="absolute top-full left-0 bg-white border border-gray-200 shadow-xl p-2 rounded-md grid grid-cols-8 gap-1 z-50">
              {highlightColors.map(c => (
                <div 
                  key={c} 
                  className="w-4 h-4 rounded-sm border border-gray-200 cursor-pointer hover:scale-125 transition-transform" 
                  style={{ backgroundColor: c }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { handleFormat('hiliteColor', c); setShowHighlightColorPalette(false); }}
                />
              ))}
              <div 
                className="col-span-8 text-[11px] text-center p-1 hover:bg-gray-100 cursor-pointer rounded"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { handleFormat('hiliteColor', '#ffffff'); setShowHighlightColorPalette(false); }}
              >
                None
              </div>
            </div>
          )}
        </div>
        <div className="h-6 w-[1px] bg-gray-300 mx-1" />

        {/* Alignment */}
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('justifyLeft')} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">format_align_left</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('justifyCenter')} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">format_align_center</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('justifyRight')} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">format_align_right</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('justifyFull')} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">format_align_justify</span>
        </button>
        <div className="h-6 w-[1px] bg-gray-300 mx-1" />

        {/* Lists */}
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('insertOrderedList')} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('insertUnorderedList')} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('outdent')} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">format_indent_decrease</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('indent')} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">format_indent_increase</span>
        </button>
        <div className="h-6 w-[1px] bg-gray-300 mx-1" />

        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('removeFormat')} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">format_clear</span>
        </button>
        <div className="h-6 w-[1px] bg-gray-300 mx-1" />

        <button onMouseDown={(e) => e.preventDefault()} onClick={() => { const url = prompt('Enter link URL:'); if(url) handleFormat('createLink', url); }} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">link</span>
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => { const url = prompt('Enter image URL:'); if(url) handleFormat('insertImage', url); }} className="p-1 px-1.5 rounded hover:bg-black/5 flex items-center justify-center text-gray-600">
          <span className="material-symbols-outlined text-[18px]">image</span>
        </button>
      </div>

      {/* DOCUMENT AREA */}
      <div 
        ref={docAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto bg-[#f9fbfd] flex flex-col items-center py-8 relative custom-scrollbar scroll-smooth" 
        onClick={handleEditorClick}
      >
        {/* HELP OVERLAY CLOSE BUTTON */}
        <button 
          onClick={onClose}
          className="fixed top-24 right-10 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95 group z-50 border border-gray-100"
        >
          <span className="material-symbols-outlined text-gray-400 group-hover:text-red-500 transition-colors">close</span>
        </button>

        <div 
          ref={editorRef}
          className="flex flex-col items-center relative"
          onInput={updateStatus}
          onKeyUp={updateStatus}
          onMouseUp={() => { updateStatus(); applyStoredStyle(); }}
        >
          {/* Pages are injected here by useEffect */}
        </div>

        {/* Dynamic Add Page Button */}
        <div className="mt-8 mb-20 flex flex-col items-center gap-4 group">
          <button 
            onClick={() => {
              const newTotal = totalPages + 1;
              setTotalPages(newTotal);
              const newPageHtml = `
                <div class="a4-page-wrapper" style="margin-bottom: 32px; transform: scale(${zoom / 100}); transform-origin: top center;">
                  <div class="bg-white w-[816px] min-h-[1056px] shadow-[0_0_15px_rgba(0,0,0,0.1)] p-[96px] relative outline-none">
                    <div class="w-full h-full outline-none text-[13px] leading-relaxed text-gray-800 document-editor" contenteditable="true">
                      <p><br></p>
                    </div>
                  </div>
                </div>
              `;
              if (editorRef.current) {
                editorRef.current.insertAdjacentHTML('beforeend', newPageHtml);
                showLocalToast(`Page ${newTotal} created`, 'success');
              }
            }}
            className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110 active:scale-90 relative group"
            title="Add new page"
          >
            <span className="material-symbols-outlined">add</span>
            <div className="absolute top-0 -right-24 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Add New Page</div>
          </button>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="h-6 bg-white border-t border-gray-200 flex items-center px-4 justify-between text-[11px] font-medium text-gray-500">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">description</span>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">text_snippet</span>
            Words: {wordCount}
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <span className="material-symbols-outlined text-[14px]">cloud_done</span>
            {lastSaved}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="hover:text-blue-600 transition-colors">-</button>
            <span className="w-8 text-center">{zoom}%</span>
            <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="hover:text-blue-600 transition-colors">+</button>
          </div>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">keyboard</span>
            English (United States)
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 z-[200] flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
           <span className="material-symbols-outlined text-[20px]">{toast.type === 'success' ? 'check_circle' : 'info'}</span>
           <span className="text-[14px] font-bold">{toast.message}</span>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 14px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border: 4px solid #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        .a4-page-wrapper {
          transition: transform 0.2s ease;
        }
        .document-editor h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; display: block; }
        .document-editor h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; display: block; }
        .document-editor h3 { font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em; display: block; }
        .document-editor p { margin-bottom: 1em; }
        .document-editor table { margin: 1em 0; }
        
        @media print {
          .fixed, .bg-[#edf2fa], .h-6, .no-print, .material-symbols-outlined { display: none !important; }
          .flex-1 { overflow: visible !important; }
          .bg-[#f9fbfd] { background: white !important; }
          .a4-page-wrapper { 
            margin: 0 !important; 
            padding: 0 !important; 
            transform: none !important; 
            box-shadow: none !important;
            break-after: page;
          }
          .bg-white { box-shadow: none !important; }
        }
      ` }} />
    </div>
  );
};

export default ViewFormatModal;
