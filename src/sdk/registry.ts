// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { ToolMeta, ParamMeta, JsonSchema, ToolDefinition } from "./types";
import type { FeatureFlag } from "./adapter";
import { runtime } from "../adapters/runtime.svelte";

const CATEGORY_CAPABILITY: Record<string, FeatureFlag> = {
  session: "session",
  terms: "schedule",
  feedback: "feedback",
  homework: "homeworks",
  courses: "marks",
  marks: "marks",
  classes: "marks",
  clubs: "clubs",
  events: "events",
  campus: "schedule",
  sso: "schedule",
  finance: "marks",
  discipline: "standing",
  rewards: "standing",
  dormitory: "standing",
  surveys: "feedback",
  notifications: "notifications",
  menu: "session",
  users: "session",
  students: "session",
  schedule: "schedule",
};

const TOOLS: ToolMeta[] = [
  {
    name: "getStudentContext",
    description:
      "Get current student session context including studentId, campusId, termOrder, academicYear",
    category: "session",
    read: true,
    params: [],
    returnType: "StudentContext",
  },
  {
    name: "getDefaultTerm",
    description: "Fetch the currently active default term for a campus",
    category: "terms",
    read: true,
    params: [
      {
        name: "campusId",
        type: "string",
        required: true,
        description: "campus ID",
      },
    ],
    returnType: "Term",
  },
  {
    name: "getTermsByCampus",
    description: "Fetch all academic terms available for a campus",
    category: "terms",
    read: true,
    params: [
      {
        name: "campusId",
        type: "string",
        required: true,
        description: "campus ID",
      },
    ],
    returnType: "Term[]",
  },
  {
    name: "getFeedbackStatus",
    description: "Check whether a student still owes course feedback",
    category: "feedback",
    read: true,
    params: [
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "FeedbackStatus",
  },
  {
    name: "getUnfinishedFeedbacks",
    description:
      "Fetch a student's unfinished course-feedback records for a term",
    category: "feedback",
    read: true,
    params: [
      {
        name: "termId",
        type: "string",
        required: true,
        description: "term ID (UUID)",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "StudentFeedbackLecturerResult[]",
  },
  {
    name: "updateFeedbackAnswer",
    description: "Submit an updated answer for a feedback question",
    category: "feedback",
    read: false,
    params: [
      {
        name: "feedbackLecturerId",
        type: "string",
        required: true,
        description: "feedback lecturer record ID",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
      {
        name: "feedbackQuestionId",
        type: "string",
        required: true,
        description: "question ID",
      },
      {
        name: "feedbackAnswerId",
        type: "string",
        required: true,
        description: "selected answer ID",
      },
    ],
    returnType: "unknown",
  },
  {
    name: "updateFeedbackComment",
    description: "Submit a free-text comment for a feedback slot (1 or 2)",
    category: "feedback",
    read: false,
    params: [
      {
        name: "slot",
        type: "number",
        required: true,
        description: "feedback slot (1 or 2)",
      },
      {
        name: "feedbackLecturerId",
        type: "string",
        required: true,
        description: "feedback lecturer record ID",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
      {
        name: "comment",
        type: "string",
        required: true,
        description: "comment text",
      },
    ],
    returnType: "unknown",
  },
  {
    name: "updateFeedbackStatus",
    description: "Mark a feedback record as completed",
    category: "feedback",
    read: false,
    params: [
      {
        name: "feedbackLecturerId",
        type: "string",
        required: true,
        description: "feedback lecturer record ID",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
      {
        name: "status",
        type: "boolean",
        required: true,
        description: "true to mark completed",
      },
    ],
    returnType: "unknown",
  },
  {
    name: "getStudentHomeWorks",
    description: "Fetch a student's homework assignments for a term",
    category: "homework",
    read: true,
    params: [
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
      {
        name: "termId",
        type: "string",
        required: true,
        description: "term ID (UUID)",
      },
    ],
    returnType: "StudentHomeWork[]",
  },
  {
    name: "getCoursesByTerm",
    description: "Fetch courses a student is enrolled in for a term",
    category: "courses",
    read: true,
    params: [
      {
        name: "termId",
        type: "string",
        required: true,
        description: "term ID (UUID)",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "Course[]",
  },
  {
    name: "getAcademicYears",
    description: "Fetch academic years recorded for a student",
    category: "courses",
    read: true,
    params: [
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "string[]",
  },
  {
    name: "getMarkCommonByStudent",
    description: "Fetch common assessment marks for an academic year and term",
    category: "marks",
    read: true,
    params: [
      {
        name: "academicYear",
        type: "string",
        required: true,
        description: "academic year (e.g. 2025-2026)",
      },
      {
        name: "termOrder",
        type: "number",
        required: true,
        description: "term order number",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "MarkCommon[]",
  },
  {
    name: "getBlockMarkPeriods",
    description: "Fetch block mark periods configured for a campus",
    category: "marks",
    read: true,
    params: [
      {
        name: "campusId",
        type: "string",
        required: true,
        description: "campus ID",
      },
    ],
    returnType: "BlockMarkPeriod[]",
  },
  {
    name: "getMainClassesByStudent",
    description: "Fetch main classes a student belongs to within a term",
    category: "classes",
    read: true,
    params: [
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
      {
        name: "termId",
        type: "string",
        required: true,
        description: "term ID (UUID)",
      },
    ],
    returnType: "MainClass[]",
  },
  {
    name: "getKqrlByStudent",
    description: "Fetch KQRL learning-outcome results for a student",
    category: "marks",
    read: true,
    params: [
      {
        name: "academicYear",
        type: "string",
        required: true,
        description: "academic year (e.g. 2025-2026)",
      },
      {
        name: "termOrder",
        type: "number",
        required: true,
        description: "term order number",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "KqrlResult",
  },
  {
    name: "getNlpcByStudent",
    description: "Fetch NLPC attitude-quality data for a student",
    category: "marks",
    read: true,
    params: [
      {
        name: "academicYear",
        type: "string",
        required: true,
        description: "academic year (e.g. 2025-2026)",
      },
      {
        name: "termOrder",
        type: "number",
        required: true,
        description: "term order number",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "void",
  },
  {
    name: "getGradesByCampus",
    description: "Fetch grade levels defined for a campus",
    category: "grades",
    read: true,
    params: [
      {
        name: "campusId",
        type: "string",
        required: true,
        description: "campus ID",
      },
    ],
    returnType: "Grade[]",
  },
  {
    name: "getClubsByTerm",
    description: "Fetch club enrollments for a student in a term",
    category: "clubs",
    read: true,
    params: [
      {
        name: "termId",
        type: "string",
        required: true,
        description: "term ID (UUID)",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "Club[]",
  },
  {
    name: "getUndoneHomework",
    description: "Fetch outstanding homework items for a student in a term",
    category: "homework",
    read: true,
    params: [
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
      {
        name: "termId",
        type: "string",
        required: true,
        description: "term ID (UUID)",
      },
    ],
    returnType: "Homework[]",
  },
  {
    name: "getEventsByTerm",
    description: "Fetch school events scheduled for a student in a term",
    category: "events",
    read: true,
    params: [
      {
        name: "termId",
        type: "string",
        required: true,
        description: "term ID (UUID)",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "EventStudent[]",
  },
  {
    name: "getCampusesByIds",
    description: "Batch-fetch campus records by a list of campus IDs",
    category: "campus",
    read: true,
    params: [
      {
        name: "campusIds",
        type: "string[]",
        required: true,
        description: "array of campus IDs",
      },
    ],
    returnType: "Campus[]",
  },
  {
    name: "getCampus",
    description: "Fetch a single campus record by its ID",
    category: "campus",
    read: true,
    params: [
      {
        name: "campusId",
        type: "string",
        required: true,
        description: "campus ID",
      },
    ],
    returnType: "Campus",
  },
  {
    name: "buildSsoUrl",
    description:
      "Build a single sign-on launch URL for a learning management system link",
    category: "sso",
    read: true,
    params: [
      {
        name: "url",
        type: "string",
        required: true,
        description: "LMS resource URL to build an SSO login for",
      },
    ],
    returnType: "string",
  },
  {
    name: "getClubSubjectsByIds",
    description: "Batch-fetch club subject records by subject IDs",
    category: "clubs",
    read: true,
    params: [
      {
        name: "clubSubjectIds",
        type: "string[]",
        required: true,
        description: "array of club subject IDs",
      },
    ],
    returnType: "ClubSubject[]",
  },
  {
    name: "getClubSubjectTypesByIds",
    description: "Batch-fetch club subject-type records by subject IDs",
    category: "clubs",
    read: true,
    params: [
      {
        name: "clubSubjectIds",
        type: "string[]",
        required: true,
        description: "array of club subject IDs",
      },
    ],
    returnType: "ClubSubjectType[]",
  },
  {
    name: "getClubStudentStatistics",
    description: "Batch-fetch per-student club participation statistics",
    category: "clubs",
    read: true,
    params: [
      {
        name: "studentIds",
        type: "string[]",
        required: true,
        description: "array of student IDs",
      },
    ],
    returnType: "Record<string, unknown>",
  },
  {
    name: "getDiscountAndPriceByStudent",
    description: "Fetch tuition discount and pricing info for a student",
    category: "finance",
    read: true,
    params: [
      {
        name: "termId",
        type: "string",
        required: true,
        description: "term ID (UUID)",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "unknown",
  },
  {
    name: "getEventStatistics",
    description: "Batch-fetch registration statistics for events",
    category: "events",
    read: true,
    params: [
      {
        name: "eventIds",
        type: "string[]",
        required: true,
        description: "array of event IDs",
      },
    ],
    returnType: "Record<string, unknown>",
  },
  {
    name: "getEventImages",
    description: "Batch-fetch image attachments for events",
    category: "events",
    read: true,
    params: [
      {
        name: "eventIds",
        type: "string[]",
        required: true,
        description: "array of event IDs",
      },
    ],
    returnType: "Record<string, unknown>",
  },
  {
    name: "toggleEventRegistration",
    description: "Register or unregister a student for an event",
    category: "events",
    read: false,
    params: [
      {
        name: "eventId",
        type: "string",
        required: true,
        description: "event ID",
      },
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
      {
        name: "eventData",
        type: "Record<string, unknown>",
        required: true,
        description: "current event state object",
      },
    ],
    returnType: "Record<string, unknown>",
  },
  {
    name: "getDisciplineLevels",
    description: "Fetch discipline levels configured for a campus",
    category: "discipline",
    read: true,
    params: [
      {
        name: "campusId",
        type: "string",
        required: true,
        description: "campus ID",
      },
    ],
    returnType: "DisciplineLevel[]",
  },
  {
    name: "getDisciplineRules",
    description: "Fetch discipline rules configured for a campus",
    category: "discipline",
    read: true,
    params: [
      {
        name: "campusId",
        type: "string",
        required: true,
        description: "campus ID",
      },
    ],
    returnType: "DisciplineRule[]",
  },
  {
    name: "getDisciplineRulesByStudent",
    description: "Fetch discipline-rule violations recorded against a student",
    category: "discipline",
    read: true,
    params: [
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "DisciplineRuleStudent[]",
  },
  {
    name: "getRewardBonusTypes",
    description: "Fetch reward bonus types configured for a campus",
    category: "rewards",
    read: true,
    params: [
      {
        name: "campusId",
        type: "string",
        required: true,
        description: "campus ID",
      },
    ],
    returnType: "RewardBonusType[]",
  },
  {
    name: "getRewardFrequencies",
    description: "Fetch reward frequency options configured for a campus",
    category: "rewards",
    read: true,
    params: [
      {
        name: "campusId",
        type: "string",
        required: true,
        description: "campus ID",
      },
    ],
    returnType: "RewardFrequency[]",
  },
  {
    name: "getRewardsByCampus",
    description: "Fetch the reward catalog available at a campus",
    category: "rewards",
    read: true,
    params: [
      {
        name: "campusId",
        type: "string",
        required: true,
        description: "campus ID",
      },
    ],
    returnType: "Reward[]",
  },
  {
    name: "getRewardsByStudent",
    description: "Fetch rewards earned by a specific student",
    category: "rewards",
    read: true,
    params: [
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "RewardStudent[]",
  },
  {
    name: "hasDormBedStudent",
    description: "Check whether a student holds a dormitory bed assignment",
    category: "dormitory",
    read: true,
    params: [
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "boolean",
  },
  {
    name: "getSurveyLink",
    description: "Fetch the active student-survey link",
    category: "surveys",
    read: true,
    params: [],
    returnType: "SurveyLink",
  },
  {
    name: "getAllNotificationTypes",
    description: "Fetch every notification type known to the backend",
    category: "notifications",
    read: true,
    params: [],
    returnType: "NotificationType[]",
  },
  {
    name: "getNotificationsByRecords",
    description: "Fetch notifications for a user filtered by record count",
    category: "notifications",
    read: true,
    params: [
      {
        name: "userId",
        type: "string",
        required: true,
        description: "user ID",
      },
      {
        name: "records",
        type: "number",
        required: true,
        description: "number of records to fetch",
      },
    ],
    returnType: "NotificationsResult",
  },
  {
    name: "markNotificationAsRead",
    description: "Flag a single notification as read",
    category: "notifications",
    read: false,
    params: [
      {
        name: "notificationId",
        type: "string",
        required: true,
        description: "notification ID",
      },
    ],
    returnType: "unknown",
  },
  {
    name: "getMenuRoleCampuses",
    description: "Fetch portal menu configuration for a role and campus",
    category: "menu",
    read: true,
    params: [
      {
        name: "roleCode",
        type: "string",
        required: true,
        description: "role code",
      },
      {
        name: "campusId",
        type: "string",
        required: true,
        description: "campus ID",
      },
    ],
    returnType: "MenuItem[]",
  },
  {
    name: "getUserById",
    description: "Fetch a user profile by user ID",
    category: "users",
    read: true,
    params: [
      {
        name: "userId",
        type: "string",
        required: true,
        description: "user ID",
      },
    ],
    returnType: "User",
  },
  {
    name: "getUserImage",
    description: "Fetch a user's avatar image URL",
    category: "users",
    read: true,
    params: [
      {
        name: "userId",
        type: "string",
        required: true,
        description: "user ID",
      },
    ],
    returnType: "string | null",
  },
  {
    name: "getStudentById",
    description: "Fetch a student record by student ID",
    category: "students",
    read: true,
    params: [
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
    ],
    returnType: "Student",
  },
  {
    name: "getTimeSlotsByTerm",
    description: "Fetch timetable time-slot definitions for one or more terms",
    category: "schedule",
    read: true,
    params: [
      {
        name: "termIds",
        type: "string[]",
        required: true,
        description: "array of term IDs",
      },
    ],
    returnType: "TimeSlot[]",
  },
  {
    name: "getCalendarByStudentAndDateRange",
    description:
      "Fetch a student's calendar entries between start and end dates",
    category: "schedule",
    read: true,
    params: [
      {
        name: "studentId",
        type: "string",
        required: true,
        description: "student ID",
      },
      {
        name: "startDate",
        type: "string",
        required: true,
        description: "start date (YYYY-MM-DD)",
      },
      {
        name: "endDate",
        type: "string",
        required: true,
        description: "end date (YYYY-MM-DD)",
      },
    ],
    returnType: "ScheduleEntry[]",
  },
];

function buildParamSchema(params: ParamMeta[]): JsonSchema {
  const properties: Record<string, import("./types").JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const p of params) {
    if (p.type === "string[]") {
      properties[p.name] = {
        type: "array",
        description: p.description,
        items: { type: "string" },
      };
    } else if (p.type === "Record<string, unknown>") {
      properties[p.name] = { type: "object", description: p.description };
    } else {
      properties[p.name] = { type: p.type, description: p.description };
    }
    if (p.required) required.push(p.name);
  }

  return {
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

export function getFullSchema(name: string): JsonSchema | null {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return null;
  return buildParamSchema(tool.params);
}

export function getToolMeta(name: string): ToolMeta | null {
  return TOOLS.find((t) => t.name === name) ?? null;
}

export function isToolSupported(name: string): boolean {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return false;
  if (!tool.read && !runtime.adapter.features.supportsMutations) return false;
  const capability = CATEGORY_CAPABILITY[tool.category];
  if (!capability) return false;
  return runtime.adapter.features[capability];
}

export function getAvailableToolNames(): string[] {
  return TOOLS.filter((tool) => isToolSupported(tool.name)).map(
    (tool) => tool.name,
  );
}

export function isReadOnly(name: string): boolean {
  return TOOLS.find((t) => t.name === name)?.read ?? true;
}

export function searchFunctions(query: string): ToolMeta[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);

  const scored = TOOLS.filter((tool) => isToolSupported(tool.name)).map(
    (tool) => {
      let score = 0;
      const nameLower = tool.name.toLowerCase();
      const descLower = tool.description.toLowerCase();

      if (nameLower.includes(q)) score += 5;
      if (tool.category === q) score += 4;

      for (const word of words) {
        if (nameLower.includes(word)) score += 3;
        if (tool.category === word) score += 2;
        if (descLower.includes(word)) score += 1;
      }

      return { tool, score };
    },
  );

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.tool);
}

export function buildCompactIndex(): string {
  const lines = TOOLS.filter((tool) => isToolSupported(tool.name)).map(
    (t) =>
      `${t.name} — ${t.category}${t.read ? "" : " [MUTATION]"} — ${t.description} [${t.params.map((p) => `${p.name}: ${p.type}${p.required ? "" : "?"}`).join(", ")}]`,
  );
  return lines.join("\n");
}

export function getToolDefinitions(names: string[]): ToolDefinition[] {
  return names
    .filter((name) => isToolSupported(name))
    .map((name) => {
      const meta = TOOLS.find((t) => t.name === name);
      if (!meta) return null;
      return {
        type: "function" as const,
        function: {
          name: meta.name,
          description: meta.description,
          parameters: buildParamSchema(meta.params),
        },
      };
    })
    .filter((d): d is ToolDefinition => d !== null);
}

export function callApiFunction(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "getStudentContext":
      return runtime.adapter.getStudentContext();
    case "getDefaultTerm":
      return runtime.adapter.getDefaultTerm(args.campusId as string);
    case "getTermsByCampus":
      return runtime.adapter.getTermsByCampus(args.campusId as string);
    case "getFeedbackStatus":
      return runtime.adapter.getFeedbackStatus(args.studentId as string);
    case "getUnfinishedFeedbacks":
      return runtime.adapter.getUnfinishedFeedbacks(
        args.termId as string,
        args.studentId as string,
      );
    case "updateFeedbackAnswer":
      return runtime.adapter.updateFeedbackAnswer({
        feedbackLecturerId: args.feedbackLecturerId as string,
        studentId: args.studentId as string,
        feedbackQuestionId: args.feedbackQuestionId as string,
        feedbackAnswerId: args.feedbackAnswerId as string,
      });
    case "updateFeedbackComment":
      return runtime.adapter.updateFeedbackComment(args.slot as 1 | 2, {
        feedbackLecturerId: args.feedbackLecturerId as string,
        studentId: args.studentId as string,
        comment: args.comment as string,
      });
    case "updateFeedbackStatus":
      return runtime.adapter.updateFeedbackStatus({
        feedbackLecturerId: args.feedbackLecturerId as string,
        studentId: args.studentId as string,
        status: args.status as boolean,
      });
    case "getStudentHomeWorks":
      return runtime.adapter.getStudentHomeWorks(
        args.studentId as string,
        args.termId as string,
      );
    case "getCoursesByTerm":
      return runtime.adapter.getCoursesByTerm(
        args.termId as string,
        args.studentId as string,
      );
    case "getAcademicYears":
      return runtime.adapter.getAcademicYears(args.studentId as string);
    case "getMarkCommonByStudent":
      return runtime.adapter.getMarkCommonByStudent(
        args.academicYear as string,
        args.termOrder as number,
        args.studentId as string,
      );
    case "getBlockMarkPeriods":
      return runtime.adapter.getBlockMarkPeriods(args.campusId as string);
    case "getMainClassesByStudent":
      return runtime.adapter.getMainClassesByStudent(
        args.studentId as string,
        args.termId as string,
      );
    case "getKqrlByStudent":
      return runtime.adapter.getKqrlByStudent(
        args.academicYear as string,
        args.termOrder as number,
        args.studentId as string,
      );
    case "getNlpcByStudent":
      return runtime.adapter.getNlpcByStudent(
        args.academicYear as string,
        args.termOrder as number,
        args.studentId as string,
      );
    case "getGradesByCampus":
      return runtime.adapter.getGradesByCampus(args.campusId as string);
    case "getClubsByTerm":
      return runtime.adapter.getClubsByTerm(
        args.termId as string,
        args.studentId as string,
      );
    case "getUndoneHomework":
      return runtime.adapter.getUndoneHomework(
        args.studentId as string,
        args.termId as string,
      );
    case "getEventsByTerm":
      return runtime.adapter.getEventsByTerm(
        args.termId as string,
        args.studentId as string,
      );
    case "getCampusesByIds":
      return runtime.adapter.getCampusesByIds(args.campusIds as string[]);
    case "getCampus":
      return runtime.adapter.getCampus(args.campusId as string);
    case "buildSsoUrl":
      return runtime.adapter.buildSsoUrl(args.url as string);
    case "getClubSubjectsByIds":
      return runtime.adapter.getClubSubjectsByIds(
        args.clubSubjectIds as string[],
      );
    case "getClubSubjectTypesByIds":
      return runtime.adapter.getClubSubjectTypesByIds(
        args.clubSubjectIds as string[],
      );
    case "getClubStudentStatistics":
      return runtime.adapter.getClubStudentStatistics(
        args.studentIds as string[],
      );
    case "getDiscountAndPriceByStudent":
      return runtime.adapter.getDiscountAndPriceByStudent(
        args.termId as string,
        args.studentId as string,
      );
    case "getEventStatistics":
      return runtime.adapter.getEventStatistics(args.eventIds as string[]);
    case "getEventImages":
      return runtime.adapter.getEventImages(args.eventIds as string[]);
    case "toggleEventRegistration":
      return runtime.adapter.toggleEventRegistration(
        args.eventId as string,
        args.studentId as string,
        args.eventData as Record<string, unknown>,
      );
    case "getDisciplineLevels":
      return runtime.adapter.getDisciplineLevels(args.campusId as string);
    case "getDisciplineRules":
      return runtime.adapter.getDisciplineRules(args.campusId as string);
    case "getDisciplineRulesByStudent":
      return runtime.adapter.getDisciplineRulesByStudent(
        args.studentId as string,
      );
    case "getRewardBonusTypes":
      return runtime.adapter.getRewardBonusTypes(args.campusId as string);
    case "getRewardFrequencies":
      return runtime.adapter.getRewardFrequencies(args.campusId as string);
    case "getRewardsByCampus":
      return runtime.adapter.getRewardsByCampus(args.campusId as string);
    case "getRewardsByStudent":
      return runtime.adapter.getRewardsByStudent(args.studentId as string);
    case "hasDormBedStudent":
      return runtime.adapter.hasDormBedStudent(args.studentId as string);
    case "getSurveyLink":
      return runtime.adapter.getSurveyLink();
    case "getAllNotificationTypes":
      return runtime.adapter.getAllNotificationTypes();
    case "getNotificationsByRecords":
      return runtime.adapter.getNotificationsByRecords(
        args.userId as string,
        args.records as number,
      );
    case "markNotificationAsRead":
      return runtime.adapter.markNotificationAsRead(
        args.notificationId as string,
      );
    case "getMenuRoleCampuses":
      return runtime.adapter.getMenuRoleCampuses(
        args.roleCode as string,
        args.campusId as string,
      );
    case "getUserById":
      return runtime.adapter.getUserById(args.userId as string);
    case "getUserImage":
      return runtime.adapter.getUserImage(args.userId as string);
    case "getStudentById":
      return runtime.adapter.getStudentById(args.studentId as string);
    case "getTimeSlotsByTerm":
      return runtime.adapter.getTimeSlotsByTerm(args.termIds as string[]);
    case "getCalendarByStudentAndDateRange":
      return runtime.adapter.getCalendarByStudentAndDateRange(
        args.studentId as string,
        args.startDate as string,
        args.endDate as string,
      );
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}
