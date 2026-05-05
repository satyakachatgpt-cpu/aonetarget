
const COMMON_GRADIENTS = [
  { value: 'from-blue-600 to-indigo-700', label: 'Blue to Indigo' },
  { value: 'from-orange-500 to-red-600', label: 'Orange to Red' },
  { value: 'from-teal-500 to-emerald-600', label: 'Teal to Emerald' },
  { value: 'from-purple-500 to-violet-600', label: 'Purple to Violet' },
  { value: 'from-indigo-800 to-blue-900', label: 'Dark blue' },
  { value: 'from-cyan-500 to-blue-600', label: 'Cyan to Blue' },
  { value: 'from-amber-500 to-orange-600', label: 'Amber to Orange' },
  { value: 'from-green-500 to-teal-600', label: 'Green to Teal' },
  { value: 'from-sky-500 to-cyan-600', label: 'Sky Blue' },
  { value: 'from-violet-600 to-indigo-700', label: 'Violet Indigo' },
  { value: 'from-purple-500 to-pink-600', label: 'Purple Pink' },
  { value: 'from-rose-500 to-pink-600', label: 'Rose Pink' },
  { value: 'from-red-500 to-rose-700', label: 'Red Rose' },
  { value: 'from-amber-400 to-orange-600', label: 'Amber Orange' },
  { value: 'from-yellow-400 to-amber-600', label: 'Yellow Amber' },
  { value: 'from-lime-500 to-emerald-600', label: 'Lime Emerald' },
  { value: 'from-slate-700 to-slate-900', label: 'Slate Dark' },
  { value: 'from-zinc-800 to-black', label: 'Midnight Black' },
  { value: 'from-indigo-900 to-purple-900', label: 'Deep Space' },
  // Legacy & Subject Specific
  { value: 'from-[#303F9F] to-[#1A237E]', label: 'Legacy Indigo' },
  { value: 'from-[#D32F2F] to-[#B71C1C]', label: 'Legacy Red' },
  { value: 'from-[#E65100] to-[#BF360C]', label: 'Legacy Orange' },
  { value: 'from-[#2E7D32] to-[#1B5E20]', label: 'Legacy Green' },
  { value: 'from-indigo-600 to-violet-700', label: 'Indigo to Violet' },
  { value: 'from-purple-600 to-fuchsia-700', label: 'Purple to Fuchsia' },
  { value: 'from-indigo-500 to-blue-600', label: 'Subject Blue' },
  { value: 'from-slate-600 to-slate-700', label: 'Subject Slate' },
];

export const CATEGORY_VISUALS = {
  iconOptions: [
    'biotech', 'groups', 'medical_services', 'menu_book', 'school', 'science',
    'calculate', 'public', 'language', 'bolt', 'video_library', 'cast_for_education',
    'edit_note', 'help_center', 'medical_information', 'shield_person', 'vaccines',
    'local_pharmacy', 'book_2', 'translate', 'workspace_premium', 'psychology',
    'architecture', 'sports_esports', 'palette', 'music_note'
  ],
  gradientOptions: COMMON_GRADIENTS
};

export const SUBCATEGORY_VISUALS = {
  iconOptions: [
    'folder', 'play_circle', 'cast_for_education', 'bolt', 'quiz', 'school',
    'menu_book', 'article', 'description', 'assignment', 'auto_stories',
    'history_edu', 'draw', 'emoji_events', 'rocket_launch', 'psychology',
    'science', 'biotech', 'microbiology', 'monitoring'
  ],
  gradientOptions: COMMON_GRADIENTS
};

export const SUBJECT_VISUALS = {
  iconOptions: [
    'school', 'science', 'calculate', 'language', 'public', 'history_edu',
    'biotech', 'menu_book', 'architecture', 'palette', 'music_note', 'psychology',
    'medicine', 'health_and_safety', 'fitness_center', 'terminal', 'code',
    'database', 'functions', 'pie_chart'
  ],
  gradientOptions: COMMON_GRADIENTS
};
