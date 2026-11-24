const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../lib/raw_jadwal.csv');
const content = fs.readFileSync(csvPath, 'utf8');

const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
const header = lines[0].split(',');

const MONTH_MAP = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', Mei: '05', May: '05',
  Jun: '06', Jul: '07', Agu: '08', Aug: '08', Sep: '09', Okt: '10', Oct: '10',
  Nov: '11', Des: '12', Dec: '12'
};

const DAY_MAP = {
  '2026-11-30': 'Senin',
  '2026-12-01': 'Selasa',
  '2026-12-02': 'Rabu',
  '2026-12-03': 'Kamis',
  '2026-12-04': 'Jumat',
  '2026-12-07': 'Senin',
  '2026-12-08': 'Selasa',
  '2026-12-09': 'Rabu',
  '2026-12-10': 'Kamis',
  '2026-12-11': 'Jumat',
};

// Known course codes for FILKOM
const KNOWN_CODES = {
  'kriptografi': 'CIT60045',
  'tata kelola dan kebijakan keamanan siber': 'CIT60047',
  'information retrieval': 'CIT60048',
  'teknologi basis data non relational': 'CIT60049',
  'pengembangan aplikasi web': 'CIT61006',
  'teknologi keamanan siber': 'CIT61024',
  'internet of things': 'CIT61026',
  'metodologi penelitian dan penulisan ilmiah': 'COM60051',
  'administrasi basis data': 'CSI61001',
  'pengantar sistem informasi': 'CSI61002',
  'rekayasa sistem informasi': 'CSI61003',
  'pemrograman dasar': 'CIF61001',
  'basis data': 'CIF61002',
  'jaringan komputer': 'CIF61003',
  'rekayasa perangkat lunak': 'CIF61004',
  'algoritma dan struktur data': 'CIF61007',
  'matematika diskret': 'CIF61008',
  'kalkulus': 'CIF61009',
  'etika profesi': 'COM60001',
  'bahasa inggris': 'UNG60001',
  'bahasa indonesia': 'UNG60002',
  'pancasila': 'UNG60003',
  'kewarganegaraan': 'UNG60004',
  'agama islam': 'UNG60005',
  'agama katolik': 'UNG60006',
  'agama protestan': 'UNG60007',
  'agama hindu': 'UNG60008',
  'agama budha': 'UNG60009',
};

function normalizeName(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

const coursesMap = {};
const schedules = [];

let idCounter = 1;

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  if (parts.length < 7) continue;

  const [dateStr, timeStr, prodiRaw, courseName, className, countStr, room] = parts.map(p => p.trim());

  // Parse Date
  // e.g. "30 Nov 2026"
  const dParts = dateStr.split(' ');
  const day = dParts[0].padStart(2, '0');
  const month = MONTH_MAP[dParts[1]] || '11';
  const year = dParts[2] || '2026';
  const isoDate = `${year}-${month}-${day}`;
  const dayName = DAY_MAP[isoDate] || 'Senin';

  // Parse Time
  // e.g. "07:30-09:30"
  const [startTime, endTime] = timeStr.split('-');

  // Parse Prodi
  // e.g. "S1 Teknologi Informasi" -> "Teknologi Informasi"
  const prodi = prodiRaw.replace(/^S1\s+/, '');

  const normCourse = normalizeName(courseName);
  const courseCode = KNOWN_CODES[normCourse] || ('MK' + String(10000 + idCounter));

  const courseKey = `${normCourse}_${prodi}`;
  if (!coursesMap[courseKey]) {
    coursesMap[courseKey] = {
      id: `c_${idCounter}`,
      code: courseCode,
      name: courseName,
      name_normalized: normCourse,
      study_program: prodi,
    };
    idCounter++;
  }

  const course = coursesMap[courseKey];

  schedules.push({
    id: `sched_${i}`,
    period_id: 'period-1',
    course_id: course.id,
    class_name: className,
    exam_date: isoDate,
    day_name: dayName,
    start_time: startTime,
    end_time: endTime,
    room: room,
    course: course,
  });
}

const coursesList = Object.values(coursesMap);

console.log(`Parsed ${coursesList.length} courses and ${schedules.length} schedules.`);

const outputCode = `// Generated real schedules from Looker Studio
import type { Course, ExamSchedule, ExamPeriod } from "./types";

export const REAL_PERIOD: ExamPeriod = {
  id: "period-1",
  name: "UAS FILKOM Ganjil 2026/2027",
  academic_year: "2026/2027",
  semester: "Ganjil",
  start_date: "2026-11-30",
  end_date: "2026-12-11",
  is_active: true,
};

export const REAL_COURSES: Course[] = ${JSON.stringify(coursesList, null, 2)};

export const REAL_SCHEDULES: ExamSchedule[] = ${JSON.stringify(schedules, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../lib/realSchedules.ts'), outputCode, 'utf8');
console.log('Successfully written lib/realSchedules.ts');
