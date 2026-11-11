// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type {
  Term,
  FeedbackStatus,
  FeedbackAnswerUpdate,
  FeedbackCommentUpdate,
  FeedbackStatusUpdate,
  Course,
  StudentFeedbackLecturerResult,
  StudentHomeWork,
  BlockMarkPeriod,
  MainClass,
  MarkCommon,
  KqrlResult,
  Grade,
  Club,
  Campus,
  ClubSubject,
  ClubSubjectType,
  DisciplineLevel,
  DisciplineRuleStudent,
  DisciplineRule,
  RewardBonusType,
  RewardFrequency,
  RewardStudent,
  Reward,
  EventStudent,
  Homework,
  StudentContext,
  NotificationType,
  NotificationsResult,
  MenuItem,
  User,
  Student,
  TimeSlot,
  ScheduleEntry,
  SurveyLink,
} from "../types/portal";
import type { AdapterFeatures, PortalAdapter } from "../sdk/adapter";
import { compactFspToolResult } from "./fsp-tool-compact";
import { pathSegment } from "./path-segment";

const BASE = "https://api.fpt.edu.vn/fsp/api";

const FEATURES: AdapterFeatures = {
  schedule: true,
  feedback: true,
  homeworks: true,
  marks: true,
  clubs: true,
  events: true,
  standing: true,
  notifications: true,
  session: true,
  supportsMutations: true,
};

function getToken(): string {
  const accessToken = localStorage.getItem("access_token");
  if (accessToken) return accessToken;

  const el = document.querySelector(
    'meta[name="Authorization"]',
  ) as HTMLMetaElement | null;
  if (el) return el.content.replace(/^Bearer\s+/i, "");

  const storage =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (storage) return storage;

  const match = document.cookie.match(/token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);

  throw new Error("No auth token found");
}

function getTokenPayload(): Record<string, unknown> | null {
  let token: string;
  try {
    token = getToken();
  } catch {
    return null;
  }

  try {
    const segment = token.split(".")[1];
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenExpired(payload: Record<string, unknown>): boolean {
  const exp = payload.exp;
  return typeof exp !== "number" || Date.now() / 1000 >= exp;
}

function gmFetch<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    };

    GM_xmlhttpRequest({
      method,
      url,
      headers,
      data: body != null ? JSON.stringify(body) : undefined,
      responseType: "json",
      onload(res) {
        if (res.status >= 200 && res.status < 300) {
          resolve(res.response as T);
        } else {
          reject(
            new Error(`HTTP ${res.status}: ${JSON.stringify(res.response)}`),
          );
        }
      },
      onerror(err) {
        reject(new Error(`Network error: ${err.statusText || "unknown"}`));
      },
      timeout: 15_000,
      ontimeout() {
        reject(new Error("Request timed out"));
      },
    });
  });
}

/** Soft preference: when both exist, favor compact data URLs over huge ones. */
const PREFERRED_DATA_URL_CHARS = 32_768;

function pickPreferredImageUrl(candidates: string[]): string | null {
  const https = candidates.find((u) => /^https:\/\//i.test(u));
  if (https) return https;
  const http = candidates.find((u) => /^http:\/\//i.test(u));
  if (http) return http;
  const dataUrls = candidates.filter((u) => /^data:image\//i.test(u));
  if (dataUrls.length === 0) return null;
  // Prefer a small data URL when available, but never drop a data-only avatar.
  return (
    dataUrls.find((u) => u.length <= PREFERRED_DATA_URL_CHARS) ?? dataUrls[0]
  );
}

function extractImageUrl(text: string): string | null {
  const trimmed = text.trim();
  if (/^(data:image\/|https?:\/\/)/.test(trimmed)) {
    return pickPreferredImageUrl([trimmed]);
  }

  try {
    const data = JSON.parse(trimmed) as unknown;
    const found = findImageUrl(data);
    if (found) return found;
  } catch {
    // not JSON
  }

  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 100) {
    const dataUrl = `data:image/png;base64,${trimmed}`;
    return pickPreferredImageUrl([dataUrl]);
  }
  return null;
}

function collectImageUrls(
  data: unknown,
  depth = 0,
  out: string[] = [],
): string[] {
  if (depth > 4) return out;
  if (typeof data === "string") {
    if (/^(data:image\/|https?:\/\/)/.test(data)) out.push(data);
    return out;
  }
  if (Array.isArray(data)) {
    for (const item of data) collectImageUrls(item, depth + 1, out);
    return out;
  }
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      collectImageUrls(value, depth + 1, out);
    }
  }
  return out;
}

