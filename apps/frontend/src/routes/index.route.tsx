// Import everything from react-router-dom
import SignIn from "../components/auth/SignIn";
import SignUp from "../components/auth/SignUp";
import HomePage from "../components/home/HomePage";
import DocumentEditor from "../components/editor/DocumentEditor";
import { Route, BrowserRouter, Routes } from "react-router-dom";

export default function AppRoutes() {
  // TODO: Implement actual auth state management
  const isAuthenticated = false;

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
}
