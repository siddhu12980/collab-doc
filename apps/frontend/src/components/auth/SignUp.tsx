import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import axios from "axios";

const baseURL = "http://localhost:3000";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await axios.post(
        `${baseURL}/auth/signup`,
        {
          email,
          password,
          username,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (data.status === 200 || data.status === 201) {
        console.log("Sign up successful", data);

        const token = data.data.token;

        localStorage.setItem("token", token);
        
        localStorage.setItem("user", JSON.stringify(data.data.user));

        navigate("/home");
      }

      navigate("/home");
    } catch (error) {
      console.error("Sign up failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-blue-500" />
          <h2 className="mt-6 text-3xl font-bold text-white">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="text-sm font-medium text-gray-300"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 mt-1 border border-gray-700 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Username"
              />
            </div>
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
            Sign up
          </button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <a
              href="/signin"
              className="font-medium text-blue-500 hover:text-blue-400"
            >
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
