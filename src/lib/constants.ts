export const STAGES = [
  { id: 'primary', label: 'المرحلة الابتدائية' },
  { id: 'prep', label: 'المرحلة الإعدادية' },
  { id: 'secondary', label: 'المرحلة الثانوية' },
];

export const GRADES: Record<string, { id: string, label: string }[]> = {
  primary: [
    { id: 'p1', label: 'الصف الأول الابتدائي' },
    { id: 'p2', label: 'الصف الثاني الابتدائي' },
    { id: 'p3', label: 'الصف الثالث الابتدائي' },
    { id: 'p4', label: 'الصف الرابع الابتدائي' },
    { id: 'p5', label: 'الصف الخامس الابتدائي' },
    { id: 'p6', label: 'الصف السادس الابتدائي' },
  ],
  prep: [
    { id: 'm1', label: 'الصف الأول الإعدادي' },
    { id: 'm2', label: 'الصف الثاني الإعدادي' },
    { id: 'm3', label: 'الصف الثالث الإعدادي' },
  ],
  secondary: [
    { id: 's1', label: 'الصف الأول الثانوي' },
    { id: 's2', label: 'الصف الثاني الثانوي' },
    { id: 's3', label: 'الصف الثالث الثانوي' },
  ],
};

export const SUBJECTS = [
  'اللغة العربية',
  'اللغة الإنجليزية',
  'اللغة الفرنسية',
  'اللغة الألمانية',
  'الرياضيات',
  'الفيزياء',
  'الكيمياء',
  'الأحياء',
  'التاريخ',
  'الجغرافيا',
  'الفلسفة والمنطق',
  'علم النفس والاجتماع',
  'التربية الدينية',
  'الحاسب الآلي',
];

export const SEMESTERS = [
  { id: 'term1', label: 'الترم الأول' },
  { id: 'term2', label: 'الترم الثاني' },
];

export const ACADEMIC_YEARS = [
  '2023-2024',
  '2024-2025',
  '2025-2026',
];

export const getStageLabel = (stageId?: string) => {
  if (!stageId) return '';
  const stage = STAGES.find(s => s.id.toLowerCase() === stageId.toLowerCase());
  return stage?.label || stageId;
};

export const getGradeLabel = (gradeId?: string) => {
  if (!gradeId) return '';
  for (const stageGrades of Object.values(GRADES)) {
    const grade = stageGrades.find(g => g.id.toLowerCase() === gradeId.toLowerCase());
    if (grade) return grade.label;
  }
  return gradeId;
};

export const getFormattedStages = (stageIds?: string[]) => {
  if (!stageIds || stageIds.length === 0) return '';
  return stageIds
    .map(id => {
      const stage = STAGES.find(s => s.id.toLowerCase() === id.toLowerCase());
      return stage ? stage.label.replace('المرحلة ', '') : '';
    })
    .filter(Boolean)
    .join('، ');
};
