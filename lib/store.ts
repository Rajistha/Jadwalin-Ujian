// Data store populated with REAL Looker Studio exam schedules
import type { ExamSchedule, Course, ExamPeriod } from "./types";
import { REAL_PERIOD, REAL_COURSES, REAL_SCHEDULES } from "./realSchedules";

let _period: ExamPeriod = REAL_PERIOD;
let _courses: Course[] = REAL_COURSES;
let _schedules: ExamSchedule[] = REAL_SCHEDULES;
let _initialized = true;

export function getStore() {
  return {
    period: _period,
    courses: _courses,
    schedules: _schedules,
    initialized: _initialized,
  };
}

export function setStore(data: {
  period: ExamPeriod;
  courses: Course[];
  schedules: ExamSchedule[];
}) {
  _period = data.period;
  _courses = data.courses;
  _schedules = data.schedules;
  _initialized = true;
}

export function seedSampleData() {
  // Already initialized with real schedules
}