function findImageUrl(data: unknown, depth = 0): string | null {
  return pickPreferredImageUrl(collectImageUrls(data, depth));
}

export class FspLiveAdapter implements PortalAdapter {
  readonly name = "live" as const;
  readonly hosts = ["fsp"];
  readonly features = FEATURES;

  private eduNextLiteCampusCode: string | null = null;

  waitForValidSession(timeoutMs: number): Promise<string | null> {
    const startedAt = Date.now();
    const immediate = getTokenPayload();
    if (immediate && !isTokenExpired(immediate)) {
      return Promise.resolve(immediate.userId as string);
    }

    return new Promise((resolve) => {
      let delay = 250;

      const tick = () => {
        const payload = getTokenPayload();
        if (payload && !isTokenExpired(payload)) {
          resolve(payload.userId as string);
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          resolve(null);
          return;
        }
        delay = Math.min(delay * 2, 2000);
        setTimeout(tick, delay);
      };

      setTimeout(tick, delay);
    });
  }

  async getStudentContext(): Promise<StudentContext> {
    const payload = getTokenPayload();
    if (!payload) throw new Error("No auth token found");

    const campusId = (payload.campusId || payload.campusID) as string;
    const campusCode = (payload.campusCode || "") as string;

    let termOrder = 1;
    let academicYear = "2026-2027";

    try {
      const term = await this.getDefaultTerm(campusId);
      termOrder = term.termOrder;
      academicYear = `${term.academicStartYear}-${term.academicEndYear}`;
    } catch {
      // Fallback to defaults if term fetch fails
    }

    return {
      studentId: (payload.userId || payload.sub) as string,
      userId: (payload.userId || payload.sub) as string,
      email: (payload.email || "") as string,
      username: (payload.username || "") as string,
      campusId,
      campusCode,
      role: (payload.role || "") as string,
      userType: (payload.userType || "") as string,
      termOrder,
      academicYear,
    };
  }

  async buildSsoUrl(url: string): Promise<string> {
    if (!this.eduNextLiteCampusCode) {
      const campusId = localStorage.getItem("CURRENT_CAMPUS_ID");
      const payload = getTokenPayload();
      const id = campusId || (payload?.campusId as string | undefined);
      if (!id) throw new Error("No campus id found");
      const campus = await this.getCampus(id);
      this.eduNextLiteCampusCode = campus.eduNextLiteCampusCode;
    }
    const token = new URLSearchParams({
      "X-FSC-TOKEN": getToken(),
      "X-CAMPUS-CODE": this.eduNextLiteCampusCode,
    });
    return `${url}?${token}`;
  }

  // --- Terms ---

  getDefaultTerm(campusId: string): Promise<Term> {
    return gmFetch<Term>(
      `${BASE}/education-management/terms/get/default/${pathSegment(campusId)}`,
    );
  }

  getTermsByCampus(campusId: string): Promise<Term[]> {
    return gmFetch<Term[]>(
      `${BASE}/education-management/terms/${pathSegment(campusId)}/by-campus`,
    );
  }

  // --- Feedback ---

  getFeedbackStatus(studentId: string): Promise<FeedbackStatus> {
    return gmFetch<FeedbackStatus>(
      `${BASE}/feedback-service/feedbacks/students/${pathSegment(studentId)}/has-feedback`,
    );
  }

