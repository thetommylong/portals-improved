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

export type FeatureFlag =
  | "schedule"
  | "feedback"
  | "homeworks"
  | "marks"
  | "clubs"
  | "events"
  | "standing"
  | "notifications"
  | "session";

export interface AdapterFeatures {
  schedule: boolean;
  feedback: boolean;
  homeworks: boolean;
  marks: boolean;
  clubs: boolean;
  events: boolean;
  standing: boolean;
  notifications: boolean;
  session: boolean;
  supportsMutations: boolean;
}

export interface PortalAdapter {
  readonly name: "live" | "mock";
  /** Hostname fragments this adapter serves. Each adapter declares its own —
   *  nothing outside the adapter needs to know which hosts exist. A live
   *  adapter claims real hosts; the mock claims none, since it's a stand-in
   *  for whichever portal is active rather than a portal itself. */
  readonly hosts: readonly string[];
  readonly features: AdapterFeatures;

  waitForValidSession(timeoutMs: number): Promise<string | null>;
  getStudentContext(): Promise<StudentContext>;
  buildSsoUrl(url: string): Promise<string>;

  getDefaultTerm(campusId: string): Promise<Term>;
  getTermsByCampus(campusId: string): Promise<Term[]>;

  getFeedbackStatus(studentId: string): Promise<FeedbackStatus>;
  getUnfinishedFeedbacks(
    termId: string,
    studentId: string,
  ): Promise<StudentFeedbackLecturerResult[]>;
  updateFeedbackAnswer(payload: FeedbackAnswerUpdate): Promise<unknown>;
  updateFeedbackComment(
    slot: 1 | 2,
    payload: FeedbackCommentUpdate,
  ): Promise<unknown>;
  updateFeedbackStatus(payload: FeedbackStatusUpdate): Promise<unknown>;

  getStudentHomeWorks(
    studentId: string,
    termId: string,
  ): Promise<StudentHomeWork[]>;
  getUndoneHomework(studentId: string, termId: string): Promise<Homework[]>;

  getCoursesByTerm(termId: string, studentId: string): Promise<Course[]>;
  getAcademicYears(studentId: string): Promise<string[]>;
  getMarkCommonByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<MarkCommon[]>;
  getBlockMarkPeriods(campusId: string): Promise<BlockMarkPeriod[]>;
  getKqrlByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<KqrlResult>;
  getNlpcByStudent(
    academicYear: string,
    termOrder: number,
    studentId: string,
  ): Promise<void>;
  getGradesByCampus(campusId: string): Promise<Grade[]>;
  getMainClassesByStudent(
    studentId: string,
    termId: string,
  ): Promise<MainClass[]>;

  getClubsByTerm(termId: string, studentId: string): Promise<Club[]>;
  getClubSubjectsByIds(clubSubjectIds: string[]): Promise<ClubSubject[]>;
  getClubSubjectTypesByIds(
    clubSubjectIds: string[],
  ): Promise<ClubSubjectType[]>;
  getClubStudentStatistics(
    studentIds: string[],
  ): Promise<Record<string, unknown>>;
  getDiscountAndPriceByStudent(
    termId: string,
    studentId: string,
  ): Promise<unknown>;

  getEventsByTerm(termId: string, studentId: string): Promise<EventStudent[]>;
  getEventStatistics(eventIds: string[]): Promise<Record<string, unknown>>;
  getEventImages(eventIds: string[]): Promise<Record<string, unknown>>;
  toggleEventRegistration(
    eventId: string,
    studentId: string,
    eventData: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;

  getCampusesByIds(campusIds: string[]): Promise<Campus[]>;
  getCampus(campusId: string): Promise<Campus>;

  getDisciplineLevels(campusId: string): Promise<DisciplineLevel[]>;
  getDisciplineRules(campusId: string): Promise<DisciplineRule[]>;
  getDisciplineRulesByStudent(
    studentId: string,
  ): Promise<DisciplineRuleStudent[]>;
  getRewardBonusTypes(campusId: string): Promise<RewardBonusType[]>;
  getRewardFrequencies(campusId: string): Promise<RewardFrequency[]>;
  getRewardsByCampus(campusId: string): Promise<Reward[]>;
  getRewardsByStudent(studentId: string): Promise<RewardStudent[]>;

  hasDormBedStudent(studentId: string): Promise<boolean>;
  getSurveyLink(): Promise<SurveyLink>;

  getAllNotificationTypes(): Promise<NotificationType[]>;
  getNotificationsByRecords(
    userId: string,
    records: number,
  ): Promise<NotificationsResult>;
  markNotificationAsRead(notificationId: string): Promise<unknown>;

  getMenuRoleCampuses(roleCode: string, campusId: string): Promise<MenuItem[]>;

  getUserById(userId: string): Promise<User>;
  getUserImage(userId: string): Promise<string | null>;
  getStudentById(studentId: string): Promise<Student>;

  getTimeSlotsByTerm(termIds: string[]): Promise<TimeSlot[]>;
  getCalendarByStudentAndDateRange(
    studentId: string,
    startDate: string,
    endDate: string,
  ): Promise<ScheduleEntry[]>;
}

/** Does `hostname` belong to any of the given host fragments? The single
 *  definition of what "on this portal" means, shared by the adapter registry
 *  and by scripts that opt into one portal via `export const portal`. */
export function matchesHost(
  hostname: string,
  fragments: readonly string[],
): boolean {
  return fragments.some((fragment) => hostname.includes(fragment));
}
