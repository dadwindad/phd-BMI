export interface User {
  id: string;
  email: string;
  name: string;
  height?: number;
  age?: number;
  gender?: string;
  activity_level?: string;
}

export interface BMILog {
  id: number;
  user_id: string;
  weight: number;
  bmi: number;
  date: string;
}

export type BMICategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese';

export const getBMICategory = (bmi: number): BMICategory => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

export const getBMICategoryColor = (category: BMICategory): string => {
  switch (category) {
    case 'Underweight': return '#3b82f6'; // blue-500
    case 'Normal': return '#10b981'; // emerald-500
    case 'Overweight': return '#f59e0b'; // amber-500
    case 'Obese': return '#ef4444'; // red-500
  }
};
