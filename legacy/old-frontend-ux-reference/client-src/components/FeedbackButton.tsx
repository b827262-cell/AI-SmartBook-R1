/**
 * 浮動回饋按鈕
 * 固定在右下角，點擊後彈出回饋表單
 */

import { useState } from "react";
import { Button } from "./ui/button";
import { MessageSquare } from "lucide-react";
import { FeedbackDialog } from "./FeedbackDialog";

export function FeedbackButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
        onClick={() => setIsDialogOpen(true)}
        title="問題意見回饋"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      <FeedbackDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
