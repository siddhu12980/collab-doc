import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, LogInIcon } from "lucide-react";
import axios from "axios";

const baseURL = "http://localhost:3000";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${baseURL}/auth/signin`,
        { email, password },
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );

      if (res.status === 200) {
        console.log("Sign in successful", res.data);
        const token = res.data.token;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        navigate("/home");
      } else {
        console.error("Sign in failed:", res.data.message);
      }
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <LogIn className="mx-auto h-12 w-12 text-blue-500" />
          <h2 className="mt-6 text-3xl font-bold text-white">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-300"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 mt-1 border border-gray-700 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email address"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 mt-1 border border-gray-700 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in
          </button>

          <p className="text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="font-medium text-blue-500 hover:text-blue-400"
            >
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
