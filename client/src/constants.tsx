
import { Course, Instructor, CurriculumItem } from './types';

export const CATEGORY_ICONS: Record<string, string> = {
  'NEET': 'biotech',
  'IIT-JEE': 'calculate',
  'Nursing CET': 'health_and_safety',
  'General Studies': 'menu_book',
  'NDA': 'military_tech',
  'XI': 'school',
  'XII': 'workspace_premium',
};

export const CATEGORY_GRADIENTS: string[] = [
  'from-[#1A237E] to-[#303F9F]',
  'from-[#C62828] to-[#D32F2F]',
  'from-[#00695C] to-[#00897B]',
  'from-[#4A148C] to-[#7B1FA2]',
  'from-[#E65100] to-[#F57C00]',
  'from-[#1565C0] to-[#1E88E5]',
];
