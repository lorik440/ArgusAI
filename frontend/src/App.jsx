import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import EventReviewPage from "./pages/EventReviewPage.jsx";
import LiveExamPage from "./pages/LiveExamPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="exams/:examId" element={<LiveExamPage />} />
        <Route path="exams/:examId/events/:eventId" element={<EventReviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
