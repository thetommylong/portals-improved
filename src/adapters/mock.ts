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

const MOCK_USER_ID = "mock-user";
const MOCK_CAMPUS_ID = "mock-campus";
const MOCK_STUDENT_ID = "mock-student";
const MOCK_TERM_ID = "mock-term";

// Mock data is generated relative to "now" so the preview shows a live-looking
// schedule (current week), upcoming events, and a current semester on any day.
const MOCK_YEAR = new Date().getFullYear();
const MOCK_DATE = isoDaysFromNow(0);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function term(): Term {
  return {
    termId: MOCK_TERM_ID,
    semesterName: "Mock Term",
    startDate: isoDaysFromNow(-60),
    endDate: isoDaysFromNow(120),
    isHidden: false,
    isClosed: false,
    isFee: false,
    termOrder: 1,
    academicStartYear: MOCK_YEAR,
    academicEndYear: MOCK_YEAR + 1,
    isCurrentTerm: true,
    campusId: MOCK_CAMPUS_ID,
    campusId1: MOCK_CAMPUS_ID,
    campusId2: MOCK_CAMPUS_ID,
    isMultiCampus: false,
    createdDate: MOCK_DATE,
    updatedDate: MOCK_DATE,
    logs: null,
  };
}

function markCommon(): MarkCommon {
  return {
    courseId: "mock-course",
    studentId: MOCK_STUDENT_ID,
    subjectName: "Mathematics 1",
    lecturerName: "Mock Lecturer",
    averageMark: "8.5",
    averageMarkCN: "8.0",
    commentGK: "Good progress",
    comment: null,
    commentCN: "",
    isJustUpdatedAverageMark: false,
    isMain: true,
    isFPT: true,
    showingMarkOnStudentPage: true,
    markDTO: {},
  };
}

export class MockAdapter implements PortalAdapter {
  readonly name = "mock" as const;
  readonly hosts: readonly string[] = [];
  readonly features = FEATURES;

  waitForValidSession(): Promise<string | null> {
    return Promise.resolve(MOCK_USER_ID);
  }

  getStudentContext(): Promise<StudentContext> {
    return Promise.resolve({
      studentId: MOCK_STUDENT_ID,
      userId: MOCK_USER_ID,
      email: "mock@fpt.edu.vn",
      username: "mock.user",
      campusId: MOCK_CAMPUS_ID,
      campusCode: "MOCK",
      role: "student (mock)",
      userType: "student",
      termOrder: 1,
      academicYear: "2026-2027",
    });
  }

  buildSsoUrl(url: string): Promise<string> {
    return Promise.resolve(url);
  }

  getDefaultTerm(): Promise<Term> {
    return Promise.resolve(term());
  }

  getTermsByCampus(): Promise<Term[]> {
    return Promise.resolve([term()]);
  }

  getFeedbackStatus(): Promise<FeedbackStatus> {
    return Promise.resolve({
      unDoneFeedbacks: [],
      feedbacks: [],
      hasFeedback: false,
      hasFavoriteSubjects: false,
    });
  }

  getUnfinishedFeedbacks(): Promise<StudentFeedbackLecturerResult[]> {
    return Promise.resolve([]);
  }

  updateFeedbackAnswer(_: FeedbackAnswerUpdate): Promise<unknown> {
    return Promise.resolve(null);
  }

  updateFeedbackComment(_: 1 | 2, __: FeedbackCommentUpdate): Promise<unknown> {
    return Promise.resolve(null);
  }

  updateFeedbackStatus(_: FeedbackStatusUpdate): Promise<unknown> {
    return Promise.resolve(null);
  }

  getStudentHomeWorks(): Promise<StudentHomeWork[]> {
    return Promise.resolve([
      {
        homeWorkStudentId: "mock-hw-1",
        homeworkId: "mock-homework-1",
        courseId: "mock-course",
        subjectId: "mock-subject",
        subjectName: "Mathematics 1",
        classId: "mock-class",
        className: "MOCK2026A",
        teacherId: "mock-teacher",
        teacherName: "Mock Lecturer",
        teacherUsername: "mock.teacher",
        homeworkTitle: "Chapter 1 exercises",
        homeworkContent: "Solve exercises 1.1–1.15.",
        fromDateTime: isoDaysFromNow(-5),
        expiredDateTime: isoDaysFromNow(7),
        homeworkFiles: [],
        studentId: MOCK_STUDENT_ID,
        studentName: "Mock Student",
        rollNumber: "MOCK0001",
        studentFiles: [],
        isClosed: false,
        isDone: false,
        completedAt: "",
        studentContent: "",
        studentTitle: "",
        teacherComment: "",
        mark: null,
        campusId: MOCK_CAMPUS_ID,
      },
    ]);
  }

