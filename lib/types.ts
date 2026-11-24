// Shared TypeScript types for the application

export interface Course {
  id: string;
  code: string;
  name: string;
  name_normalized: string;
  credits?: number;
  study_program?: string;
}

export interface ExamPeriod {
  id: string;
  name: string;
  academic_year: string;
  semester: "Ganjil" | "Genap";
  start_date?: string;
  end_date?: string;
  is_active: boolean;
}

export interface ExamSchedule {
  id: string;
  period_id: string;
  course_id: string;
  batch_id?: string;
  class_name: string;
  exam_date: string; // ISO date string
  day_name: string;
  start_time: string; // HH:MM
  end_time?: string;
  room?: string;
  lecturer?: string;
  exam_type?: string;
  notes?: string;
  // Joined fields
  course?: Course;
  period?: ExamPeriod;
}

export interface DetectedCourse {
  code: string;
  name: string;
  class: string;
  study_program?: string;
  confidence: number;
  // Filled by /api/match for unmatched courses: classes that exist in the schedule
  // for this course in the student's prodi, so the user can pick the right one.
  available_classes?: string[];
  // Position of this course in the request, so the client can update the right entry.
  index?: number;
  // SKS as read from the KRS (null/undefined when the SKS column wasn't readable).
  credits?: number | null;
}

// A problem noticed while reading the KRS screenshot, shown to the user as a warning.
export interface KrsIssue {
  column: "NAMA MK" | "KODE MK" | "PROGRAM STUDI" | "KELAS" | "SKS" | "STATUS" | "BARIS";
  message: string;
  // true = a whole column is unreadable: show only this warning, not the schedule.
  blocking: boolean;
}

export interface MatchedSchedule extends ExamSchedule {
  detected_code: string;
  detected_name: string;
  detected_class: string;
  detected_study_program?: string;
  detected_credits?: number | null;
  // Position of this course in the request, and the classes that exist in the schedule for it,
  // so the user can correct a misread class with one click.
  index?: number;
  available_classes?: string[];
  match_method: "exact" | "fuzzy" | "manual" | "none";
  match_score: number;
  conflict?: boolean;
}

export interface SearchResult {
  detected_study_program?: string;
  matched: MatchedSchedule[];
  unmatched: DetectedCourse[];
  period?: ExamPeriod;
  stats: {
    detected: number;
    matched: number;
    unmatched: number;
    duration_ms: number;
  };
}

export type SortKey = "exam_date" | "day_name" | "start_time" | "course_name";
export type SortDir = "asc" | "desc";
export type AppState =
  | "idle"
  | "image_selected"
  | "loading"
  | "success"
  | "partial"
  | "error"
  | "no_data";
