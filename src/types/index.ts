export interface MoodleCredentials {
  email: string;
  password: string;
  classUrl: string;
}

export interface Course {
  id: number;
  title: string;
  code: string;
  url: string;
  taskIds: number[];
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: Date | null;
  submissionStatus: 'submitted' | 'not_submitted' | 'late';
  maxGrade: number;
  currentGrade: number | null;
  url: string;
}

export interface Grade {
  itemName: string;
  grade: string;
  maxGrade: string;
  percentage: number | null;
  feedback: string | null;
  dateModified: Date | null;
}

export interface MoodleFile {
  name: string;
  url: string;
  size: string;
  type: string;
  downloadUrl: string;
}

export interface ZybookIntegration {
  title: string;
  url: string;
  dueDate: Date | null;
  completionStatus: string;
  progress: number | null;
}

export interface ScrapedData {
  assignments: Assignment[];
  grades: Grade[];
  files: MoodleFile[];
  zybookIntegrations: ZybookIntegration[];
}

export interface ScraperOptions {
  headless?: boolean;
  timeout?: number;
  waitForElements?: boolean;
} 