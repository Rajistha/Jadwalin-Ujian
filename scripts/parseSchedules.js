const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../lib/raw_jadwal.csv');
const content = fs.readFileSync(csvPath, 'utf8');

const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

// Split a CSV line, honouring "quoted, fields".
function splitCsv(line) {
  const out = [];
  let cur = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const MONTH_MAP = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', Mei: '05', May: '05',
  Jun: '06', Jul: '07', Agu: '08', Aug: '08', Sep: '09', Okt: '10', Oct: '10',
  Nov: '11', Des: '12', Dec: '12'
};

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Course codes verified from real KRS screenshots (SIAM UB). The schedule CSV has no codes,
// so everything else gets a placeholder code and is matched by name + class + prodi.
const KNOWN_CODES = {
  'kriptografi': 'CIT60045',
  'tata kelola dan kebijakan keamanan siber': 'CIT60047',
  'information retrieval': 'CIT60048',
  'teknologi basis data non relational': 'CIT60049',
  'pengembangan aplikasi web': 'CIT61006',
  'teknologi keamanan siber': 'CIT61024',
  'internet of things': 'CIT61026',
  'metodologi penelitian dan penulisan ilmiah': 'COM60051',
  'teknologi berbasis cloud': 'CIT60036',
  'teknologi blockchain dan platform keuangan dijital': 'CIT60042',
  'forensik dijital': 'CIT60055',
  'etika profesi': 'COM60052',
  'tata kelola teknologi informasi': 'CSD60703',
};

function normalizeName(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

const coursesMap = {};
const schedules = [];

let idCounter = 1;
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const parts = splitCsv(lines[i]);
  if (parts.length < 7) continue;

  const [dateStr, timeStr, prodiRaw, courseName, className, countStr, roomRaw] = parts.map(p => p.trim());

  // Only ISO dates (YYYY-MM-DD) are reliable; skip "#N/A" and ambiguous "Sabtu,4 Desember" rows.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) { skipped++; continue; }
  const isoDate = dateStr;
  const dayName = DAY_NAMES[new Date(isoDate + 'T00:00:00Z').getUTCDay()];
  const room = roomRaw === 'null' ? '-' : roomRaw;

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

console.log(`Parsed ${coursesList.length} courses and ${schedules.length} schedules (skipped ${skipped} without ISO date).`);

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