  getUndoneHomework(): Promise<Homework[]> {
    return Promise.resolve([
      {
        homeWorkStudentId: "mock-hw-1",
        homeWorkId: "mock-homework-1",
        studentId: MOCK_STUDENT_ID,
        termId: MOCK_TERM_ID,
        subjectName: "Mathematics 1",
        title: "Chapter 1 exercises",
        description: "Solve exercises 1.1–1.15.",
        startDate: isoDaysFromNow(-5),
        endDate: isoDaysFromNow(7),
        isDone: false,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getCoursesByTerm(): Promise<Course[]> {
    return Promise.resolve([markCommon()]);
  }

  getAcademicYears(): Promise<string[]> {
    return Promise.resolve([`${MOCK_YEAR}-${MOCK_YEAR + 1}`]);
  }

  getMarkCommonByStudent(): Promise<MarkCommon[]> {
    return Promise.resolve([
      markCommon(),
      {
        ...markCommon(),
        subjectName: "Computer Science",
        courseId: "mock-course-2",
      },
    ]);
  }

  getBlockMarkPeriods(): Promise<BlockMarkPeriod[]> {
    return Promise.resolve([
      {
        blockMarkPeriodId: "mock-bmp",
        blockMarkPeriodCode: "BMP-1",
        description: "Block 1",
        startDate: isoDaysFromNow(-60),
        endDate: isoDaysFromNow(120),
        termId: MOCK_TERM_ID,
        campusId: MOCK_CAMPUS_ID,
        isCommon: true,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getKqrlByStudent(): Promise<KqrlResult> {
    return Promise.resolve({
      studentId: MOCK_STUDENT_ID,
      termResult: {
        termId: MOCK_TERM_ID,
        termName: "Mock Term",
        average: "8.2",
        capacity: "Excellent",
        rankConduct: "Good",
        reasonDown: null,
        comment: null,
      },
      academicResult: null,
    });
  }

  getNlpcByStudent(): Promise<void> {
    return Promise.resolve();
  }

  getGradesByCampus(): Promise<Grade[]> {
    return Promise.resolve([
      {
        gradeId: "mock-grade",
        gradeCode: "G10",
        schoolType: 1,
        description: "Grade 10",
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
      },
    ]);
  }

  getMainClassesByStudent(): Promise<MainClass[]> {
    return Promise.resolve([
      {
        classId: "mock-class",
        classTypeId: "mock-type",
        classType: null,
        className: "MOCK2026A",
        startYear: 2026,
        endYear: 2027,
        teacherLogin: "mock.teacher",
        gradeId: "mock-grade",
        observers: null,
        giaoVienBanTru: "",
        noReport: false,
        campusId: MOCK_CAMPUS_ID,
        campusId1: MOCK_CAMPUS_ID,
        campusId2: MOCK_CAMPUS_ID,
        isMultiCampus: false,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getClubsByTerm(): Promise<Club[]> {
    return Promise.resolve([
      {
        clubId: "mock-club",
        clubName: "Robotics Club",
        termId: MOCK_TERM_ID,
        campusId: MOCK_CAMPUS_ID,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getClubSubjectsByIds(): Promise<ClubSubject[]> {
    return Promise.resolve([
      {
        clubSubjectId: "mock-club-subject",
        clubSubjectName: "Robotics",
        clubSubjectTypeId: "mock-club-type",
        description: "Build and program robots",
        campusId: MOCK_CAMPUS_ID,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getClubSubjectTypesByIds(): Promise<ClubSubjectType[]> {
    return Promise.resolve([
      {
        clubSubjectTypeId: "mock-club-type",
        clubSubjectTypeName: "STEM",
        description: "Science, technology, engineering, math",
        campusId: MOCK_CAMPUS_ID,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getClubStudentStatistics(): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }

  getDiscountAndPriceByStudent(): Promise<unknown> {
    return Promise.resolve(null);
  }

  getEventsByTerm(): Promise<EventStudent[]> {
    return Promise.resolve([
      {
        event: {
          eventId: "mock-event",
          eventCode: "EV-1",
          eventNameEnglish: "Welcome Party",
          eventTypeId: "mock-event-type",
          eventType: null,
          termId: MOCK_TERM_ID,
          organization: "FPT University",
          numberOfSlots: 100,
          registeredStartDate: isoDaysFromNow(-5),
          registeredEndDate: isoDaysFromNow(5),
          startDate: isoDaysFromNow(10),
          endDate: isoDaysFromNow(10),
          feedbackStartDate: isoDaysFromNow(11),
          feedbackEndDate: isoDaysFromNow(14),
          location: "Main Hall",
          currentOption: "registered",
          hasAttendance: true,
          hasIssuingCertificate: false,
          hasCreateStudent: false,
          eventGender: false,
          isMultiCampus: false,
          isCommon: false,
          isShowMark: false,
          title: "Welcome Party 2026",
          content: "Welcome event for new students.",
          campusId: MOCK_CAMPUS_ID,
          campusId1: MOCK_CAMPUS_ID,
          campusId2: MOCK_CAMPUS_ID,
          approvedBy: null,
          isApproved: true,
          createdDate: MOCK_DATE,
          updatedDate: MOCK_DATE,
          logs: null,
        },
        eventStudent: null,
        currentServerDate: MOCK_DATE,
        organization: null,
      },
    ]);
  }

  getEventStatistics(): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }

  getEventImages(): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }

  toggleEventRegistration(): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }

  getCampusesByIds(): Promise<Campus[]> {
    return Promise.resolve([
      {
        campusId: MOCK_CAMPUS_ID,
        campusCode: "MOCK",
        flmCampusCode: "MOCK",
        eduNextLiteCampusCode: "mock-edu",
        campusName: "Mock Campus",
        parentCampusCode: "MOCK",
        contact: "",
        provinceCode: "HN",
        parentCampusName: "Mock Campus",
        parentCampusNameEnglish: "Mock Campus",
        soGD: "",
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
      },
    ]);
  }

  getCampus(): Promise<Campus> {
    return this.getCampusesByIds().then((c) => c[0]);
  }

  getDisciplineLevels(): Promise<DisciplineLevel[]> {
    return Promise.resolve([
      {
        disciplineLevelId: "mock-dl",
        academicString: "2026-2027",
        disciplineLevelNumber: 1,
        description: "Warning",
        rankConductId: "mock-rc",
        rankConduct: null,
        isActive: true,
        campusId: MOCK_CAMPUS_ID,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getDisciplineRules(): Promise<DisciplineRule[]> {
    return Promise.resolve([
      {
        disciplineRuleId: "mock-dr",
        code: "DR-1",
        description: "Truancy",
        campusId: MOCK_CAMPUS_ID,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getDisciplineRulesByStudent(): Promise<DisciplineRuleStudent[]> {
    return Promise.resolve([]);
  }

  getRewardBonusTypes(): Promise<RewardBonusType[]> {
    return Promise.resolve([
      {
        rewardBonusTypeId: "mock-rbt",
        code: "RBT-1",
        description: "Certificate",
        campusId: MOCK_CAMPUS_ID,
        isCommon: true,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getRewardFrequencies(): Promise<RewardFrequency[]> {
    return Promise.resolve([
      {
        rewardFrequencyId: "mock-rf",
        code: "RF-1",
        description: "Once",
        campusId: MOCK_CAMPUS_ID,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getRewardsByCampus(): Promise<Reward[]> {
    return Promise.resolve([
      {
        rewardId: "mock-reward",
        code: "REW-1",
        title: "Academic Excellence",
        nameEnglish: "Academic Excellence",
        description: "Reward for top GPA",
        decisionCode: "DC-1",
        date: isoDaysFromNow(-20),
        startYear: MOCK_YEAR,
        rewardFrequencyId: "mock-rf",
        organization: "FPT University",
        isShowMark: true,
        isCommon: true,
        hasTeacherRegister: false,
        campusId: MOCK_CAMPUS_ID,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getRewardsByStudent(): Promise<RewardStudent[]> {
    return Promise.resolve([]);
  }

  hasDormBedStudent(): Promise<boolean> {
    return Promise.resolve(false);
  }

  getSurveyLink(): Promise<SurveyLink> {
    return Promise.resolve({ status: false, data: null });
  }

  getAllNotificationTypes(): Promise<NotificationType[]> {
    return Promise.resolve([
      {
        notificationTypeId: "mock-nt",
        code: "INFO",
        description: "Announcement",
        isCommon: true,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
      },
    ]);
  }

  getNotificationsByRecords(): Promise<NotificationsResult> {
    return Promise.resolve({
      numberOfUnreadNotifications: 1,
      notifications: [],
    });
  }

  markNotificationAsRead(): Promise<unknown> {
    return Promise.resolve(null);
  }

  getMenuRoleCampuses(): Promise<MenuItem[]> {
    return Promise.resolve([]);
  }

  getUserById(): Promise<User> {
    return Promise.resolve({
      id: MOCK_USER_ID,
      campusId: MOCK_CAMPUS_ID,
      name: "Mock User",
      userName: "mock.user",
      rollNumber: "MOCK0001",
      userType: "student",
      isActive: true,
      email: "mock@fpt.edu.vn",
      emailFe: "mock@fpt.edu.vn",
      emailConfirmed: true,
      phoneNumber: null,
      googleMeetLink: "",
      gender: true,
      alternativeEmail: null,
      citizenCardId: null,
      lastLoginedInAt: null,
      hasInstalledAppMobile: false,
    });
  }

  getUserImage(): Promise<string | null> {
    return Promise.resolve(null);
  }

  getStudentById(): Promise<Student> {
    return Promise.resolve({
      studentId: MOCK_STUDENT_ID,
      rollNumber: "MOCK0001",
      altStudentCode: "MOCK",
      middleName: null,
      cardID: "123456789",
      dateOfIssue: null,
      placeOfIssue: null,
      address: "Hanoi, Vietnam",
      street: "",
      ward: "",
      province: "HN",
      homePhone: null,
      enrolDate: null,
      academicStartYear: 2026,
      academicEndYear: 2027,
      currentStatus: true,
      currentStatusNote: null,
      healthInsuranceNumber: null,
      externalID: "MOCK",
      nationality: null,
      ethnicity: null,
      religion: null,
      login: "mock.user",
      firstName: "Mock",
      lastName: "User",
      fullName: "Mock User",
      email: "mock@fpt.edu.vn",
      phoneNumber: null,
      isAvailable: true,
      gender: true,
      dateOfBirth: "2008-01-01",
      campusId: MOCK_CAMPUS_ID,
      isIssuedAccount: true,
      isChangedPassword: false,
      isActive: true,
      synchronizedUserIdWithFeId: false,
      createdDate: MOCK_DATE,
      updatedDate: MOCK_DATE,
    });
  }

  getTimeSlotsByTerm(): Promise<TimeSlot[]> {
    return Promise.resolve([
      {
        timeSlotId: "mock-slot",
        slot: 1,
        startHour: 7,
        startMinute: 30,
        endHour: 9,
        endMinute: 30,
        slotLabel: "Slot 1",
        termId: MOCK_TERM_ID,
        campusId: MOCK_CAMPUS_ID,
        isAttendance: true,
        createdDate: MOCK_DATE,
        updatedDate: MOCK_DATE,
        logs: null,
      },
    ]);
  }

  getCalendarByStudentAndDateRange(
    _studentId: string,
    startDate: string,
    endDate: string,
  ): Promise<ScheduleEntry[]> {
    const subjects = [
      {
        subjectName: "Mathematics 1",
        roomNo: "A201",
        lecturerName: "Mock Lecturer",
        plan: "Complex numbers",
      },
      {
        subjectName: "Computer Science",
        roomNo: "B105",
        lecturerName: "Dr. Jane Nguyen",
        plan: "Data structures",
      },
      {
        subjectName: "English 5",
        roomNo: "C301",
        lecturerName: "Ms. Hoa Tran",
        plan: "Academic writing",
      },
      {
        subjectName: "Physics",
        roomNo: "A401",
        lecturerName: "Mr. Minh Le",
        plan: "Kinematics",
      },
    ];
    const slots = [
      { h: 7, m: 30 },
      { h: 13, m: 0 },
    ];
    const statuses = [
      "PRESENT",
      "PRESENT",
      "LATE",
      "PRESENT",
      "ABSENT",
    ] as const;

    const entries: ScheduleEntry[] = [];
    const cursor = new Date(`${startDate}T00:00:00`);
    const stop = new Date(`${endDate}T00:00:00`);
    let seq = 0;
    while (cursor <= stop) {
      const dow = cursor.getDay();
      if (dow >= 1 && dow <= 5) {
        const date = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
        for (const [slotIndex, slot] of slots.entries()) {
          const subj =
            subjects[(seq + (slotIndex % subjects.length)) % subjects.length];
          entries.push({
            id: `mock-entry-${seq}`,
            date,
            startDateTime: `${date}T${pad(slot.h)}:${pad(slot.m)}:00`,
            endDateTime: `${date}T${pad(slot.h + 2)}:${pad(slot.m)}:00`,
            roomNo: subj.roomNo,
            lecturerName: subj.lecturerName,
            subjectName: subj.subjectName,
            expectedStyle: "offline",
            schedulePlanContent: subj.plan,
            flmSessionNo: seq + 1,
            className: "MOCK2026A",
            slotNo: (slotIndex % 4) + 1,
            timeSlotId: "mock-slot",
            status: statuses[seq % statuses.length],
            hasAbsenceRequest: false,
            absenceRequestReason: null,
            comment: null,
            proctorComment: null,
            eduNextUrl: null,
            googleMeetLink: null,
          });
          seq += 1;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return Promise.resolve(entries);
  }
}
