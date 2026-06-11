import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, Target, Award, Clock } from "lucide-react";
import { useLocation } from "wouter";

export default function LearningStats() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto py-12 px-4">
        {/* 標題區域 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">學習統計</h1>
            <p className="text-muted-foreground">
              查看你的學習進度和成績趨勢
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setLocation("/student")} title="返回學員專區">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* 統計卡片 */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                總練習次數
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                尚未開始練習
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="w-4 h-4" />
                平均正確率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">--</div>
              <p className="text-xs text-muted-foreground mt-1">
                開始練習後顯示
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                累計題數
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                題目
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                學習時長
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                小時
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 趨勢圖區域 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>學習趨勢</CardTitle>
            <CardDescription>
              過去 30 天的學習進度和正確率變化
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>開始練習後，這裡會顯示你的學習趨勢圖表</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 科目分析 */}
        <Card>
          <CardHeader>
            <CardTitle>科目分析</CardTitle>
            <CardDescription>
              各科目的練習次數和正確率統計
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["法律", "政治", "經濟", "管理", "會計"].map((subject) => (
                <div key={subject} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{subject}</div>
                    <div className="text-sm text-muted-foreground">尚未練習</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">正確率</div>
                    <div className="font-bold">--</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
