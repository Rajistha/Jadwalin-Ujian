import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getStore, seedSampleData } from "@/lib/store";
import type { Course, DetectedCourse, MatchedSchedule, SearchResult } from "@/lib/types";
import { normalizeCourseName } from "@/lib/utils";
import Fuse from "fuse.js";

// Seed data on cold start
seedSampleData();

export async function POST(req: NextRequest) {
  try {
    const {
      courses: detected,
      study_program: requestedProgram,
    }: {
      courses: DetectedCourse[];
      study_program?: string;
    } = await req.json();

    if (!detected || !Array.isArray(detected)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const start = Date.now();
    const { schedules, courses, period } = getStore();

    if (!period || schedules.length === 0) {
      return NextResponse.json({
        detected_study_program: requestedProgram || "Teknologi Informasi",
        matched: [],
        unmatched: detected,
        period: period || undefined,
        stats: {
          detected: detected.length,
          matched: 0,
          unmatched: detected.length,
          duration_ms: Date.now() - start,
        },
      });
    }

    // Determine target study program (from request or detected from courses)
    const activeProgram =
      requestedProgram ||
      detected.find((d) => d.study_program)?.study_program ||
      "Teknologi Informasi";

    // Fuzzy index per study program: a student must only be matched to schedules of their own prodi.
    const sameProg = (a?: string | null, b?: string | null) =>
      !!a && !!b && a.toLowerCase() === b.toLowerCase();
    const fuseByProgram = new Map<string, Fuse<Course>>();
    const getFuse = (prog: string) => {
      const key = prog.toLowerCase();
      let f = fuseByProgram.get(key);
      if (!f) {
        f = new Fuse(
          courses.filter((c) => sameProg(c.study_program, prog)),
          { keys: ["name_normalized"], threshold: 0.4, includeScore: true }
        );
        fuseByProgram.set(key, f);
      }
      return f;
    };

    const matched: MatchedSchedule[] = [];
    const unmatched: DetectedCourse[] = [];

    // Known codes, used to fix single-character OCR misreads (e.g. COM80052 -> COM60052).
    const knownCodes = new Set(
      schedules.map((s) => s.course?.code?.toUpperCase()).filter((c): c is string => !!c)
    );
    const fixCode = (code?: string) => {
      const c = code?.toUpperCase();
      if (!c || knownCodes.has(c)) return code;
      const near = [...knownCodes].filter(
        (k) => k.length === c.length && [...k].filter((ch, i) => ch !== c[i]).length === 1
      );
      return near.length === 1 ? near[0] : code; // only fix when unambiguous
    };

    for (const [idx, raw] of detected.entries()) {
      const det = { ...raw, code: fixCode(raw.code) ?? raw.code };
      const courseProg = det.study_program || activeProgram;
      const normalized = normalizeCourseName(det.name);
      const fuseResults = getFuse(courseProg).search(normalized);

      // A code is only trusted if the KRS name agrees with that course's name. Otherwise a misread
      // or a real-but-unknown code one digit away (CSD60704 vs CSD60703) would silently land on
      // another course's exam.
      const nameAgrees = (courseId: string) =>
        fuseResults.some((r) => r.item.id === courseId && r.score !== undefined && r.score < 0.4);

      // 1. Exact match by code + class + study program (no cross-prodi fallback)
      const chosenExact = schedules.find(
        (s) =>
          s.course?.code?.toLowerCase() === det.code?.toLowerCase() &&
          s.class_name?.toLowerCase() === det.class?.toLowerCase() &&
          sameProg(s.course?.study_program, courseProg) &&
          nameAgrees(s.course_id)
      );

      if (chosenExact) {
        matched.push({
          ...chosenExact,
          detected_code: det.code,
          detected_name: det.name,
          detected_class: det.class,
          detected_study_program: courseProg,
          match_method: "exact",
          match_score: 1,
          conflict: false,
        });
        continue;
      }

      // No code-only fallback: if the class doesn't match, we don't guess another class.

      // 2. Fuzzy match by name (same prodi, same class only)
      if (fuseResults.length > 0 && fuseResults[0].score !== undefined && fuseResults[0].score < 0.4) {
        const matchedCourse = fuseResults[0].item;
        const schedForCourse = det.class
          ? schedules.find(
              (s) =>
                s.course_id === matchedCourse.id &&
                s.class_name?.toLowerCase() === det.class?.toLowerCase()
            )
          : undefined;

        if (schedForCourse) {
          matched.push({
            ...schedForCourse,
            detected_code: det.code,
            detected_name: det.name,
            detected_class: det.class,
            detected_study_program: courseProg,
            match_method: "fuzzy",
            match_score: 1 - (fuseResults[0].score || 0),
            conflict: false,
          });
          continue;
        }
      }

      // No match found: tell the user which classes exist for this course in their prodi
      // (never pick one for them).
      const byCode = schedules.filter(
        (s) =>
          !!det.code &&
          s.course?.code?.toLowerCase() === det.code.toLowerCase() &&
          sameProg(s.course?.study_program, courseProg) &&
          nameAgrees(s.course_id)
      );
      const fuzzyCourse = fuseResults[0]?.score !== undefined && fuseResults[0].score < 0.4 ? fuseResults[0].item : undefined;
      const candidates = byCode.length > 0 ? byCode : fuzzyCourse ? schedules.filter((s) => s.course_id === fuzzyCourse.id) : [];
      const available_classes = [...new Set(candidates.map((s) => s.class_name))].sort();
      // Show the corrected code only when it was confirmed by the name; otherwise keep what the KRS said.
      unmatched.push({ ...det, code: byCode.length > 0 ? det.code : raw.code, available_classes, index: idx });
    }

    // Detect conflicts
    const withConflicts = matched.map((s, i) => {
      const conflict = matched.some((other, j) => {
        if (i === j) return false;
        if (s.exam_date !== other.exam_date) return false;
        const sStart = s.start_time;
        const sEnd = s.end_time || "23:59";
        const oStart = other.start_time;
        const oEnd = other.end_time || "23:59";
        return sStart < oEnd && oStart < sEnd;
      });
      return { ...s, conflict };
    });

    // Sort by date then time
    withConflicts.sort((a, b) => {
      if (a.exam_date !== b.exam_date) return a.exam_date.localeCompare(b.exam_date);
      return a.start_time.localeCompare(b.start_time);
    });

    const result: SearchResult = {
      detected_study_program: activeProgram,
      matched: withConflicts,
      unmatched,
      period,
      stats: {
        detected: detected.length,
        matched: matched.length,
        unmatched: unmatched.length,
        duration_ms: Date.now() - start,
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("/api/match error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
