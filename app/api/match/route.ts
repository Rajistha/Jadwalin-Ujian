import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getStore, seedSampleData } from "@/lib/store";
import type { DetectedCourse, MatchedSchedule, SearchResult } from "@/lib/types";
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

    // Build Fuse index for fuzzy matching
    const fuse = new Fuse(courses, {
      keys: ["name_normalized", "code", "study_program"],
      threshold: 0.4,
      includeScore: true,
    });

    const matched: MatchedSchedule[] = [];
    const unmatched: DetectedCourse[] = [];

    for (const det of detected) {
      const courseProg = det.study_program || activeProgram;

      // 1. Exact match by code + class + study_program priority
      const exactByCodeAndClass = schedules.filter(
        (s) =>
          s.course?.code?.toLowerCase() === det.code?.toLowerCase() &&
          s.class_name?.toLowerCase() === det.class?.toLowerCase()
      );

      let chosenExact = exactByCodeAndClass.find(
        (s) => s.course?.study_program?.toLowerCase() === courseProg?.toLowerCase()
      ) || exactByCodeAndClass[0];

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

      // 2. Fuzzy match by name (same class only)
      const normalized = normalizeCourseName(det.name);
      const fuseResults = fuse.search(normalized);
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

      // No match found
      unmatched.push(det);
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
