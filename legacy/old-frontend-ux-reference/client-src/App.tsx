import { Toaster } from "sonner";

import React, { useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LowCreditsAlert } from "@/components/LowCreditsAlert";
import { ChecklistWidget } from "@/components/ChecklistWidget";
import { WarningAlert } from "@/components/WarningAlert";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "./_core/hooks/useAuth";
import { AdminNavbar } from "./components/AdminNavbar";
import Navbar from "./components/Navbar";
import { CoinAnimation } from "./components/CoinAnimation";
import { CreditRulesWelcomeModal } from "./components/CreditRulesWelcomeModal";
import { IdentitySelectionModal } from "./components/IdentitySelectionModal";

const lazyPage = (loader: () => Promise<{ default: React.ComponentType<any> }>) => React.lazy(loader);

const NotFound = lazyPage(() => import("@/pages/NotFound"));
const AdminChecklistReports = lazyPage(() => import("@/pages/AdminChecklistReports"));
const Home = lazyPage(() => import("./pages/Home"));
const Chat = lazyPage(() => import("./pages/Chat"));
const Dashboard = lazyPage(() => import("./pages/Dashboard"));
const AdminDashboard = lazyPage(() => import("./pages/AdminDashboard"));
const Practice = lazyPage(() => import("./pages/Practice"));
const Stats = lazyPage(() => import("./pages/Stats"));
const AdminQuestions = lazyPage(() => import("./pages/AdminQuestions"));
const WrongQuestions = lazyPage(() => import("./pages/WrongQuestions"));
const ExamPractice = lazyPage(() => import("./pages/ExamPractice"));
const LearningStats = lazyPage(() => import("./pages/LearningStats"));
const AdminCategories = lazyPage(() => import("./pages/AdminCategories"));
const AdminQuestionManagement = lazyPage(() => import("./pages/AdminQuestionManagement"));
const KnowledgeBase = lazyPage(() => import("./pages/KnowledgeBase").then((module) => ({ default: module.KnowledgeBase })));
const ExamQuestions = lazyPage(() => import("./pages/ExamQuestions"));
const AdminPdfCategories = lazyPage(() => import("./pages/AdminPdfCategories"));
const PdfReader = lazyPage(() => import("./pages/PdfReader"));
const QuestionBankManagement = lazyPage(() => import("./pages/QuestionBankManagement").then((module) => ({ default: module.QuestionBankManagement })));
const QuestionBankList = lazyPage(() => import("./pages/QuestionBankList"));
const QuestionDetail = lazyPage(() => import("./pages/QuestionDetail"));
const FeedbackManagement = lazyPage(() => import("./pages/FeedbackManagement").then((module) => ({ default: module.FeedbackManagement })));
const QuestionEditor = lazyPage(() => import("./pages/QuestionEditor"));
const StudentPortal = lazyPage(() => import("./pages/StudentPortal"));
const AnnouncementManagement = lazyPage(() => import("./pages/AnnouncementManagement").then((module) => ({ default: module.AnnouncementManagement })));
const AdminCalendarManagement = lazyPage(() => import("./pages/AdminCalendarManagement").then((module) => ({ default: module.AdminCalendarManagement })));
const CrawlerManagement = lazyPage(() => import("./pages/CrawlerManagement").then((module) => ({ default: module.CrawlerManagement })));
const BannerManagement = lazyPage(() => import("./pages/BannerManagement"));
const ExamDownloader = lazyPage(() => import("./pages/ExamDownloader"));
const GraduateExamBrowser = lazyPage(() => import("./pages/GraduateExamBrowser"));
const PdfEditor = lazyPage(() => import("./pages/PdfEditor"));
const GaodianPublicExam = lazyPage(() => import("./pages/GaodianPublicExam"));
const GaodianGraduateExam = lazyPage(() => import("./pages/GaodianGraduateExam"));
const IbrainPackages = lazyPage(() => import("./pages/IbrainPackages"));
const IbrainQuestionReview = lazyPage(() => import("./pages/IbrainQuestionReview"));
const LearningResourcesManagement = lazyPage(() => import("./pages/LearningResourcesManagement"));
const PracticeExamManagement = lazyPage(() => import("./pages/PracticeExamManagement"));
const LatexValidationReport = lazyPage(() => import("./pages/LatexValidationReport"));
const QualityReport = lazyPage(() => import("./pages/QualityReport"));
const ConversationHistory = lazyPage(() => import("./pages/ConversationHistory"));
const ExternalSearchAdmin = lazyPage(() => import("./pages/ExternalSearchAdmin"));
const WebSearchStats = lazyPage(() => import("./pages/WebSearchStats"));
const AdminCreditsManagement = lazyPage(() => import("./pages/AdminCreditsManagement"));
const CreditsHistory = lazyPage(() => import("./pages/CreditsHistory"));
const StudentRecords = lazyPage(() => import("./pages/StudentRecords"));
const BehaviorAlerts = lazyPage(() => import("./pages/BehaviorAlerts"));
const PurchaseHistory = lazyPage(() => import("./pages/PurchaseHistory"));
const AdminCreditsStats = lazyPage(() => import("./pages/AdminCreditsStats"));
const KnowledgeLearning = lazyPage(() => import("./pages/KnowledgeLearning").then((module) => ({ default: module.KnowledgeLearning })));
const GuidedLearning = lazyPage(() => import("./pages/GuidedLearning").then((module) => ({ default: module.GuidedLearning })));
const KnowledgeLearningChat = lazyPage(() => import("./pages/KnowledgeLearningChat").then((module) => ({ default: module.KnowledgeLearningChat })));
const LearningMaterialsManage = lazyPage(() => import("./pages/LearningMaterialsManage"));
const LearningMaterialEdit = lazyPage(() => import("./pages/LearningMaterialEdit"));
const LearningMaterialsList = lazyPage(() => import("./pages/LearningMaterialsList"));
const LearningMaterialView = lazyPage(() => import("./pages/LearningMaterialView"));
const TeacherMaterialLearning = lazyPage(() => import("./pages/TeacherMaterialLearning"));
const TeacherLearningZone = lazyPage(() => import("./pages/TeacherLearningZone"));
const LearningNotes = lazyPage(() => import("./pages/LearningNotes"));
const LearningNoteDetail = lazyPage(() => import("./pages/LearningNoteDetail"));
const LawLearning = lazyPage(() => import("./pages/LawLearning"));
const LawMistakes = lazyPage(() => import("./pages/LawMistakes"));
const MyBookmarks = lazyPage(() => import("./pages/MyBookmarks"));
const ChapterLearning = lazyPage(() => import("./pages/student/ChapterLearning"));
const ChapterQuiz = lazyPage(() => import("./pages/student/ChapterQuiz"));
const LearningProgress = lazyPage(() => import("./pages/student/LearningProgress"));
const QuizWrongQuestions = lazyPage(() => import("./pages/QuizWrongQuestions"));
const QuizHistory = lazyPage(() => import("./pages/QuizHistory"));
const UserManagement = lazyPage(() => import("./pages/UserManagement"));
const TeacherManagement = lazyPage(() => import("./pages/admin/TeacherManagement"));
const AdminFeatureToggles = lazyPage(() => import("./pages/AdminFeatureToggles"));
const StudentQuestions = lazyPage(() => import("./pages/admin/StudentQuestions"));
const TeacherQuestions = lazyPage(() => import("./pages/teacher/TeacherQuestions"));
const QACacheManagement = lazyPage(() => import("./pages/QACacheManagement"));
const TokenStatsPage = lazyPage(() => import("./pages/TokenStatsPage"));
const QACacheSettings = lazyPage(() => import("./pages/QACacheSettings"));
const QARecordsManagement = lazyPage(() => import("./pages/QARecordsManagement"));
const FrequentQuestions = lazyPage(() => import("./pages/FrequentQuestions"));
const EssayPractice = lazyPage(() => import("./pages/EssayPractice"));
const LectureMaterialsManagement = lazyPage(() => import("./pages/LectureMaterialsManagement"));
const MaterialContentView = lazyPage(() => import("./pages/MaterialContentView"));
const MaterialConversationManagement = lazyPage(() => import("./pages/MaterialConversationManagement"));
const EssayAnswer = lazyPage(() => import("./pages/EssayAnswer"));
const EssayHistory = lazyPage(() => import("./pages/EssayHistory"));
const EssayHistoryDetail = lazyPage(() => import("./pages/EssayHistoryDetail"));
const EssayManagement = lazyPage(() => import("./pages/EssayManagement"));
const AdminApiKeys = lazyPage(() => import("./pages/AdminApiKeys"));
const Notes = lazyPage(() => import("./pages/Notes"));
const AuditoryHall = lazyPage(() => import("./pages/AuditoryHall"));
const AdminAuditoryHall = lazyPage(() => import("./pages/AdminAuditoryHall"));
const ClassStudentVerify = lazyPage(() => import("./pages/ClassStudentVerify"));
const AdminConversationLogs = lazyPage(() => import("./pages/AdminConversationLogs"));
const BannedUsers = lazyPage(() => import("./pages/BannedUsers"));
const CreditRulesAdmin = lazyPage(() => import("./pages/admin/CreditRulesAdmin"));
const AdminAiQuestionBank = lazyPage(() => import("./pages/AdminAiQuestionBank"));
const AdminAiSettings = lazyPage(() => import("./pages/AdminAiSettings"));
const AiQuestionPractice = lazyPage(() => import("./pages/AiQuestionPractice"));
const SourceQuestionEditor = lazyPage(() => import("./pages/SourceQuestionEditor"));
const AdminSmartBooks = lazyPage(() => import("./pages/AdminSmartBooks"));
const AdminQAManager = lazyPage(() => import("./pages/AdminQAManager"));
const AdminQuizManager = lazyPage(() => import("./pages/AdminQuizManager"));
const AdminSmartBookVerifications = lazyPage(() => import("./pages/AdminSmartBookVerifications"));
const AdminSmartBookQuizStats = lazyPage(() => import("./pages/AdminSmartBookQuizStats"));
const AdminSmartBookUnitQA = lazyPage(() => import("./pages/AdminSmartBookUnitQA"));
const AdminLessonPointEdit = lazyPage(() => import("./pages/AdminLessonPointEdit"));
const SmartBooks = lazyPage(() => import("./features/smartbook/SmartBooksRoute"));
const AccountingAssistant = lazyPage(() => import("./pages/AccountingAssistant"));
const VideoCourse = lazyPage(() => import("./pages/VideoCourse"));
const AdminVideoCourse = lazyPage(() => import("./pages/AdminVideoCourse"));
const AdminStudentLearningHistory = lazyPage(() => import("./pages/AdminStudentLearningHistory"));
const StudentLearningHistory = lazyPage(() => import("./pages/StudentLearningHistory"));
const AdminSmartBookExamSets = lazyPage(() => import("./pages/AdminSmartBookExamSets"));
const TutorHome = lazyPage(() => import("./pages/TutorHome"));
const TutorChat = lazyPage(() => import("./features/tutor-chat/TutorChatRoute"));
const AdminTutorSubjects = lazyPage(() => import("./pages/AdminTutorSubjects"));
const AdminTutorChatRecords = lazyPage(() => import("./pages/AdminTutorChatRecords"));
const AdminAIClassroom = lazyPage(() => import("./pages/AdminAIClassroom"));
const AdminSuggestionQuestions = lazyPage(() => import("./pages/AdminSuggestionQuestions"));
const MyNotes = lazyPage(() => import("./pages/MyNotes"));
const AdminWatermarkSettings = lazyPage(() => import("./pages/AdminWatermarkSettings"));
const AdminVoucherRecords = lazyPage(() => import("./pages/AdminVoucherRecords"));
const AdminMemberIdentity = lazyPage(() => import("./pages/AdminMemberIdentity"));
const Login = lazyPage(() => import("./pages/Login"));

