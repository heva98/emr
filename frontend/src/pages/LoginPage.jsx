import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Building2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  // If already authenticated after silent refresh, redirect immediately
  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit({ username, password }) {
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Invalid username or password.";
      setError("root", { message: detail });
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-page-bg">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg">
      <div className="bg-white rounded-xl shadow-sm w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Building2 className="text-primary w-8 h-8" />
          <span className="text-primary font-bold text-2xl tracking-tight">CareEMR</span>
        </div>

        <h2 className="text-center text-gray-600 text-sm mb-6">
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errors.root && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-3 py-2.5 rounded-lg">
              {errors.root.message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              {...register("username", { required: "Username is required" })}
              type="text"
              autoComplete="username"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                {...register("password", { required: "Password is required" })}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
