import SignIn from "../components/auth/SignIn";
import SignUp from "../components/auth/SignUp";
import HomePage from "../components/home/HomePage";
import DocumentEditor from "../components/editor/DocumentEditor";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import EditorDoc from "../components/editor/EditorDoc";

const AppRoutes = () => {
  // TODO: Implement actual auth state management
  let isAuthenticated = false;

  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  if (token && user) {
    isAuthenticated = true;
  }

  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <HomePage /> : <SignIn />}
          />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/doc/:id" element={<DocumentEditor />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default AppRoutes;
