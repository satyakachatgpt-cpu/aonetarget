
export interface Course {
  id: string;
  title: string;
  subtitle?: string;
  instructor: string;
  instructorHindi?: string;
  price: number;
  mrp: number;
  discount: string;
  category: string;
  tag?: string;
  tagColor?: string;
  image: string;
  lessons?: number;
  duration?: string;
  startDate?: string;
  type: 'live' | 'recorded' | 'test-series';
}

export interface Instructor {
  name: string;
  role: string;
  experience: string;
  image: string;
}

export interface CurriculumItem {
  id: string;
  title: string;
  lessons: number;
  duration: string;
  locked?: boolean;
  completed?: number;
  total?: number;
}
