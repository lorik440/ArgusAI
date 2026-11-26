import { Link } from "react-router-dom";
import { EmptyState } from "../components/States.jsx";

export default function NotFoundPage() {
  return (
    <div className="page">
      <EmptyState title="Page not found">
        <Link to="/">Go to exams</Link>
      </EmptyState>
    </div>
  );
}
