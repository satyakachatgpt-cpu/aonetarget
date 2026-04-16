export interface Student {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  college?: string;
  class?: string;
  target?: string;
  enrolledCourses?: string[];
  [key: string]: any;
}

export interface Instructor {
  id?: string;
  _id?: string;
  name: string;
  role?: string;
  experience?: string;
  image?: string;
  instructorHindi?: string;
  [key: string]: any;
}

export interface CurriculumItem {
  id: string;
  title: string;
  lessons?: number;
  duration?: string;
  locked?: boolean;
  completed?: number;
  total?: number;
}

export interface Course {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  instructor?: string | Instructor;
  instructorHindi?: string;
  thumbnail?: string;
  imageUrl?: string;
  image?: string; // Legacy alias
  price?: number;
  mrp?: number;
  discount?: string;
  category?: string;
  tag?: string;
  tagColor?: string;
  enrollmentCount?: number;
  notesCount?: number;
  lessons?: number;
  duration?: string;
  startDate?: string;
  demoVideo?: string;
  type?: 'live' | 'recorded' | 'test-series';
  progress?: number;
  settings?: { 
    showTabs?: boolean;
    markNewBatch?: boolean;
    sortingOrder?: number | string;
    isFeatured?: boolean;
    [key: string]: any;
  };
  content?: any; // Made 'any' temporarily to resolve deep property access issues during stabilization
  [key: string]: any;
}

export interface Video {
  id?: string;
  _id?: string;
  title?: string;
  url?: string;
  thumbnail?: string;
  duration?: string;
  isFree?: boolean;
  contentType?: string;
  type?: string;
  provider?: 'youtube' | 'hls' | 'direct';
  topicId?: string;
  topicName?: string;
  videoUrl?: string; // Legacy alias
  youtubeUrl?: string;
  order?: number;
  completed?: boolean;
  publishOn?: string;
  scheduledTime?: string;
  startTime?: string;
  [key: string]: any;
}

export interface VideoProgress {
  videoId?: string;
  courseId?: string;
  timestamp: number;
  duration: number;
  title?: string;
  thumbnail?: string;
  updated?: number;
  lastUpdated?: number;
}

export interface Progress {
  completedVideos: string[];
  completedTests: string[];
  completedNotes: string[];
}