function Router() {
  return (
    <React.Suspense fallback={null}>
      <Switch>
        <Route path={"/"} component={TutorHome} />
        <Route path="/login" component={Login} />
        <Route path="/home-old" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/chat/:id" component={Chat} />
        <Route path="/practice" component={Practice} />
        <Route path="/stats" component={Stats} />
        <Route path="/admin/questions" component={AdminQuestions} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/question-management" component={AdminQuestionManagement} />
      <Route path="/admin/exam-questions" component={ExamQuestions} />
      <Route path="/admin/knowledge-base" component={KnowledgeBase} />
      <Route path="/admin/pdf-categories" component={AdminPdfCategories} />
      <Route path="/pdf/:id" component={PdfReader} />
      <Route path="/admin/question-bank" component={QuestionBankManagement} />
      <Route path="/questions" component={QuestionBankList} />
      <Route path="/question/:id" component={QuestionDetail} />
      <Route path="/admin/feedback" component={FeedbackManagement} />
      <Route path="/admin/checklist-reports" component={AdminChecklistReports} />
      <Route path="/admin/question-editor/:pdfId" component={QuestionEditor} />
      <Route path="/admin/source-editor/:sourceId" component={SourceQuestionEditor} />
      <Route path="/student" component={StudentPortal} />
      <Route path="/student/exam" component={ExamPractice} />
      <Route path="/student/purchase-history" component={PurchaseHistory} />
      <Route path="/student/stats" component={LearningStats} />
      <Route path="/student/wrong-questions" component={WrongQuestions} />
      <Route path="/student/conversation-history" component={ConversationHistory} />
      <Route path="/student/knowledge-learning" component={KnowledgeLearning} />
      <Route path="/student/law-learning" component={LawLearning} />
      <Route path="/student/law-mistakes" component={LawMistakes} />
      <Route path="/student/my-bookmarks" component={MyBookmarks} />
      <Route path="/student/guided-learning/:id" component={GuidedLearning} />
      <Route path="/student/knowledge-learning/guided/:id" component={GuidedLearning} />
      <Route path="/student/knowledge-learning/chapter/:categoryId/:chapterIndex/:chapterTitle" component={ChapterLearning} />
      <Route path="/student/knowledge-learning/quiz/:categoryId/:chapterIndex/:chapterTitle" component={ChapterQuiz} />
      <Route path="/student/learning-progress" component={LearningProgress} />
      <Route path="/student/quiz-wrong-questions" component={QuizWrongQuestions} />
      <Route path="/student/quiz-history" component={QuizHistory} />
      <Route path="/student/knowledge-learning/:categoryId" component={KnowledgeLearningChat} />
      <Route path="/admin/announcements" component={AnnouncementManagement} />
      <Route path="/admin/calendar" component={AdminCalendarManagement} />
      <Route path="/admin/banners" component={BannerManagement} />
      <Route path="/admin/crawler" component={CrawlerManagement} />
      <Route path="/admin/exam-downloader" component={ExamDownloader} />
      <Route path="/graduate-exam" component={GraduateExamBrowser} />
      <Route path="/pdf-editor" component={PdfEditor} />
      <Route path="/gaodian-public" component={GaodianPublicExam} />
      <Route path="/gaodian-graduate" component={GaodianGraduateExam} />
      <Route path="/admin/ibrain-packages" component={IbrainPackages} />
      <Route path="/admin/ibrain-question-review" component={IbrainQuestionReview} />
      <Route path="/admin/learning-resources" component={LearningResourcesManagement} />
      <Route path="/admin/practice-exams" component={PracticeExamManagement} />
      <Route path="/admin/latex-validation" component={LatexValidationReport} />
      <Route path="/admin/quality-report" component={QualityReport} />
      <Route path="/admin/external-search" component={ExternalSearchAdmin} />
      <Route path="/admin/web-search-stats" component={WebSearchStats} />
      <Route path="/admin/credits" component={AdminCreditsManagement} />
      <Route path="/admin/credit-rules" component={CreditRulesAdmin} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/teachers" component={TeacherManagement} />
      <Route path="/admin/feature-toggles" component={AdminFeatureToggles} />
      <Route path="/admin/ai-settings" component={AdminAiSettings} />
      <Route path="/admin/api-keys" component={AdminApiKeys} />
      <Route path="/admin/student-questions" component={StudentQuestions} />
      <Route path="/teacher/questions" component={TeacherQuestions} />
      <Route path="/credits-history" component={CreditsHistory} />
      <Route path="/admin/credits-history" component={CreditsHistory} />
      <Route path="/admin/student-records" component={StudentRecords} />
      <Route path="/admin/behavior-alerts" component={BehaviorAlerts} />
      <Route path="/admin/credits-stats" component={AdminCreditsStats} />
      <Route path="/admin/learning-materials" component={LearningMaterialsManage} />
      <Route path="/admin/learning-materials/:id/edit" component={LearningMaterialEdit} />
      <Route path="/admin/qa-cache" component={QACacheManagement} />
      <Route path="/admin/essay-management" component={EssayManagement} />
      <Route path="/admin/token-stats" component={TokenStatsPage} />
      <Route path="/admin/qa-cache-settings" component={QACacheSettings} />
      <Route path="/admin/qa-records" component={QARecordsManagement} />
      <Route path="/admin/lecture-materials" component={LectureMaterialsManagement} />
      <Route path="/admin/material-content/:id" component={MaterialContentView} />
      <Route path="/admin/material-conversations" component={MaterialConversationManagement} />
      <Route path="/material-conversation-management" component={MaterialConversationManagement} />
      <Route path="/frequent-questions" component={FrequentQuestions} />
      <Route path="/essay-practice" component={EssayPractice} />
      <Route path="/essay-answer/:id" component={EssayAnswer} />
      <Route path="/essay-history" component={EssayHistory} />
      <Route path="/essay-history/:id" component={EssayHistoryDetail} />
      <Route path="/student/learning-materials" component={LearningMaterialsList} />
      <Route path="/student/learning-notes" component={LearningNotes} />
      <Route path="/student/learning-notes/:id" component={LearningNoteDetail} />
      <Route path="/learning/:id" component={LearningMaterialView} />
      <Route path="/teacher-material-learning" component={TeacherMaterialLearning} />
      <Route path="/teacher-learning-zone/:teacherId" component={TeacherLearningZone} />
      <Route path="/class-student-verify" component={ClassStudentVerify} />

      <Route path="/wrong-questions" component={WrongQuestions} />
      <Route path="/notes" component={Notes} />
      <Route path="/auditory-hall" component={AuditoryHall} />
      <Route path="/admin/auditory-hall" component={AdminAuditoryHall} />
      <Route path="/admin/ai-question-bank" component={AdminAiQuestionBank} />
      <Route path="/ai-question-practice" component={AiQuestionPractice} />
      <Route path="/admin/smart-books/:bookId/qa" component={AdminQAManager} />
      <Route path="/admin/smart-books/:bookId/quiz" component={AdminQuizManager} />
      <Route path="/admin/smart-books" component={AdminSmartBooks} />
      <Route path="/admin/smart-book-quiz-stats" component={AdminSmartBookQuizStats} />
      <Route path="/admin/smart-book-verifications" component={AdminSmartBookVerifications} />
      <Route path="/admin/smart-book-unit-qa" component={AdminSmartBookUnitQA} />
      <Route path="/admin/smart-book-unit-qa/:bookId" component={AdminSmartBookUnitQA} />
      <Route path="/admin/lesson-point-edit/:bookId/:lessonPointId" component={AdminLessonPointEdit} />
      <Route path="/admin/lesson-point-new/:bookId" component={AdminLessonPointEdit} />
      <Route path="/admin/smart-book-exam-sets/:bookId" component={AdminSmartBookExamSets} />
      <Route path="/smart-books" component={SmartBooks} />
      <Route path="/accounting-assistant" component={AccountingAssistant} />
      <Route path="/video-course" component={VideoCourse} />
      <Route path="/video-course/:courseId" component={VideoCourse} />
      <Route path="/admin/video-course" component={AdminVideoCourse} />
      <Route path="/admin/conversation-logs" component={AdminConversationLogs} />
      <Route path="/admin/banned-users" component={BannedUsers} />
      <Route path="/admin/student-learning-history" component={AdminStudentLearningHistory} />
      <Route path="/student/learning-history" component={StudentLearningHistory} />
      <Route path="/tutor" component={TutorHome} />
      <Route path="/tutor/chat/:bookId" component={TutorChat} />
      <Route path="/admin/tutor-subjects" component={AdminTutorSubjects} />
      <Route path="/admin/tutor-chat-records" component={AdminTutorChatRecords} />
      <Route path="/admin/ai-classroom" component={AdminAIClassroom} />
      <Route path="/admin/suggestion-questions" component={AdminSuggestionQuestions} />
      <Route path="/admin/watermark-settings" component={AdminWatermarkSettings} />
      <Route path="/admin/voucher-records" component={AdminVoucherRecords} />
      <Route path="/admin/member-identity" component={AdminMemberIdentity} />
      <Route path="/my-notes" component={MyNotes} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </React.Suspense>
  );
}

