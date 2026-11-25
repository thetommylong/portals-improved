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
} from "../../types/portal";
import type { AdapterFeatures, PortalAdapter } from "../../sdk/adapter";
import {
  copyFreshOidcBlobs,
  getOidcAccessToken,
  isJwtExpired,
  parseJwtPayload,
} from "./fsp-auth-token";
import { REAUTH_POPUP_NAME } from "../gate";
import { compactFspToolResult } from "./fsp-tool-compact";
import { pathSegment } from "../path-segment";

const BASE = "https://api.fpt.edu.vn/fsp/api";
const DEFAULT_REAUTH_TIMEOUT_MS = 120_000;

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

let authRequiredHandler: (() => void) | null = null;
let authRequiredNotified = false;

function fireAuthRequired(): void {
  if (authRequiredNotified) return;
  // Don't latch if the shell hasn't subscribed yet — otherwise the first
  // pre-UI 401 permanently swallows the sticky banner.
  if (!authRequiredHandler) return;
  authRequiredNotified = true;
  authRequiredHandler();
}

function clearAuthRequiredLatch(): void {
  authRequiredNotified = false;
}

function noteAuthFailureStatus(status: number): void {
  if (status === 401 || status === 403) fireAuthRequired();
}

function getToken(): string {
  const accessToken = localStorage.getItem("access_token");
  if (accessToken) return accessToken;

  const oidc = getOidcAccessToken();
  if (oidc) return oidc;

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
  return parseJwtPayload(token);
}

function isTokenExpired(payload: Record<string, unknown>): boolean {
  return isJwtExpired(payload);
}

function reauthPopupUrl(): string {
  const { protocol, hostname } = window.location;
  if (hostname === "fsp.fpt.edu.vn" || hostname.endsWith(".fsp.fpt.edu.vn")) {
    return `${protocol}//${hostname}/`;
  }
  return "https://fsp.fpt.edu.vn/";
}

