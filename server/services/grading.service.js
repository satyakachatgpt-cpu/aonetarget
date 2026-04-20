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
    const studentAnswer = answers[q.id] || null;
    const isCorrect = studentAnswer === q.correctAnswer;
    
    // Resolve marks: Strictly use saved DB values
    const marks = Number(q.marks || q.positiveMarks || test.marksPerQuestion || 0);
    const qNeg = q.negativeMarks !== undefined && q.negativeMarks !== '' ? q.negativeMarks : null;
    const negMarks = Math.abs(Number(qNeg ?? test.negativeMarking ?? 0));

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
      questionId: q.id,
      studentAnswer,
      correctAnswer: q.correctAnswer,
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