// 全站學生存取守衛：非管理員用戶在系統關閉時顯示維護頁面
function StudentAccessGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [location] = useLocation();
  const { data: accessData, isLoading: accessLoading } = trpc.featureToggles.getStudentAccess.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 秒快取
  });

  // 管理員不受限制
  const isAdmin = user?.role === 'admin';
  // 管理員路由不受限制
  const isAdminRoute = location.startsWith('/admin') || location.startsWith('/teacher');
  // 登入路由不受限制，避免維護頁面阻擋登入
  const isLoginRoute = location === '/login' || location.startsWith('/login/');

  if (authLoading || accessLoading) return <>{children}</>;

  // 系統已關閉，且非管理員、非管理員路由、非登入路由
  if (!isAdmin && !isAdminRoute && !isLoginRoute && accessData?.enabled === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">系統尚未開放</h1>
          <p className="text-gray-600 text-lg mb-2">iBrain 智匯目前正在準備中</p>
          <p className="text-gray-500">系統即將開放，敬請期待！</p>
          <div className="mt-8 p-4 bg-white/60 rounded-xl border border-blue-200">
            <p className="text-sm text-gray-500">如有問題，請聯繫管理員</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppContent() {
  const [location] = useLocation();
  const { user, loading } = useAuth();
  // 首次登入彈窗已停用，直接進入首頁
  const [showWelcomeModal] = useState(false);

  // Chat 頁面自帶整合導覽列，隱藏全站 Navbar
  const isChatPage = location === '/chat' || location.startsWith('/chat/');
  // TutorChat 頁面自帶 h-screen 佈局，不需要外層包裹
  const isTutorChatPage = location.startsWith('/tutor/chat/');
  // VideoCourse 頁面自帶全屏佈局，需要 Navbar 但不需要 overflow-y-auto 包裹
  const isVideoCoursePage = location === '/video-course' || location.startsWith('/video-course/');
  // SmartBooks 頁面自己管理內部滾動，外層不需要 overflow-y-auto
  const isSmartBooksPage = location === '/smart-books' || location.startsWith('/smart-books/');
  // LearningMaterialView 自帶 h-screen 全屏佈局，不需要 Navbar 也不需要 overflow-y-auto
  const isLearningPage = location.startsWith('/learning/');
  const isLoginPage = location === '/login' || location.startsWith('/login/');
  // 後台頁面統一加入 AdminNavbar（漢堡選單）
  const isAdminPage = location === '/admin' || location.startsWith('/admin/');
  // 處理非登入狀態訪問管理後台之重新導向
  const isAdminRoute = location.startsWith('/admin') || location.startsWith('/teacher');
  useEffect(() => {
    if (!loading && !user && isAdminRoute) {
      window.location.href = '/login';
    }
  }, [loading, user, isAdminRoute]);

  // 身分選擇對話框：已登入且尚未設定身分時顯示
  const showIdentityModal = !!(user && (user as any).identityType === 'unset' && !isAdminPage);
  return (
    <StudentAccessGuard>
      {/* 身分選擇對話框 */}
      {showIdentityModal && <IdentitySelectionModal open={showIdentityModal} onClose={() => {}} />}
      {/* 全域金幣飛走動畫，Portal 到 body，不受頁面切換影響 */}
      <CoinAnimation />
      {isLoginPage ? (
        <Router />
      ) : isChatPage ? (
        <Router />
      ) : isTutorChatPage ? (
        // TutorChat 自帶 h-screen 佈局，不需要外層 overflow 包裹
        <Router />
      ) : isLearningPage ? (
        // LearningMaterialView 自帶 position:fixed 全屏佈局，不需要外層包裹
        <Router />
      ) : isVideoCoursePage ? (
        <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
          <Navbar />
          <div className="flex-1 min-h-0" style={{ overflow: 'hidden' }}>
            <Router />
          </div>
        </div>
      ) : isSmartBooksPage ? (
        <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
          <Navbar />
          <div className="flex-1 min-h-0" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
            <Router />
          </div>
        </div>
      ) : (
        <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
          <Navbar />
          {isAdminPage && <AdminNavbar />}
          <div className="flex-1 min-h-0" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
            <Router />
          </div>
        </div>
      )}
    </StudentAccessGuard>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <LowCreditsAlert />
          <WarningAlert />
          <ChecklistWidget />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
