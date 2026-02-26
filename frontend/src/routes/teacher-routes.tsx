import { RouteObject } from "react-router-dom";
import TeacherLayout from "@/layouts/teacher-layout";
import Dashboard from "@/pages/teacher/TeacherDashboard";
// import GenAIHomePage from "@/pages/teacher/genai-home";
import PollRoomPage from "@/pages/teacher/TeacherPollRoom";
import CreateRoomPage from "@/pages/teacher/CreatePollRoom";
import CohostInvite from "@/pages/teacher/cohostInvite";

const teacherRoutes: RouteObject = {
  path: "/teacher",
  element: <TeacherLayout />,
  children: [
    {
      path: "dashboard",
      element: <Dashboard />,
    },
    {
      index: true,
      element: <Dashboard />, // Default to Dashboard
    },
    /*{
      path: "genai",
      element: <GenAIHomePage />,
    },*/
    {
      path: "pollroom",
      element: <CreateRoomPage />,
    },
    {
      path: 'pollroom/$code',
      element: <PollRoomPage />
    },
    {
      path: 'cohost-invite/:token',
      element: <CohostInvite />
    }
  ],
};

export default teacherRoutes;
