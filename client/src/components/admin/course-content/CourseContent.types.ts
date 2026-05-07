export interface Course {
  id: string;
  _id?: string;
  name: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  thumbnail?: string;
  price?: string | number;
  originalPrice?: string | number;
  categoryId?: string;
  status?: string;
  isPublished?: boolean;
}

export interface Question {
  id: string;
  _id?: string;
  question: string;
  questionImage?: string;
  optionA: string;
  optionAImage?: string;
  optionB: string;
  optionBImage?: string;
  optionC: string;
  optionCImage?: string;
  optionD: string;
  optionDImage?: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  marks: number;
  negativeMarks?: number;
}

export interface Video {
  id: string;
  _id?: string;
  courseId?: string;
  title: string;
  description?: string;
  youtubeUrl?: string;
  videoUrl?: string;
  url?: string;
  duration?: string;
  isFree: boolean;
  order: number;
  status: 'active' | 'inactive';
  folderId?: string;
  views?: string;
  datetime?: string;
  platform?: string;
  contentType?: string;
  type?: string;
}

export interface Note {
  id: string;
  _id?: string;
  courseId?: string;
  title: string;
  description?: string;
  fileUrl?: string;
  fileSize?: string;
  isFree: boolean;
  order: number;
  status: 'active' | 'inactive';
  folderId?: string;
  datetime?: string;
}

export interface Test {
  id: string;
  _id?: string;
  courseId?: string;
  name: string;
  description?: string;
  duration?: number;
  totalMarks?: number;
  passingMarks?: number;
  numberOfQuestions?: number;
  openDate?: string;
  closeDate?: string;
  isFree: boolean;
  status: 'active' | 'inactive';
  questions?: Question[];
  marksPerQuestion?: number;
  negativeMarking?: number;
  order?: number;
  folderId?: string;
  title?: string;
  type?: string;
}

export interface VideoForm {
  title: string;
  description: string;
  youtubeUrl: string;
  videoUrl: string;
  duration: string;
  isFree: boolean;
  order: number;
  status: 'active' | 'inactive';
}

export interface NoteForm {
  title: string;
  description: string;
  fileUrl: string;
  fileSize: string;
  isFree: boolean;
  order: number;
  status: 'active' | 'inactive';
}

export interface TestForm {
  name: string;
  description: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  numberOfQuestions: number;
  marksPerQuestion: number;
  negativeMarking: number;
  openDate: string;
  closeDate: string;
  isFree: boolean;
  status: 'active' | 'inactive';
}

export type QuestionForm = Omit<Question, 'id' | '_id'>;

export interface YoutubeZoomForm {
  title: string;
  description: string;
  image: string;
  isFree: boolean;
  publishOn?: string;
  link: string;
  pdf1: string;
  pdf2: string;
  studyMaterial: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  enableChat: boolean;
  enableQA: boolean;
  notifyStudents: boolean;
  allowReplay: boolean;
  autoStart: boolean;
  visibility: 'public' | 'private';
  chatModeration: boolean;
  platform: string;
  streamStatus: string;
  endTime?: string;
  recordedLink?: string;
  scheduleDate?: string;
  scheduleTime?: string;
  scheduledAt?: string;
}


export interface WebinarForm {
  title: string;
  description: string;
  image: string;
  isFree: boolean;
  publishOn?: string;
  link: string;
  streamStatus: string;
  pdf1: string;
  pdf2: string;
  studyMaterial: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  enableChat: boolean;
  quizId: string;
  allowDownload: boolean;
  chatVisibility: string;
  videoRestrictions: boolean;
  order: string;
}

export interface Folder {
  id: string;
  _id?: string;
  name: string;
  title?: string;
  parentId?: string | null;
  courseId: string;
  order: number;
  type?: string;
  status?: string;
  description?: string;
  thumbnail?: string;
  sortingOrder?: string;
}

export type BulkContentItem = {
  id: string;
  rawId: string;
  title: string;
  type: string;
  status?: string;
  isFree?: boolean;
  parentId?: string | null;
  folderId?: string | null;
  raw?: any;
};

export interface CourseContentManagerProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  initialCourse?: any;
  onClearInitialCourse?: () => void;
  onBack?: () => void;
  setActiveView?: (view: any) => void;
  initialMainTab?: string;
}