  getUnfinishedFeedbacks(
    termId: string,
    studentId: string,
  ): Promise<StudentFeedbackLecturerResult[]> {
    return gmFetch(
      `${BASE}/feedback-service/feedbacks/students/${pathSegment(termId)}/${pathSegment(studentId)}/un-finished`,
    );
  }

  updateFeedbackAnswer(payload: FeedbackAnswerUpdate): Promise<unknown> {
    return gmFetch(
      `${BASE}/feedback-service/feedbacks/students/update-answer`,
      "POST",
      payload,
    );
  }

  updateFeedbackComment(
    slot: 1 | 2,
    payload: FeedbackCommentUpdate,
  ): Promise<unknown> {
    return gmFetch(
      `${BASE}/feedback-service/feedbacks/students/update-comment${slot}`,
      "POST",
      payload,
    );
  }

  updateFeedbackStatus(payload: FeedbackStatusUpdate): Promise<unknown> {
    return gmFetch(
      `${BASE}/feedback-service/feedbacks/students/update-status`,
      "POST",
      payload,
    );
  }

  // --- Homeworks ---

  getStudentHomeWorks(
    studentId: string,
    termId: string,
  ): Promise<StudentHomeWork[]> {
    return gmFetch(
      `${BASE}/homework-service/home-work-students/${pathSegment(studentId)}/${pathSegment(termId)}/home-work-student-by-term-id`,
    );
  }

  getUndoneHomework(studentId: string, termId: string): Promise<Homework[]> {
    return gmFetch<Homework[]>(
      `${BASE}/homework-service/home-work-students/${pathSegment(studentId)}/${pathSegment(termId)}/undone-home-work-student-by-term-id`,
    );
  }

  // --- Courses ---

  getCoursesByTerm(termId: string, studentId: string): Promise<Course[]> {
    return gmFetch<Course[]>(
      `${BASE}/education-management/courses/${pathSegment(termId)}/${pathSegment(studentId)}/by-term-student`,
    );
  }

  getAcademicYears(studentId: string): Promise<string[]> {
    return gmFetch<string[]>(
      `${BASE}/education-management/courses/academics/${pathSegment(studentId)}/by-student`,
    );
  }

  getMarkCommonByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<MarkCommon[]> {
    return gmFetch<MarkCommon[]>(
      `${BASE}/education-management/courses/details/${pathSegment(academicYear)}/${pathSegment(termOrder)}/${pathSegment(studentId)}/get-mark-common-by-student`,
    );
  }

  getBlockMarkPeriods(campusId: string): Promise<BlockMarkPeriod[]> {
    return gmFetch<BlockMarkPeriod[]>(
      `${BASE}/education-management/block-mark-periods/${pathSegment(campusId)}`,
    );
  }

  getKqrlByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<KqrlResult> {
    return gmFetch<KqrlResult>(
      `${BASE}/education-management/class-students/details/${pathSegment(academicYear)}/${pathSegment(termOrder)}/${pathSegment(studentId)}/get-kqrl-by-student`,
    );
  }

  getNlpcByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<unknown> {
    return gmFetch<unknown>(
      `${BASE}/education-management/attitude-quality-students/${pathSegment(academicYear)}/${pathSegment(termOrder)}/${pathSegment(studentId)}/get-nlpc-by-student`,
    );
  }

  getGradesByCampus(campusId: string): Promise<Grade[]> {
    return gmFetch<Grade[]>(
      `${BASE}/identity-management/grades/${pathSegment(campusId)}/by-campus`,
    );
  }

  getMainClassesByStudent(
    studentId: string,
    termId: string,
  ): Promise<MainClass[]> {
    return gmFetch<MainClass[]>(
      `${BASE}/education-management/classes/${pathSegment(studentId)}/${pathSegment(termId)}/main-classes-by-student`,
    );
  }

  // --- Clubs ---