/** Page-context fetch — same origin policy as the portal SPA (no GM CORS bypass). */
async function portalFetch<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown,
): Promise<T> {
  let token: string;
  try {
    token = getToken();
  } catch (err) {
    fireAuthRequired();
    throw err instanceof Error ? err : new Error("No auth token found");
  }

  const payload = parseJwtPayload(token);
  if (!payload || isJwtExpired(payload)) {
    fireAuthRequired();
    throw new Error("Auth token expired");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown = text;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      noteAuthFailureStatus(res.status);
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(parsed)}`);
    }
    return parsed as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out", { cause: err });
    }
    if (err instanceof Error && err.message.startsWith("HTTP ")) throw err;
    throw new Error(
      `Network error: ${err instanceof Error ? err.message : "unknown"}`,
      { cause: err },
    );
  } finally {
    clearTimeout(timer);
  }
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

  onAuthRequired(handler: (() => void) | null): void {
    authRequiredHandler = handler;
  }

  clearAuthRequired(): void {
    clearAuthRequiredLatch();
  }

  reauthenticate(
    timeoutMs: number = DEFAULT_REAUTH_TIMEOUT_MS,
  ): Promise<boolean> {
    const popup = window.open(
      reauthPopupUrl(),
      REAUTH_POPUP_NAME,
      "popup=yes,width=480,height=720",
    );
    if (!popup) return Promise.resolve(false);

    const startedAt = Date.now();
    return new Promise((resolve) => {
      const finish = (ok: boolean) => {
        try {
          if (!popup.closed) popup.close();
        } catch {
          // popup may already be gone
        }
        if (ok) clearAuthRequiredLatch();
        resolve(ok);
      };

      const tick = () => {
        try {
          if (popup.closed) {
            finish(false);
            return;
          }
          if (copyFreshOidcBlobs(popup.sessionStorage, sessionStorage)) {
            finish(true);
            return;
          }
        } catch {
          // Cross-origin during IdP redirect — keep polling.
        }
        if (Date.now() - startedAt > timeoutMs) {
          finish(false);
          return;
        }
        setTimeout(tick, 500);
      };

      setTimeout(tick, 500);
    });
  }

  async getStudentContext(): Promise<StudentContext> {
    const payload = getTokenPayload();
    if (!payload) {
      fireAuthRequired();
      throw new Error("No auth token found");
    }
    if (isTokenExpired(payload)) {
      fireAuthRequired();
      throw new Error("Auth token expired");
    }

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
    return portalFetch<Term>(
      `${BASE}/education-management/terms/get/default/${pathSegment(campusId)}`,
    );
  }

  getTermsByCampus(campusId: string): Promise<Term[]> {
    return portalFetch<Term[]>(
      `${BASE}/education-management/terms/${pathSegment(campusId)}/by-campus`,
    );
  }

  // --- Feedback ---

  getFeedbackStatus(studentId: string): Promise<FeedbackStatus> {
    return portalFetch<FeedbackStatus>(
      `${BASE}/feedback-service/feedbacks/students/${pathSegment(studentId)}/has-feedback`,
    );
  }

  getUnfinishedFeedbacks(
    termId: string,
    studentId: string,
  ): Promise<StudentFeedbackLecturerResult[]> {
    return portalFetch(
      `${BASE}/feedback-service/feedbacks/students/${pathSegment(termId)}/${pathSegment(studentId)}/un-finished`,
    );
  }

  updateFeedbackAnswer(payload: FeedbackAnswerUpdate): Promise<unknown> {
    return portalFetch(
      `${BASE}/feedback-service/feedbacks/students/update-answer`,
      "POST",
      payload,
    );
  }

  updateFeedbackComment(
    slot: 1 | 2,
    payload: FeedbackCommentUpdate,
  ): Promise<unknown> {
    return portalFetch(
      `${BASE}/feedback-service/feedbacks/students/update-comment${slot}`,
      "POST",
      payload,
    );
  }

  updateFeedbackStatus(payload: FeedbackStatusUpdate): Promise<unknown> {
    return portalFetch(
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
    return portalFetch(
      `${BASE}/homework-service/home-work-students/${pathSegment(studentId)}/${pathSegment(termId)}/home-work-student-by-term-id`,
    );
  }

  getUndoneHomework(studentId: string, termId: string): Promise<Homework[]> {
    return portalFetch<Homework[]>(
      `${BASE}/homework-service/home-work-students/${pathSegment(studentId)}/${pathSegment(termId)}/undone-home-work-student-by-term-id`,
    );
  }

  // --- Courses ---

  getCoursesByTerm(termId: string, studentId: string): Promise<Course[]> {
    return portalFetch<Course[]>(
      `${BASE}/education-management/courses/${pathSegment(termId)}/${pathSegment(studentId)}/by-term-student`,
    );
  }

  getAcademicYears(studentId: string): Promise<string[]> {
    return portalFetch<string[]>(
      `${BASE}/education-management/courses/academics/${pathSegment(studentId)}/by-student`,
    );
  }

  getMarkCommonByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<MarkCommon[]> {
    return portalFetch<MarkCommon[]>(
      `${BASE}/education-management/courses/details/${pathSegment(academicYear)}/${pathSegment(termOrder)}/${pathSegment(studentId)}/get-mark-common-by-student`,
    );
  }

  getBlockMarkPeriods(campusId: string): Promise<BlockMarkPeriod[]> {
    return portalFetch<BlockMarkPeriod[]>(
      `${BASE}/education-management/block-mark-periods/${pathSegment(campusId)}`,
    );
  }

  getKqrlByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<KqrlResult> {
    return portalFetch<KqrlResult>(
      `${BASE}/education-management/class-students/details/${pathSegment(academicYear)}/${pathSegment(termOrder)}/${pathSegment(studentId)}/get-kqrl-by-student`,
    );
  }

  getNlpcByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<unknown> {
    return portalFetch<unknown>(
      `${BASE}/education-management/attitude-quality-students/${pathSegment(academicYear)}/${pathSegment(termOrder)}/${pathSegment(studentId)}/get-nlpc-by-student`,
    );
  }

  getGradesByCampus(campusId: string): Promise<Grade[]> {
    return portalFetch<Grade[]>(
      `${BASE}/identity-management/grades/${pathSegment(campusId)}/by-campus`,
    );
  }

  getMainClassesByStudent(
    studentId: string,
    termId: string,
  ): Promise<MainClass[]> {
    return portalFetch<MainClass[]>(
      `${BASE}/education-management/classes/${pathSegment(studentId)}/${pathSegment(termId)}/main-classes-by-student`,
    );
  }

  // --- Clubs ---

  getClubsByTerm(termId: string, studentId: string): Promise<Club[]> {
    return portalFetch<Club[]>(
      `${BASE}/education-management/clubs/${pathSegment(termId)}/${pathSegment(studentId)}/by-term-student`,
    );
  }

  getClubSubjectsByIds(clubSubjectIds: string[]): Promise<ClubSubject[]> {
    return portalFetch<ClubSubject[]>(
      `${BASE}/education-management/club-subjects/entities/ids`,
      "POST",
      clubSubjectIds,
    );
  }

  getClubSubjectTypesByIds(
    clubSubjectIds: string[],
  ): Promise<ClubSubjectType[]> {
    return portalFetch<ClubSubjectType[]>(
      `${BASE}/education-management/club-subject-types/by-club-subject-ids`,
      "POST",
      clubSubjectIds,
    );
  }

  getClubStudentStatistics(
    studentIds: string[],
  ): Promise<Record<string, unknown>> {
    return portalFetch<Record<string, unknown>>(
      `${BASE}/education-management/clubs/statistic/cache-students`,
      "POST",
      studentIds,
    );
  }

  getDiscountAndPriceByStudent(
    termId: string,
    studentId: string,
  ): Promise<unknown> {
    return portalFetch<unknown>(
      `${BASE}/education-management/clubs/discount-club-student/${pathSegment(termId)}/${pathSegment(studentId)}/get-discount-and-price-by-student`,
    );
  }

  // --- Events ---

  getEventsByTerm(termId: string, studentId: string): Promise<EventStudent[]> {
    return portalFetch<EventStudent[]>(
      `${BASE}/student-service/events/${pathSegment(termId)}/${pathSegment(studentId)}/by-term-student`,
    );
  }

  getEventStatistics(eventIds: string[]): Promise<Record<string, unknown>> {
    return portalFetch<Record<string, unknown>>(
      `${BASE}/student-service/events/statistic/students`,
      "POST",
      eventIds,
    );
  }

  getEventImages(eventIds: string[]): Promise<Record<string, unknown>> {
    return portalFetch<Record<string, unknown>>(
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
    return portalFetch<Record<string, unknown>>(
      `${BASE}/student-service/events/register/${pathSegment(eventId)}/${pathSegment(studentId)}`,
      "PUT",
      eventData,
    );
  }

  // --- Campuses ---

  getCampusesByIds(campusIds: string[]): Promise<Campus[]> {
    return portalFetch<Campus[]>(
      `${BASE}/identity-management/campuses/entities/ids`,
      "POST",
      campusIds,
    );
  }

  getCampus(campusId: string): Promise<Campus> {
    return portalFetch<Campus>(
      `${BASE}/identity-management/campuses/${pathSegment(campusId)}`,
    );
  }

  // --- Discipline ---

  getDisciplineLevels(campusId: string): Promise<DisciplineLevel[]> {
    return portalFetch<DisciplineLevel[]>(
      `${BASE}/student-service/discipline-levels/${pathSegment(campusId)}/by-campus`,
    );
  }

  getDisciplineRules(campusId: string): Promise<DisciplineRule[]> {
    return portalFetch<DisciplineRule[]>(
      `${BASE}/student-service/discipline-rules/${pathSegment(campusId)}/by-campus`,
    );
  }

  getDisciplineRulesByStudent(
    studentId: string,
  ): Promise<DisciplineRuleStudent[]> {
    return portalFetch<DisciplineRuleStudent[]>(
      `${BASE}/student-service/discipline-rule-students/${pathSegment(studentId)}/by-student`,
    );
  }

  // --- Rewards ---

  getRewardBonusTypes(campusId: string): Promise<RewardBonusType[]> {
    return portalFetch<RewardBonusType[]>(
      `${BASE}/student-service/reward-bonus-types/${pathSegment(campusId)}/by-campus`,
    );
  }

  getRewardFrequencies(campusId: string): Promise<RewardFrequency[]> {
    return portalFetch<RewardFrequency[]>(
      `${BASE}/student-service/reward-frequencies/${pathSegment(campusId)}/by-campus`,
    );
  }

  getRewardsByCampus(campusId: string): Promise<Reward[]> {
    return portalFetch<Reward[]>(
      `${BASE}/student-service/rewards/${pathSegment(campusId)}/by-campus`,
    );
  }

  getRewardsByStudent(studentId: string): Promise<RewardStudent[]> {
    return portalFetch<RewardStudent[]>(
      `${BASE}/student-service/reward-students/${pathSegment(studentId)}/by-student`,
    );
  }

  // --- Dormitory ---

  hasDormBedStudent(studentId: string): Promise<boolean> {
    return portalFetch<boolean>(
      `${BASE}/dormitory-management/dorm-bed-students/${pathSegment(studentId)}/has-student`,
    );
  }

  // --- Surveys ---

  getSurveyLink(): Promise<SurveyLink> {
    return portalFetch<SurveyLink>(
      `${BASE}/education-management/surveys/get-link-survey`,
    );
  }

  // --- Notifications ---

  getAllNotificationTypes(): Promise<NotificationType[]> {
    return portalFetch<NotificationType[]>(
      `${BASE}/extended-service/notification-types/entities/all`,
    );
  }

  getNotificationsByRecords(
    userId: string,
    records: number,
  ): Promise<NotificationsResult> {
    return portalFetch<NotificationsResult>(
      `${BASE}/extended-service/notifications/${pathSegment(userId)}/${pathSegment(records)}/by-records`,
    );
  }

  markNotificationAsRead(notificationId: string): Promise<unknown> {
    return portalFetch<unknown>(
      `${BASE}/extended-service/notifications/${pathSegment(notificationId)}/notification-as-read`,
      "GET",
    );
  }

  // --- Menu ---

  getMenuRoleCampuses(roleCode: string, campusId: string): Promise<MenuItem[]> {
    return portalFetch<MenuItem[]>(
      `${BASE}/identity-management/menu-role-campuses/${pathSegment(roleCode)}/${pathSegment(campusId)}/by-code`,
    );
  }

  // --- Users ---

  getUserById(userId: string): Promise<User> {
    return portalFetch<User>(
      `${BASE}/user-management/users/${pathSegment(userId)}/by-id`,
    );
  }

  getUserImage(userId: string): Promise<string | null> {
    return new Promise((resolve) => {
      let token: string;
      try {
        token = getToken();
      } catch {
        fireAuthRequired();
        resolve(null);
        return;
      }
      const payload = parseJwtPayload(token);
      if (!payload || isJwtExpired(payload)) {
        fireAuthRequired();
        resolve(null);
        return;
      }

      void fetch(
        `${BASE}/user-management/users/image/${pathSegment(userId)}/by-user-id`,
        {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            Authorization: `Bearer ${token}`,
          },
        },
      )
        .then(async (res) => {
          noteAuthFailureStatus(res.status);
          if (res.status !== 200) {
            resolve(null);
            return;
          }
          const text = await res.text();
          if (!text) {
            resolve(null);
            return;
          }
          resolve(extractImageUrl(text));
        })
        .catch(() => resolve(null));
    });
  }

  getStudentById(studentId: string): Promise<Student> {
    return portalFetch<Student>(
      `${BASE}/user-management/students/${pathSegment(studentId)}`,
    );
  }

  // --- Schedule ---

  getTimeSlotsByTerm(termIds: string[]): Promise<TimeSlot[]> {
    return portalFetch<TimeSlot[]>(
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
    return portalFetch<ScheduleEntry[]>(
      `${BASE}/education-management/schedules/get-calendar-by-student-and-date-range`,
      "POST",
      { studentId, startDate, endDate },
    );
  }

  compactToolResult(toolName: string, result: unknown): unknown {
    return compactFspToolResult(toolName, result);
  }
}
