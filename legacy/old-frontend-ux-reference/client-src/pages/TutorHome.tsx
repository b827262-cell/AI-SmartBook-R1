import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, GraduationCap, ChevronLeft,
  Loader2, Layers, Info, X,
} from "lucide-react";

// iBrain 書本圖示（使用用戶提供的圖案）
function BookImg({ className = "" }: { className?: string }) {
  return (
    <img
      src="/book-icon.png"
      alt="書本圖示"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

// ===== 第一層：大類科卡片列表 =====
function SubjectList({
  onSelectSubject,
}: {
  onSelectSubject: (subject: { id: number; name: string; iconEmoji: string | null }) => void;
}) {
  const { user } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showCreditRules, setShowCreditRules] = useState(false);
  const [, navigate] = useLocation();

  const { data: subjects = [], isLoading: subjectsLoading } = trpc.tutorPublic.getSubjects.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: searchResults = [], isLoading: searchLoading } = trpc.tutorPublic.searchBooks.useQuery(
    { keyword: searchKeyword },
    { enabled: !!user && searchKeyword.trim().length > 0 }
  );

  return (
    <div className="min-h-screen bg-white">
      {/* 頂部 Hero */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">iBrain AI 助教</h1>
          </div>
          <div className="flex items-center gap-2 ml-12 mb-5">
            <p className="text-muted-foreground text-sm">
              智能搜尋書本及講義內容，精準回答問題。
            </p>
            <button
              onClick={() => setShowCreditRules(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 border border-primary/30 rounded-full px-2 py-0.5 hover:bg-primary/5 transition-colors"
            >
              <Info className="w-3 h-3" />
              扣點規則
            </button>
          </div>

          {/* 扣點規則說明對話框 */}
          {showCreditRules && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreditRules(false)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base text-foreground">點數扣點規則</h3>
                  <button onClick={() => setShowCreditRules(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="font-semibold text-foreground mb-2">🤖 智能問答</p>
                    <div className="space-y-1 text-muted-foreground">
                      <p>• 簡答（快）：<span className="text-green-600 font-medium">免費</span></p>
                      <p>• 詳解（完整）：<span className="text-orange-500 font-medium">-1 點</span></p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="font-semibold text-foreground mb-2">📚 智能課堂</p>
                    <p className="text-muted-foreground">• 每次提問：<span className="text-orange-500 font-medium">-1 點</span></p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="font-semibold text-foreground mb-2">📖 智能書本</p>
                    <p className="text-muted-foreground">• 每次提問：<span className="text-orange-500 font-medium">-1 點</span></p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="font-semibold text-foreground mb-2">🎧 智能函授 / 其他功能</p>
                    <p className="text-muted-foreground">• 每次提問：<span className="text-orange-500 font-medium">-1 點</span></p>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">💡 每日登入可獲得免費點數，購書憑證可額外獲得贈點。</p>
                </div>
              </div>
            </div>
          )}
          {/* 搜尋欄 */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10 h-10 text-sm rounded-lg border-gray-200 bg-white"
              placeholder="搜尋科目、老師名稱..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {searchKeyword.trim() ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                搜尋「<span className="text-foreground font-medium">{searchKeyword}</span>」，共 {searchResults.length} 本
              </p>
              <Button variant="ghost" size="sm" onClick={() => setSearchKeyword("")}>清除</Button>
            </div>
            {searchResults.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookImg className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p>找不到相關書本</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {searchResults.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => navigate(`/tutor/chat/${book.id}`)}
                    className="group flex flex-col items-center"
                  >
                    <div className="w-full aspect-square rounded-2xl border-2 border-gray-200 bg-white group-hover:border-primary/50 group-hover:shadow-md transition-all group-hover:-translate-y-0.5 flex items-center justify-center p-4">
                      {book.coverImageUrl ? (
                        <img src={book.coverImageUrl} alt={book.title ?? ''} className="w-full h-full object-contain rounded-xl" />
                      ) : (
                        <BookImg className="w-full h-full" />
                      )}
                    </div>
                    <div className="mt-2 w-full text-center">
                      <p className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">{book.title}</p>
                      {book.author && <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {subjectsLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookImg className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p>目前沒有可用的類科</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => onSelectSubject(subject)}
                    className="group flex flex-col items-center"
                  >
                    {/* 卡片：正方形、有邊框、書本圖示置中 */}
                    <div className="w-full aspect-square rounded-2xl border-2 border-gray-200 bg-white group-hover:border-primary/50 group-hover:shadow-md transition-all group-hover:-translate-y-0.5 flex items-center justify-center p-5">
                      <BookImg className="w-full h-full" />
                    </div>
                    {/* 文字置中 */}
                    <div className="mt-2 w-full text-center">
                      <p className="font-bold text-sm text-foreground leading-snug line-clamp-2">{subject.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== 第二層：老師大卡片（點擊直接進入問答） =====
function TeacherList({
  subject,
  onBack,
}: {
  subject: { id: number; name: string; iconEmoji: string | null };
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { data, isLoading } = trpc.tutorPublic.getSubjectWithTeachers.useQuery(
    { subjectId: subject.id },
    { enabled: !!user }
  );
  const [, navigate] = useLocation();

  const teachers = data?.teachers ?? [];

  return (
    <div className="min-h-screen bg-white">
      {/* 頂部 */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            返回
          </button>
          <div className="flex items-center gap-3">
            <BookImg className="w-7 h-7" />
            <h1 className="text-xl font-bold text-foreground">{subject.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* 老師卡片 */}
            {teachers.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {teachers.map((teacher: any) => {
                  const bookIds = teacher.books.map((b: any) => b.id);
                  const handleClick = () => {
                    const params = new URLSearchParams({
                      subjectName: subject.name,
                      label: teacher.name,
                      subjectId: String(subject.id),
                    });
                    if (bookIds.length > 1) {
                      params.set('multiIds', bookIds.join(','));
                    }
                    navigate(`/tutor/chat/${bookIds[0]}?${params.toString()}`);
                  };
                  return (
                    <button
                      key={teacher.name}
                      onClick={handleClick}
                      className="group flex flex-col items-center"
                    >
                      <div className="w-full aspect-square rounded-2xl border-2 border-gray-200 bg-white group-hover:border-primary/50 group-hover:shadow-md transition-all group-hover:-translate-y-0.5 flex items-center justify-center p-5">
                        {teacher.coverImageUrl ? (
                          <img src={teacher.coverImageUrl} alt={teacher.name} className="w-full h-full object-contain rounded-xl" />
                        ) : (
                          <BookImg className="w-full h-full" />
                        )}
                      </div>
                      <div className="mt-2 w-full text-center">
                        <p className="font-bold text-sm text-foreground leading-snug">{teacher.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{subject.name}</p>
                      </div>
                    </button>
                  );
                })}

                {/* 綜合問答卡片（多老師時） */}
                {teachers.length > 1 && (
                  <button
                    onClick={() => {
                      const allBookIds = teachers.flatMap((t: any) => t.books.map((b: any) => b.id));
                      navigate(`/tutor/chat/${allBookIds[0]}?multiIds=${allBookIds.join(',')}&label=${encodeURIComponent(subject.name + ' 綜合問答')}&subjectName=${encodeURIComponent(subject.name)}&subjectId=${subject.id}`);
                    }}
                    className="group flex flex-col items-center"
                  >
                    <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-white group-hover:border-primary/50 group-hover:shadow-md transition-all group-hover:-translate-y-0.5 flex items-center justify-center p-5">
                      <Layers className="w-10 h-10 text-gray-300 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="mt-2 w-full text-center">
                      <p className="font-bold text-sm text-foreground">綜合問答</p>
                      <p className="text-xs text-muted-foreground mt-0.5">跨老師知識整合</p>
                    </div>
                  </button>
                )}
              </div>
            )}


          </>
        )}
      </div>
    </div>
  );
}

// ===== 主頁面 =====
export default function TutorHome() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedSubject, setSelectedSubject] = useState<{ id: number; name: string; iconEmoji: string | null } | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-6 px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">iBrain AI 助教</h1>
          <p className="text-muted-foreground mb-6">精準搜尋講義頁碼，讓學習更有效率</p>
          <Button size="lg" onClick={() => navigate("/login")}>登入開始使用</Button>
        </div>
      </div>
    );
  }

  if (selectedSubject) {
    return (
      <TeacherList
        subject={selectedSubject}
        onBack={() => setSelectedSubject(null)}
      />
    );
  }

  return <SubjectList onSelectSubject={setSelectedSubject} />;
}