  getClubsByTerm(termId: string, studentId: string): Promise<Club[]> {
    return gmFetch<Club[]>(
      `${BASE}/education-management/clubs/${pathSegment(termId)}/${pathSegment(studentId)}/by-term-student`,
    );
  }

  getClubSubjectsByIds(clubSubjectIds: string[]): Promise<ClubSubject[]> {
    return gmFetch<ClubSubject[]>(
      `${BASE}/education-management/club-subjects/entities/ids`,
      "POST",
      clubSubjectIds,
    );
  }

  getClubSubjectTypesByIds(
    clubSubjectIds: string[],
  ): Promise<ClubSubjectType[]> {
    return gmFetch<ClubSubjectType[]>(
      `${BASE}/education-management/club-subject-types/by-club-subject-ids`,
      "POST",
      clubSubjectIds,
    );
  }

  getClubStudentStatistics(
    studentIds: string[],
  ): Promise<Record<string, unknown>> {
    return gmFetch<Record<string, unknown>>(
      `${BASE}/education-management/clubs/statistic/cache-students`,
      "POST",
      studentIds,
    );
  }

  getDiscountAndPriceByStudent(
    termId: string,
    studentId: string,
  ): Promise<unknown> {
    return gmFetch<unknown>(
      `${BASE}/education-management/clubs/discount-club-student/${pathSegment(termId)}/${pathSegment(studentId)}/get-discount-and-price-by-student`,
    );
  }

  // --- Events ---

  getEventsByTerm(termId: string, studentId: string): Promise<EventStudent[]> {
    return gmFetch<EventStudent[]>(
      `${BASE}/student-service/events/${pathSegment(termId)}/${pathSegment(studentId)}/by-term-student`,
    );
  }

  getEventStatistics(eventIds: string[]): Promise<Record<string, unknown>> {
    return gmFetch<Record<string, unknown>>(
      `${BASE}/student-service/events/statistic/students`,
      "POST",
      eventIds,
    );
  }

  getEventImages(eventIds: string[]): Promise<Record<string, unknown>> {
    return gmFetch<Record<string, unknown>>(
      `${BASE}/student-service/events/images/by-id`,
      "POST",
      eventIds,
    );
  }

  toggleEventRegistration(
    eventId: string,
    studentId: string,
    eventData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return gmFetch<Record<string, unknown>>(
      `${BASE}/student-service/events/register/${pathSegment(eventId)}/${pathSegment(studentId)}`,
      "PUT",
      eventData,
    );
  }

  // --- Campuses ---

  getCampusesByIds(campusIds: string[]): Promise<Campus[]> {
    return gmFetch<Campus[]>(
      `${BASE}/identity-management/campuses/entities/ids`,
      "POST",
      campusIds,
    );
  }

  getCampus(campusId: string): Promise<Campus> {
    return gmFetch<Campus>(
      `${BASE}/identity-management/campuses/${pathSegment(campusId)}`,
    );
  }

  // --- Discipline ---

  getDisciplineLevels(campusId: string): Promise<DisciplineLevel[]> {
    return gmFetch<DisciplineLevel[]>(
      `${BASE}/student-service/discipline-levels/${pathSegment(campusId)}/by-campus`,
    );
  }

  getDisciplineRules(campusId: string): Promise<DisciplineRule[]> {
    return gmFetch<DisciplineRule[]>(
      `${BASE}/student-service/discipline-rules/${pathSegment(campusId)}/by-campus`,
    );
  }

  getDisciplineRulesByStudent(
    studentId: string,
  ): Promise<DisciplineRuleStudent[]> {
    return gmFetch<DisciplineRuleStudent[]>(
      `${BASE}/student-service/discipline-rule-students/${pathSegment(studentId)}/by-student`,
    );
  }

  // --- Rewards ---

  getRewardBonusTypes(campusId: string): Promise<RewardBonusType[]> {
    return gmFetch<RewardBonusType[]>(
      `${BASE}/student-service/reward-bonus-types/${pathSegment(campusId)}/by-campus`,
    );
  }

