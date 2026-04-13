import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import AuthForm from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const localSignupEnabled = import.meta.env.VITE_ALLOW_LOCAL_SIGNUP !== "false";
  const googleConfigured = Boolean(googleClientId);

  const onChange = (event) => {
    setValues((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse.credential) {
      setError("Google sign-in did not return a credential");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleError = () => {
    setError("Unable to continue with Google sign-in");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(values);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Welcome Back"
      subtitle="Sign in to continue your real-time conversations."
      fields={[
        {
          name: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
          placeholder: "name@example.com",
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          autoComplete: "current-password",
          placeholder: "Your password",
        },
      ]}
      values={values}
      onChange={onChange}
      onSubmit={onSubmit}
      error={error}
      submitLabel="Login"
      footerText="No account yet?"
      footerLink="/register"
      footerLinkLabel="Create one"
      loading={loading}
      googleSection={
        googleConfigured ? (
          <GoogleLogin onSuccess={onGoogleSuccess} onError={onGoogleError} />
        ) : !localSignupEnabled ? (
          <p className="error-box">
            Missing Google OAuth client ID. Configure env vars and restart to enable Google Sign-In.
          </p>
        ) : null
      }
    />
  );
}
