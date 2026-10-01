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

function gmFetchRaw(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
): Promise<{ status: number; response: unknown }> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method,
      url,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      responseType: "json",
      onload(res) {
        resolve({ status: res.status, response: res.response });
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

function extractImageUrl(text: string): string | null {
  const trimmed = text.trim();
  if (/^(data:image\/|https?:\/\/)/.test(trimmed)) return trimmed;

  try {
    const data = JSON.parse(trimmed) as unknown;
    const found = findImageUrl(data);
    if (found) return found;
  } catch {
    // not JSON
  }

  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 100) {
    return `data:image/png;base64,${trimmed}`;
  }
  return null;
}

function findImageUrl(data: unknown, depth = 0): string | null {
  if (depth > 4) return null;
  if (typeof data === "string") {
    return /^(data:image\/|https?:\/\/)/.test(data) ? data : null;
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findImageUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      const found = findImageUrl(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

export class FspLiveAdapter implements PortalAdapter {
  readonly name = "live" as const;
  readonly hosts = ["fsp"];
  readonly features = FEATURES;

  private eduNextLiteCampusCode: string | null = null;

  waitForValidSession(timeoutMs: number): Promise<string | null> {
    const startedAt = Date.now();

    return new Promise((resolve) => {
      const timer = setInterval(() => {
        const payload = getTokenPayload();
        if (payload && !isTokenExpired(payload)) {
          clearInterval(timer);
          resolve(payload.userId as string);
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          clearInterval(timer);
          resolve(null);
        }
      }, 250);
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
      `${BASE}/education-management/terms/get/default/${campusId}`,
    );
  }

  getTermsByCampus(campusId: string): Promise<Term[]> {
    return gmFetch<Term[]>(
      `${BASE}/education-management/terms/${campusId}/by-campus`,
    );
  }

  // --- Feedback ---

  getFeedbackStatus(studentId: string): Promise<FeedbackStatus> {
    return gmFetch<FeedbackStatus>(
      `${BASE}/feedback-service/feedbacks/students/${studentId}/has-feedback`,
    );
  }

  getUnfinishedFeedbacks(
    termId: string,
    studentId: string,
  ): Promise<StudentFeedbackLecturerResult[]> {
    return gmFetch(
      `${BASE}/feedback-service/feedbacks/students/${termId}/${studentId}/un-finished`,
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
      `${BASE}/homework-service/home-work-students/${studentId}/${termId}/home-work-student-by-term-id`,
    );
  }

  getUndoneHomework(studentId: string, termId: string): Promise<Homework[]> {
    return gmFetch<Homework[]>(
      `${BASE}/homework-service/home-work-students/${studentId}/${termId}/undone-home-work-student-by-term-id`,
    );
  }

  // --- Courses ---

  getCoursesByTerm(termId: string, studentId: string): Promise<Course[]> {
    return gmFetch<Course[]>(
      `${BASE}/education-management/courses/${termId}/${studentId}/by-term-student`,
    );
  }

  getAcademicYears(studentId: string): Promise<string[]> {
    return gmFetch<string[]>(
      `${BASE}/education-management/courses/academics/${studentId}/by-student`,
    );
  }

  getMarkCommonByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<MarkCommon[]> {
    return gmFetch<MarkCommon[]>(
      `${BASE}/education-management/courses/details/${academicYear}/${termOrder}/${studentId}/get-mark-common-by-student`,
    );
  }

  getBlockMarkPeriods(campusId: string): Promise<BlockMarkPeriod[]> {
    return gmFetch<BlockMarkPeriod[]>(
      `${BASE}/education-management/block-mark-periods/${campusId}`,
    );
  }

  getKqrlByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<KqrlResult> {
    return gmFetch<KqrlResult>(
      `${BASE}/education-management/class-students/details/${academicYear}/${termOrder}/${studentId}/get-kqrl-by-student`,
    );
  }

  getNlpcByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<void> {
    return gmFetchRaw(
      `${BASE}/education-management/attitude-quality-students/${academicYear}/${termOrder}/${studentId}/get-nlpc-by-student`,
    ).then(() => {});
  }

  getGradesByCampus(campusId: string): Promise<Grade[]> {
    return gmFetch<Grade[]>(
      `${BASE}/identity-management/grades/${campusId}/by-campus`,
    );
  }

  getMainClassesByStudent(
    studentId: string,
    termId: string,
  ): Promise<MainClass[]> {
    return gmFetch<MainClass[]>(
      `${BASE}/education-management/classes/${studentId}/${termId}/main-classes-by-student`,
    );
  }

  // --- Clubs ---

  getClubsByTerm(termId: string, studentId: string): Promise<Club[]> {
    return gmFetch<Club[]>(
      `${BASE}/education-management/clubs/${termId}/${studentId}/by-term-student`,
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
      `${BASE}/education-management/clubs/discount-club-student/${termId}/${studentId}/get-discount-and-price-by-student`,
    );
  }

  // --- Events ---

  getEventsByTerm(termId: string, studentId: string): Promise<EventStudent[]> {
    return gmFetch<EventStudent[]>(
      `${BASE}/student-service/events/${termId}/${studentId}/by-term-student`,
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
      `${BASE}/student-service/events/register/${eventId}/${studentId}`,
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
    return gmFetch<Campus>(`${BASE}/identity-management/campuses/${campusId}`);
  }

  // --- Discipline ---

  getDisciplineLevels(campusId: string): Promise<DisciplineLevel[]> {
    return gmFetch<DisciplineLevel[]>(
      `${BASE}/student-service/discipline-levels/${campusId}/by-campus`,
    );
  }

  getDisciplineRules(campusId: string): Promise<DisciplineRule[]> {
    return gmFetch<DisciplineRule[]>(
      `${BASE}/student-service/discipline-rules/${campusId}/by-campus`,
    );
  }

  getDisciplineRulesByStudent(
    studentId: string,
  ): Promise<DisciplineRuleStudent[]> {
    return gmFetch<DisciplineRuleStudent[]>(
      `${BASE}/student-service/discipline-rule-students/${studentId}/by-student`,
    );
  }

  // --- Rewards ---

  getRewardBonusTypes(campusId: string): Promise<RewardBonusType[]> {
    return gmFetch<RewardBonusType[]>(
      `${BASE}/student-service/reward-bonus-types/${campusId}/by-campus`,
    );
  }

  getRewardFrequencies(campusId: string): Promise<RewardFrequency[]> {
    return gmFetch<RewardFrequency[]>(
      `${BASE}/student-service/reward-frequencies/${campusId}/by-campus`,
    );
  }

  getRewardsByCampus(campusId: string): Promise<Reward[]> {
    return gmFetch<Reward[]>(
      `${BASE}/student-service/rewards/${campusId}/by-campus`,
    );
  }

  getRewardsByStudent(studentId: string): Promise<RewardStudent[]> {
    return gmFetch<RewardStudent[]>(
      `${BASE}/student-service/reward-students/${studentId}/by-student`,
    );
  }

  // --- Dormitory ---

  hasDormBedStudent(studentId: string): Promise<boolean> {
    return gmFetch<boolean>(
      `${BASE}/dormitory-management/dorm-bed-students/${studentId}/has-student`,
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
      `${BASE}/extended-service/notifications/${userId}/${records}/by-records`,
    );
  }

  markNotificationAsRead(notificationId: string): Promise<unknown> {
    return gmFetch<unknown>(
      `${BASE}/extended-service/notifications/${notificationId}/notification-as-read`,
      "GET",
    );
  }

  // --- Menu ---

  getMenuRoleCampuses(roleCode: string, campusId: string): Promise<MenuItem[]> {
    return gmFetch<MenuItem[]>(
      `${BASE}/identity-management/menu-role-campuses/${roleCode}/${campusId}/by-code`,
    );
  }

  // --- Users ---

  getUserById(userId: string): Promise<User> {
    return gmFetch<User>(`${BASE}/user-management/users/${userId}/by-id`);
  }

  getUserImage(userId: string): Promise<string | null> {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: `${BASE}/user-management/users/image/${userId}/by-user-id`,
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
    return gmFetch<Student>(`${BASE}/user-management/students/${studentId}`);
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
}
