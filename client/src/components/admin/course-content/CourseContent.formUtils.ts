import { VideoForm, YoutubeZoomForm, WebinarForm, Question } from "./CourseContent.types";

export const initialYoutubeZoomForm: YoutubeZoomForm = {
  title: '',
  description: '',
  image: '',
  isFree: false,
  link: '',
  pdf1: '',
  pdf2: '',
  studyMaterial: '',
  slug: '',
  seoTitle: '',
  seoDescription: '',
  enableChat: true,
  enableQA: false,
  notifyStudents: true,
  allowReplay: true,
  autoStart: false,
  visibility: 'public',
  chatModeration: false,
  platform: 'YouTube Live',
  streamStatus: 'upcoming',
  endTime: '',
  recordedLink: '',
  scheduleDate: '',
  scheduleTime: '',
  scheduledAt: ''
};

export const initialLiveStreamForm = {
  title: '',
  description: '',
  image: '',
  isFree: false,
  pdf1: '',
  pdf2: '',
  studyMaterial: '',
  allowPdfExport: '',
  slug: '',
  seoTitle: '',
  seoDescription: '',
  streamSource: 'YouTube',
  streamId: '',
  enableChat: true,
  enableAttendance: false,
  notifyStudents: true,
  allowDownload: false,
  chatVisibility: 'Everyone',
  order: '0.00',
  scheduleDate: '',
  scheduleTime: '',
  scheduledAt: ''
};


export const initialWebinarForm: WebinarForm = {
  title: '',
  description: '',
  image: '',
  isFree: false,
  link: '',
  streamStatus: 'Live',
  pdf1: '',
  pdf2: '',
  studyMaterial: '',
  slug: '',
  seoTitle: '',
  seoDescription: '',
  enableChat: true,
  quizId: '',
  allowDownload: false,
  chatVisibility: 'Everyone',
  videoRestrictions: false,
  order: '0.00'
};

export const initialVideoForm: VideoForm = {
  title: '',
  description: '',
  youtubeUrl: '',
  videoUrl: '',
  duration: '',
  isFree: false,
  order: 0,
  status: 'active'
};

export const initialNoteForm = {
  title: '',
  description: '',
  fileUrl: '',
  fileSize: '',
  isFree: false,
  order: 0,
  status: 'active' as 'active' | 'inactive'
};

export const initialTestForm = {
  name: '',
  description: '',
  duration: 60,
  totalMarks: 100,
  passingMarks: 40,
  numberOfQuestions: 0,
  marksPerQuestion: 4,
  negativeMarking: 0,
  openDate: '',
  closeDate: '',
  isFree: false,
  status: 'active' as 'active' | 'inactive'
};

export const initialQuestionForm: Omit<Question, 'id' | '_id'> = {
  question: '',
  questionImage: '',
  optionA: '',
  optionAImage: '',
  optionB: '',
  optionBImage: '',
  optionC: '',
  optionCImage: '',
  optionD: '',
  optionDImage: '',
  correctAnswer: 'A',
  explanation: '',
  marks: 4,
  negativeMarks: 0
};
