// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

// `vi` is typed as `Record<keyof typeof en, string>` so adding a key to `en`
// without adding it to `vi` is a compile error.
const en = {
  // nav
  "nav.home": "Home",
  "nav.feedback": "Feedback",
  "nav.homeworks": "Homeworks",
  "nav.marks": "Marks",
  "nav.clubs": "Clubs",
  "nav.events": "Events",
  "nav.standing": "Standing",

  // header
  "header.today": "Today",
  "header.aria.previous": "Previous",
  "header.aria.next": "Next",
  "header.aria.mainNav": "Main navigation",

  // aria labels / screen-reader only
  "aria.toggleMenu": "Toggle menu",
  "aria.toggleAssistant": "Toggle AI assistant",
  "aria.appearance": "Appearance settings",
  "aria.refresh": "Refresh",
  "aria.notificationsNone": "Notifications",
  "aria.notificationsUnread": "Notifications ({n} unread)",
  "aria.assistant": "AI Assistant",
  "aria.resizeAssistant": "Resize AI assistant",
  "aria.close": "Close",
  "aria.avatar": "{name} avatar",

  // settings pop
  "settings.theme": "Theme",
  "settings.darkFlavor": "Dark flavor",
  "settings.accent": "Accent",
  "settings.about": "About",
  "settings.flavor": "Flavor",
  "settings.darkGroup": "Dark flavor",
  "settings.accentColor": "Accent color",
  "settings.language": "Language",
  "settings.languageGroup": "Language",

  // toasts
  "toast.profileFailed": "Failed to load profile",
  "toast.viewUnavailable": "{label} unavailable for this portal provider",
  "toast.timetableFailed": "Failed to load timetable",
  "toast.timetableOffline": "Offline — showing saved timetable",
  "toast.otherSemester": "Couldn't load other semester — predicting without CN",
  "toast.homeworksFailed": "Failed to load homeworks",
  "toast.feedbackFailed": "Failed to load feedback",
  "toast.feedbackOpenFailed": "Failed to open feedback form",
  "toast.answerUpdated": "Answer updated",
  "toast.commentSaveFailed": "Failed to save comment",
  "toast.feedbackSent": "Feedback sent",
  "toast.feedbackSendFailed": "Failed to send feedback",
  "toast.eventsFailed": "Failed to load events",
  "toast.registrationToggleFailed": "Failed to update registration",
  "toast.registered": "Registered for event",
  "toast.unregistered": "Unregistered from event",
  "toast.semestersFailed": "Failed to load semesters",
  "toast.clubsFailed": "Failed to load clubs",
  "toast.marksFailed": "Failed to load marks",
  "toast.marksStale": "Couldn't refresh — showing saved marks",
  "toast.standingFailed": "Failed to load standing",

  // shared status words
  "status.loading": "Loading…",
  "status.retry": "Retry",

  // label words shared across cards/views
  "label.term": "Semester",
  "label.teacher": "Lecturer",
  "label.files": "Files",
  "label.mark": "Mark",
  "label.deadline": "Deadline",
  "label.location": "Location",
  "label.slots": "Slots",
  "label.certificate": "Certificate",
  "label.attendance": "Attendance",
  "label.created": "Created",
  "label.all": "All",
  "label.yes": "Yes",
  "label.done": "Recorded",
  "label.tickets": "{n} tickets",

  // schedule
  "schedule.lessonAria":
    "{subject} at {start}–{end} taught by {teacher} in {room}",
  "schedule.noClasses": "No classes this day",

  // lesson popup
  "popup.plan": "Plan",
  "popup.checking": "checking…",
  "popup.teacherComment": "Teacher's comment",
  "popup.proctor": "Proctor",
  "popup.absenceRequest": "Absence request",
  "popup.requested": "Requested",
  "popup.none": "None",
  "popup.openLms": "Open in LMS",
  "attendance.present": "Present",
  "attendance.late": "Late",
  "attendance.absent": "Absent",
  "attendance.excused": "Excused",

  // homeworks
  "homeworks.groupPending": "Pending ({n})",
  "homeworks.groupDone": "Done ({n})",
  "homeworks.badgePending": "Pending",
  "homeworks.badgeDone": "Done",
  "homeworks.badgeOverdue": "Overdue",
  "homeworks.empty": "No homework published yet",
  "homeworks.assignments": "{n} assignments",
  "homeworks.submissions": "{n} submissions",

  // feedback
  "feedback.groupPending": "Not submitted ({n})",
  "feedback.groupDone": "Submitted ({n})",
  "feedback.badgePending": "Not submitted",
  "feedback.badgeDone": "Submitted",
  "feedback.cardAria": "Feedback for {subject} (Not submitted)",
  "feedback.empty": "No feedback published yet",
  "feedback.formAria": "Feedback form",
  "feedback.close": "Close",
  "feedback.questionFallback": "Question {n}",
  "feedback.answerAria": "Question {n}: {content}",
  "feedback.commentPlaceholder1": "Note your comments about the lecturer",
  "feedback.commentPlaceholder2": "Note any other comments",
  "feedback.submitting": "Submitting…",
  "feedback.submit": "Submit feedback",
  "feedback.closing": "Closing…",
  "feedback.cancel": "Cancel",
  "feedback.disabled":
    "Please answer all questions and leave at least one comment",

  // events
  "events.groupPending": "Not attended ({n})",
  "events.groupDone": "Attended ({n})",
  "events.badgePending": "Not attended",
  "events.badgeDone": "Attended",
  "events.empty": "No events published yet",
  "events.ariaRegister": "Register for this event",
  "events.ariaUnregister": "Unregister from this event",
  "events.register": "Register",
  "events.unregister": "Unregister",
  "events.registering": "Registering…",
  "events.unregistering": "Unregistering…",

  // clubs
  "clubs.empty": "No clubs found",
  "clubs.gridAria": "Clubs",

  // standing
  "standing.year": "Academic year",
  "standing.all": "All",
  "standing.empty": "No records yet",
  "standing.emptyYear": "No records for this academic year",
  "standing.reward": "Reward",
  "standing.discipline": "Discipline",
  "standing.date": "Date",
  "standing.yearShort": "Year",
  "standing.detail": "Detail",
  "standing.decisionNo": "Decision no.",
  "standing.eo": "EN",
  "standing.code": "Code",
  "standing.ruleCode": "Rule code",
  "standing.level": "Level",
  "standing.gridAria": "Standing records",

  // marks
  "marks.term": "Semester",
  "marks.export": "Export CSV",
  "marks.predictor": "What do I need on my finals?",
  "marks.empty": "No marks recorded for this semester yet",
  "marks.gridAria": "Marks by subject",
  "marks.tb": "TB {value}",
  "marks.cn": "CN {value}",
  "marks.tx": "TX",
  "marks.skills": "Skills",
  "marks.milestones": "Milestones",
  "marks.others": "Others",
  "marks.none": "No marks yet",
  "marks.ariaTx": "Continuous assessment",
  "marks.ariaSkills": "Language skills",
  "marks.ariaMilestones": "Periodic marks",
  "marks.ariaOthers": "Other categories",

  // csv export
  "csv.subject": "Subject",
  "csv.type": "Type",
  "csv.tx": "TX Scores",
  "csv.midterm": "Midterm (Giữa Kỳ)",
  "csv.final": "Final (Cuối Kỳ)",
  "csv.semesterAvg": "Semester Avg (TB)",
  "csv.yearlyAvg": "Yearly Avg (CN)",
  "csv.numeric": "Numeric",
  "csv.passFail": "Pass-Fail",

  // grade predictor
  "predictor.title": "Final Grade Predictor",
  "predictor.detailGroup": "Grade detail",
  "predictor.targetLabel": "Target average",
  "predictor.targetAria": "Target average",
  "predictor.placeholder": "e.g. 8.0",
  "predictor.loadingSibling": "Loading other semester…",
  "predictor.yearAvgInclude": "Year averages include {semester}.",
  "predictor.yearAvgNeed": "Year averages need your other semester's grades.",
  "predictor.gk": "GK: {value}",
  "predictor.ck": "CK {value}",
  "predictor.tb": "TB {value}",
  "predictor.cn": "CN {value}",
  "predictor.statusImpossible": "Impossible",
  "predictor.statusSecured": "Secured",
  "predictor.statusNeedGK": "Need GK",
  "predictor.statusNeedFinal": "Need {value} on final",
  "predictor.finalized": "Final done",
  "predictor.back": "Back",
  "predictor.results": "Results",
  "predictor.component": "Component",
  "predictor.score": "Score",
  "predictor.tbAvg": "TB (Semester Avg)",
  "predictor.cnAvg": "CN (Year Avg)",
  "predictor.needOnFinal": "Need on Final for {target}",
  "predictor.apply": "Apply",
  "predictor.cancel": "Cancel",
  "predictor.txComponent": "TX {n}",
  "predictor.midtermComponent": "Midterm (×2)",
  "predictor.finalComponent": "Final (×3)",
  "predictor.midtermAria": "Midterm",
  "predictor.finalAria": "Final",
  "predictor.projectedAria": "Projected final for {subject}",

  // notifications panel
  "notif.title": "Notifications",
  "notif.unread": "{n} unread",
  "notif.markRead": "Mark as read",
  "notif.empty": "No notifications",
  "notif.failed": "Failed to load notifications",
  "notif.now": "now",

  // model picker
  "modelPicker.title": "Select model",
  "modelPicker.loading": "Loading models...",
  "modelPicker.empty": "No models found",
  "modelPicker.retry": "Retry",

  // confirm card
  "confirm.title": "Confirm Action",
  "confirm.approve": "Approve",
  "confirm.reject": "Reject",

  // chat assistant
  "chat.assistant": "AI Assistant",
  "chat.selectModel": "Select model",
  "chat.clear": "Clear chat",
  "chat.send": "Send",
  "chat.placeholder": "Ask about your portal data...",
  "chat.loadingContext": "Loading context...",
  "chat.welcome":
    "Welcome! Set your API key first:\n\n/key <your-api-key>\n\nThen optionally:\n/url <custom-base-url>\n/model <model-id>",
  "chat.noResponse": "No response from API",
  "chat.cleared": "Chat cleared.",
  "chat.apiKeySet": "API key is set ({masked})",
  "chat.apiKeyMissing": "No API key set. Usage: /key <your-api-key>",
  "chat.apiKeySaved": "API key saved.",
  "chat.baseUrlCurrent": "Current base URL: {url}\nUsage: /url <new-base-url>",
  "chat.baseUrlSet": "Base URL set to: {url}",
  "chat.modelCurrent": "Current model: {model}\nUsage: /model <model-id>",
  "chat.modelSet": "Model set to: {model}",
  "chat.noModels": "No models returned from API.",
  "chat.modelsList":
    "Available models (● = current):\n{list}\n\nUse /model <id> to switch.",
  "chat.modelsFailed": "Failed to fetch models: {message}",
  "chat.unknownCommand": "Unknown command: {cmd}\n\n{help}",
  "chat.help":
    "Available commands:\n  /models  — List and select available models\n  /key     — Set your API key\n  /url     — Set the API base URL\n  /model   — Show or set the current model\n  /clear   — Clear chat history\n  /help    — Show this help",

  // unavailable state
  "unavailable.msg":
    "This feature is unavailable for the current portal provider.",
} as const;