  getRewardFrequencies(campusId: string): Promise<RewardFrequency[]> {
    return gmFetch<RewardFrequency[]>(
      `${BASE}/student-service/reward-frequencies/${pathSegment(campusId)}/by-campus`,
    );
  }

  getRewardsByCampus(campusId: string): Promise<Reward[]> {
    return gmFetch<Reward[]>(
      `${BASE}/student-service/rewards/${pathSegment(campusId)}/by-campus`,
    );
  }

  getRewardsByStudent(studentId: string): Promise<RewardStudent[]> {
    return gmFetch<RewardStudent[]>(
      `${BASE}/student-service/reward-students/${pathSegment(studentId)}/by-student`,
    );
  }

  // --- Dormitory ---

  hasDormBedStudent(studentId: string): Promise<boolean> {
    return gmFetch<boolean>(
      `${BASE}/dormitory-management/dorm-bed-students/${pathSegment(studentId)}/has-student`,
    );
  }

  // --- Surveys ---

  getSurveyLink(): Promise<SurveyLink> {
    return gmFetch<SurveyLink>(
      `${BASE}/education-management/surveys/get-link-survey`,
    );
  }

  // --- Notifications ---

  getAllNotificationTypes(): Promise<NotificationType[]> {
    return gmFetch<NotificationType[]>(
      `${BASE}/extended-service/notification-types/entities/all`,
    );
  }

  getNotificationsByRecords(
    userId: string,
    records: number,
  ): Promise<NotificationsResult> {
    return gmFetch<NotificationsResult>(
      `${BASE}/extended-service/notifications/${pathSegment(userId)}/${pathSegment(records)}/by-records`,
    );
  }

  markNotificationAsRead(notificationId: string): Promise<unknown> {
    return gmFetch<unknown>(
      `${BASE}/extended-service/notifications/${pathSegment(notificationId)}/notification-as-read`,
      "GET",
    );
  }

  // --- Menu ---

  getMenuRoleCampuses(roleCode: string, campusId: string): Promise<MenuItem[]> {
    return gmFetch<MenuItem[]>(
      `${BASE}/identity-management/menu-role-campuses/${pathSegment(roleCode)}/${pathSegment(campusId)}/by-code`,
    );
  }

  // --- Users ---

  getUserById(userId: string): Promise<User> {
    return gmFetch<User>(
      `${BASE}/user-management/users/${pathSegment(userId)}/by-id`,
    );
  }

  getUserImage(userId: string): Promise<string | null> {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: `${BASE}/user-management/users/image/${pathSegment(userId)}/by-user-id`,
        headers: {
          Accept: "application/json, text/plain, */*",
          Authorization: `Bearer ${getToken()}`,
        },
        onload(res) {
          if (res.status !== 200 || !res.responseText) {
            resolve(null);
            return;
          }
          resolve(extractImageUrl(res.responseText));
        },
        onerror() {
          resolve(null);
        },
      });
    });
  }

  getStudentById(studentId: string): Promise<Student> {
    return gmFetch<Student>(
      `${BASE}/user-management/students/${pathSegment(studentId)}`,
    );
  }

  // --- Schedule ---

  getTimeSlotsByTerm(termIds: string[]): Promise<TimeSlot[]> {
    return gmFetch<TimeSlot[]>(
      `${BASE}/education-management/time-slots/by-term`,
      "POST",
      termIds,
    );
  }

  getCalendarByStudentAndDateRange(
    studentId: string,
    startDate: string,
    endDate: string,
  ): Promise<ScheduleEntry[]> {
    return gmFetch<ScheduleEntry[]>(
      `${BASE}/education-management/schedules/get-calendar-by-student-and-date-range`,
      "POST",
      { studentId, startDate, endDate },
    );
  }

  compactToolResult(toolName: string, result: unknown): unknown {
    return compactFspToolResult(toolName, result);
  }
}
