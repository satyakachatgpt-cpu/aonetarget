/**
 * Pure Grading Logic for MCQ Tests
 * No Database access allowed here.
 */

export const evaluateTest = ({ questions, answers, test }) => {
  const testNegativeMarking = test.negativeMarking || 0;
  let correctCount = 0;
  let wrongCount = 0;
  let totalMarks = 0;
  let obtainedMarks = 0;
  let negativeMarksTotal = 0;

  const questionResults = questions.map((q) => {
    const qIdStr = q.id ? String(q.id) : (q._id ? q._id.toString() : null);
    const studentAnswer = qIdStr ? (answers[qIdStr] || null) : null;
    const normalizedCorrect = (q.correctAnswer || q.correct_answer || q.answer || q['Correct Answer'] || q.correctOption || 'A').toString().toUpperCase().trim();
    const isCorrect = studentAnswer && (studentAnswer.toString().toUpperCase().trim() === normalizedCorrect);
    
    // Resolve marks: Test-level wins, then Question-level fallback, then 0. 
    // We use explicit checks for undefined/null/empty string to allow 0.
    const tMarks = (test.marksPerQuestion !== undefined && test.marksPerQuestion !== null && test.marksPerQuestion !== '') ? Number(test.marksPerQuestion) :
                   (test.marks !== undefined && test.marks !== null && test.marks !== '') ? Number(test.marks) : null;
    
    const qMarks = (q.marks !== undefined && q.marks !== null && q.marks !== '') ? Number(q.marks) : 
                   (q.positiveMarks !== undefined && q.positiveMarks !== null && q.positiveMarks !== '') ? Number(q.positiveMarks) : null;
    
    const marks = tMarks !== null ? tMarks : (qMarks !== null ? qMarks : 0);

    const tNeg = (test.negativeMarking !== undefined && test.negativeMarking !== null && test.negativeMarking !== '') ? test.negativeMarking : 
                 (test.negative !== undefined && test.negative !== null && test.negative !== '') ? test.negative : null;
                 
    const qNeg = (q.negativeMarks !== undefined && q.negativeMarks !== null && q.negativeMarks !== '') ? q.negativeMarks : 
                 (q.negative !== undefined && q.negative !== null && q.negative !== '') ? q.negative : null;
    
    const negMarks = Math.abs(Number(tNeg !== null ? tNeg : (qNeg !== null ? qNeg : 0)));

    totalMarks += marks;

    if (studentAnswer) {
      if (isCorrect) {
        correctCount++;
        obtainedMarks += marks;
      } else {
        wrongCount++;
        negativeMarksTotal += negMarks;
        obtainedMarks -= negMarks;
      }
    }

    return {
      questionId: qIdStr,
      studentAnswer,
      correctAnswer: normalizedCorrect,
      isCorrect,
      marks,
      negativeMarks: (!isCorrect && studentAnswer) ? negMarks : 0
    };
  });

  const answeredCount = Object.keys(answers).filter(k => answers[k]).length;

  return {
    questionResults,
    totalQuestions: questions.length,
    correctAnswers: correctCount,
    wrongAnswers: wrongCount,
    unanswered: questions.length - answeredCount,
    totalMarks,
    obtainedMarks: Math.max(0, obtainedMarks),
    negativeMarksTotal,
    percentage: totalMarks > 0 ? Math.round((Math.max(0, obtainedMarks) / totalMarks) * 100) : 0,
  };
};
