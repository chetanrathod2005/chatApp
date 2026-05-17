

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../axios.js";
import toast from "react-hot-toast";
import PremiumBackground from "../ui/PremiumBackground.jsx";

const Signup = () => {
  const [user, setUser] = useState({
    fullName: "", userName: "", password: "", confirmPassword: "", gender: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (key, value) => setUser((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (user.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (user.password !== user.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (!user.gender) { toast.error("Please select a gender"); return; }
    try {
      setLoading(true);
      const res = await api.post("/user/register", user, { withCredentials: true });
      if (res.status === 201) {
        toast.success("Account created successfully!");
        navigate("/login");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-jetbrains  w-full bg-white flex items-center justify-center px-4 relative overflow-hidden">
      <PremiumBackground/>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          {/* <div className="w-16 h-16 bg-[#00a884] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="https://www.freepik.com/premium-vector/chat-app-logo-design-template-can-be-used-icon-chat-application-logo_36949664.htm"></path>
              </svg>
          </div> */}
          <h1 className="text-2xl font-bold text-[#111827]">Create Account</h1>
          <p className="text-[#6b7280] mt-1 text-sm">Join Chat App today</p>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-2xl">
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={user.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#f9fafb] text-[#111827] placeholder-[#9ca3af] border border-[#e5e7eb] border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-black transition"
              required
            />
            <input
              type="text"
              placeholder="Username"
              value={user.userName}
              onChange={(e) => handleChange("userName", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#f9fafb] text-[#111827] placeholder-[#9ca3af] border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-black transition"
              required
            />
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              value={user.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className={`w-full px-4 py-3 rounded-xl bg-[#f9fafb] text-[#111827] placeholder-[#9ca3af] border border-[#e5e7eb] focus:outline-none focus:ring-2 transition ${
                user.password && user.password.length < 8
                  ? "bg-red-900/30 ring-2 ring-red-500"
                  : "bg-[#2a3942] focus:ring-black"
              }`}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={user.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className={`w-full px-4 py-3 rounded-xl bg-[#f9fafb] text-[#111827] placeholder-[#9ca3af] border border-[#e5e7eb] focus:outline-none focus:ring-2 transition ${
                user.confirmPassword && user.password !== user.confirmPassword
                  ? "bg-red-50 border border-red-400"
                  : "bg-[#2a3942] focus:ring-black"
              }`}
              required
            />

            <div>
              <p className="text-[#6b7280] text-xs mb-2 uppercase tracking-wider">Gender</p>
              <div className="flex gap-3">
                {["male", "female"].map((g) => (
                  <button
                    type="button" key={g}
                    onClick={() => handleChange("gender", g)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      user.gender === g
                        ? "bg-black text-white"
                        : "bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]"
                    }`}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-black hover:bg-[#1f2937] text-white font-semibold text-base transition-all duration-200 disabled:opacity-60 mt-2"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>

            <p className="text-center text-[#6b7280] text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-black hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;

