import { Link, useParams } from "react-router-dom";
import { ChatPanel } from "../components/ChatPanel";

export function ChatPage() {
  const { bookId = "" } = useParams();
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        <Link className="back-link" to={`/books/${bookId}/read`}>
          ← 返回閱讀
        </Link>
      </div>
      <ChatPanel bookId={bookId} />
    </div>
  );
}