export type MessageKey = keyof typeof en;

const vi: Record<MessageKey, string> = {
  "nav.home": "Trang chủ",
  "nav.feedback": "Phản hồi",
  "nav.homeworks": "Bài tập",
  "nav.marks": "Điểm",
  "nav.clubs": "Câu lạc bộ",
  "nav.events": "Sự kiện",
  "nav.standing": "Khen thưởng & Kỷ luật",

  "header.today": "Hôm nay",
  "header.aria.previous": "Trước",
  "header.aria.next": "Sau",
  "header.aria.mainNav": "Menu chính",

  "aria.toggleMenu": "Mở/đóng menu",
  "aria.toggleAssistant": "Mở/đóng trợ lý AI",
  "aria.appearance": "Cài đặt giao diện",
  "aria.refresh": "Làm mới",
  "aria.notificationsNone": "Thông báo",
  "aria.notificationsUnread": "Thông báo ({n} chưa đọc)",
  "aria.assistant": "Trợ lý AI",
  "aria.resizeAssistant": "Kéo thay đổi kích thước trợ lý AI",
  "aria.close": "Đóng",
  "aria.avatar": "Ảnh đại diện của {name}",

  "settings.theme": "Chủ đề",
  "settings.darkFlavor": "Chủ đề tối",
  "settings.accent": "Màu nhấn",
  "settings.about": "Giới thiệu",
  "settings.flavor": "Tông màu",
  "settings.darkGroup": "Chủ đề tối",
  "settings.accentColor": "Màu nhấn",
  "settings.language": "Ngôn ngữ",
  "settings.languageGroup": "Ngôn ngữ",

  "toast.profileFailed": "Không tải được hồ sơ",
  "toast.viewUnavailable": "Không có sẵn {label} cho cổng này",
  "toast.timetableFailed": "Không tải được thời khóa biểu",
  "toast.timetableOffline": "Ngoại tuyến — đang hiển thị thời khóa biểu đã lưu",
  "toast.otherSemester":
    "Không tải được học kỳ còn lại — dự đoán thiếu điểm CN",
  "toast.homeworksFailed": "Không tải được bài tập",
  "toast.feedbackFailed": "Không tải được phản hồi",
  "toast.feedbackOpenFailed": "Không mở được biểu mẫu phản hồi",
  "toast.answerUpdated": "Đã cập nhật câu trả lời",
  "toast.commentSaveFailed": "Lưu nhận xét thất bại",
  "toast.feedbackSent": "Đã gửi phản hồi",
  "toast.feedbackSendFailed": "Gửi phản hồi thất bại",
  "toast.eventsFailed": "Không tải được sự kiện",
  "toast.registrationToggleFailed": "Không cập nhật được đăng ký",
  "toast.registered": "Đã đăng ký sự kiện",
  "toast.unregistered": "Đã hủy đăng ký sự kiện",
  "toast.semestersFailed": "Không tải được học kỳ",
  "toast.clubsFailed": "Không tải được câu lạc bộ",
  "toast.marksFailed": "Không tải được điểm",
  "toast.marksStale": "Không làm mới được — đang hiển thị điểm đã lưu",
  "toast.standingFailed": "Không tải được dữ liệu",

  "status.loading": "Đang tải…",
  "status.retry": "Thử lại",

  "label.term": "Học kỳ",
  "label.teacher": "GV",
  "label.files": "Tệp",
  "label.mark": "Điểm",
  "label.deadline": "Hạn nộp",
  "label.location": "Địa điểm",
  "label.slots": "Số lượng",
  "label.certificate": "Chứng chỉ",
  "label.attendance": "Điểm danh",
  "label.created": "Ngày tạo",
  "label.all": "Tất cả",
  "label.yes": "Có",
  "label.done": "Đã có",
  "label.tickets": "{n} vé",

  "schedule.lessonAria":
    "{subject} lúc {start}–{end} do {teacher} dạy tại {room}",
  "schedule.noClasses": "Không có tiết học hôm nay",

  "popup.plan": "Kế hoạch",
  "popup.checking": "đang kiểm tra…",
  "popup.teacherComment": "Nhận xét của giảng viên",
  "popup.proctor": "Giám thị",
  "popup.absenceRequest": "Đơn xin phép nghỉ",
  "popup.requested": "Đã yêu cầu",
  "popup.none": "Không có",
  "popup.openLms": "Mở trong LMS",
  "attendance.present": "Có mặt",
  "attendance.late": "Đi muộn",
  "attendance.absent": "Vắng",
  "attendance.excused": "Vắng có phép",

  "homeworks.groupPending": "Chưa hoàn thành ({n})",
  "homeworks.groupDone": "Đã hoàn thành ({n})",
  "homeworks.badgePending": "Chưa làm",
  "homeworks.badgeDone": "Đã làm",
  "homeworks.badgeOverdue": "Quá hạn",
  "homeworks.empty": "Chưa có bài tập nào",
  "homeworks.assignments": "{n} đề",
  "homeworks.submissions": "{n} nộp",

  "feedback.groupPending": "Chưa gửi ({n})",
  "feedback.groupDone": "Đã gửi ({n})",
  "feedback.badgePending": "Chưa gửi",
  "feedback.badgeDone": "Đã gửi",
  "feedback.cardAria": "Phản hồi cho {subject} (Chưa gửi)",
  "feedback.empty": "Chưa có phản hồi nào",
  "feedback.formAria": "Biểu mẫu phản hồi",
  "feedback.close": "Đóng",
  "feedback.questionFallback": "Câu hỏi {n}",
  "feedback.answerAria": "Câu hỏi {n}: {content}",
  "feedback.commentPlaceholder1": "Ghi nhận nhận xét về giảng viên",
  "feedback.commentPlaceholder2": "Ghi nhận nhận xét khác",
  "feedback.submitting": "Đang gửi…",
  "feedback.submit": "Gửi phản hồi",
  "feedback.closing": "Đang đóng…",
  "feedback.cancel": "Huỷ",
  "feedback.disabled":
    "Vui lòng trả lời tất cả câu hỏi và ghi nhận ít nhất một nhận xét",

  "events.groupPending": "Chưa tham gia ({n})",
  "events.groupDone": "Đã tham gia ({n})",
  "events.badgePending": "Chưa tham gia",
  "events.badgeDone": "Đã tham gia",
  "events.empty": "Chưa có sự kiện nào",
  "events.ariaRegister": "Đăng ký sự kiện này",
  "events.ariaUnregister": "Hủy đăng ký sự kiện này",
  "events.register": "Đăng ký",
  "events.unregister": "Hủy đăng ký",
  "events.registering": "Đang đăng ký…",
  "events.unregistering": "Đang hủy đăng ký…",

  "clubs.empty": "Không có câu lạc bộ nào",
  "clubs.gridAria": "Câu lạc bộ",

  "standing.year": "Năm học",
  "standing.all": "Tất cả",
  "standing.empty": "Chưa có dữ liệu",
  "standing.emptyYear": "Không có dữ liệu năm học này",
  "standing.reward": "Thưởng",
  "standing.discipline": "Kỷ luật",
  "standing.date": "Ngày",
  "standing.yearShort": "Năm",
  "standing.detail": "Chi tiết",
  "standing.decisionNo": "Số QĐ",
  "standing.eo": "EN",
  "standing.code": "Mã",
  "standing.ruleCode": "Mã PL",
  "standing.level": "Cấp độ",
  "standing.gridAria": "Hồ sơ khen thưởng & kỷ luật",

  "marks.term": "Học kỳ",
  "marks.export": "Xuất CSV",
  "marks.predictor": "Cần bao nhiêu ở bài cuối kỳ?",
  "marks.empty": "Chưa có điểm cho học kỳ này",
  "marks.gridAria": "Bảng điểm theo môn học",
  "marks.tb": "TB {value}",
  "marks.cn": "CN {value}",
  "marks.tx": "TX",
  "marks.skills": "Kỹ năng",
  "marks.milestones": "Định kỳ",
  "marks.others": "Khác",
  "marks.none": "Chưa có điểm",
  "marks.ariaTx": "Đánh giá thường xuyên",
  "marks.ariaSkills": "Kỹ năng ngôn ngữ",
  "marks.ariaMilestones": "Điểm định kỳ",
  "marks.ariaOthers": "Hạng mục khác",

  "csv.subject": "Môn học",
  "csv.type": "Loại",
  "csv.tx": "Điểm TX",
  "csv.midterm": "Giữa Kỳ",
  "csv.final": "Cuối Kỳ",
  "csv.semesterAvg": "ĐTB học kỳ (TB)",
  "csv.yearlyAvg": "ĐTB năm (CN)",
  "csv.numeric": "Điểm số",
  "csv.passFail": "Đạt/Không đạt",

  "predictor.title": "Dự đoán điểm cuối kỳ",
  "predictor.detailGroup": "Chi tiết điểm",
  "predictor.targetLabel": "Điểm mục tiêu",
  "predictor.targetAria": "Điểm mục tiêu",
  "predictor.placeholder": "vd. 8.0",
  "predictor.loadingSibling": "Đang tải học kỳ còn lại…",
  "predictor.yearAvgInclude": "Điểm trung bình năm bao gồm {semester}.",
  "predictor.yearAvgNeed": "Điểm trung bình năm cần điểm của học kỳ còn lại.",
  "predictor.gk": "GK: {value}",
  "predictor.ck": "CK {value}",
  "predictor.tb": "TB {value}",
  "predictor.cn": "CN {value}",
  "predictor.statusImpossible": "Bất khả thi",
  "predictor.statusSecured": "Đã an toàn",
  "predictor.statusNeedGK": "Cần GK",
  "predictor.statusNeedFinal": "Cần {value} ở bài cuối kỳ",
  "predictor.finalized": "Đã có điểm cuối kỳ",
  "predictor.back": "Quay lại",
  "predictor.results": "Kết quả",
  "predictor.component": "Thành phần",
  "predictor.score": "Điểm",
  "predictor.tbAvg": "TB (Điểm TB học kỳ)",
  "predictor.cnAvg": "CN (Điểm TB năm)",
  "predictor.needOnFinal": "Cần đạt ở bài cuối kỳ cho {target}",
  "predictor.apply": "Áp dụng",
  "predictor.cancel": "Huỷ",
  "predictor.txComponent": "ĐGTX {n}",
  "predictor.midtermComponent": "Giữa Kỳ (×2)",
  "predictor.finalComponent": "Cuối Kỳ (×3)",
  "predictor.midtermAria": "Giữa Kỳ",
  "predictor.finalAria": "Cuối Kỳ",
  "predictor.projectedAria": "Điểm cuối kỳ dự đoán cho {subject}",

  "notif.title": "Thông báo",
  "notif.unread": "{n} chưa đọc",
  "notif.markRead": "Đánh dấu đã đọc",
  "notif.empty": "Không có thông báo",
  "notif.failed": "Không tải được thông báo",
  "notif.now": "bây giờ",

  "modelPicker.title": "Chọn model",
  "modelPicker.loading": "Đang tải danh sách model…",
  "modelPicker.empty": "Không tìm thấy model",
  "modelPicker.retry": "Thử lại",

  "confirm.title": "Xác nhận",
  "confirm.approve": "Đồng ý",
  "confirm.reject": "Từ chối",

  "chat.assistant": "Trợ lý AI",
  "chat.selectModel": "Chọn model",
  "chat.clear": "Xóa hội thoại",
  "chat.send": "Gửi",
  "chat.placeholder": "Hỏi về dữ liệu cổng của bạn…",
  "chat.loadingContext": "Đang tải ngữ cảnh…",
  "chat.welcome":
    "Chào mừng! Trước tiên hãy cài API key:\n\n/key <your-api-key>\n\nSau đó có thể cài:\n/url <custom-base-url>\n/model <model-id>",
  "chat.noResponse": "Không có phản hồi từ API",
  "chat.cleared": "Đã xóa hội thoại.",
  "chat.apiKeySet": "Đã cài API key ({masked})",
  "chat.apiKeyMissing": "Chưa cài API key. Cú pháp: /key <your-api-key>",
  "chat.apiKeySaved": "Đã lưu API key.",
  "chat.baseUrlCurrent":
    "Base URL hiện tại: {url}\nCú pháp: /url <new-base-url>",
  "chat.baseUrlSet": "Đã đặt base URL: {url}",
  "chat.modelCurrent": "Model hiện tại: {model}\nCú pháp: /model <model-id>",
  "chat.modelSet": "Đã đặt model: {model}",
  "chat.noModels": "API không trả về model nào.",
  "chat.modelsList":
    "Các model có sẵn (● = đang dùng):\n{list}\n\nDùng /model <id> để chuyển.",
  "chat.modelsFailed": "Không lấy được danh sách model: {message}",
  "chat.unknownCommand": "Lệnh không xác định: {cmd}\n\n{help}",
  "chat.help":
    "Các lệnh có sẵn:\n  /models  — Liệt kê và chọn model\n  /key     — Cài API key\n  /url     — Đặt base URL\n  /model   — Xem hoặc đặt model hiện tại\n  /clear   — Xóa lịch sử hội thoại\n  /help    — Xem trợ giúp này",

  "unavailable.msg": "Tính năng này không khả dụng với cổng hiện tại.",
};

const DICTS: Record<Locale, Record<MessageKey, string>> = { en, vi };

const LOCALE_KEY = "fsp:locale";

function storedLocale(): Locale {
  const raw = GM_getValue<string>(LOCALE_KEY, "");
  if (raw === "vi" || raw === "en") return raw;
  if (navigator.language.toLowerCase().startsWith("vi")) return "vi";
  return "en";
}

class LocaleStore {
  locale = $state<Locale>(storedLocale());

  setLocale(next: Locale): void {
    this.locale = next;
    GM_setValue(LOCALE_KEY, next);
    if (document.documentElement) {
      document.documentElement.lang = next;
    }
  }
}

export const i18n = new LocaleStore();

// mirror the persisted/auto-detected setting on <html lang> (used late in case
// the module loads before <html> exists)
if (document.documentElement) {
  document.documentElement.lang = i18n.locale;
}

export function t(
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  let out: string = DICTS[i18n.locale][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      out = out.replaceAll(`{${name}}`, String(value));
    }
  }
  return out;
}
