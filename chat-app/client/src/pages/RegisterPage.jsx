import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import AuthForm from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const localSignupEnabled = import.meta.env.VITE_ALLOW_LOCAL_SIGNUP !== "false";
  const googleConfigured = Boolean(googleClientId);
  const blockedByMissingGoogle = !localSignupEnabled && !googleConfigured;

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

    if (blockedByMissingGoogle) {
      setError(
        "Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in client/.env and GOOGLE_CLIENT_ID in server/.env, then restart both apps."
      );
      return;
    }

    if (!localSignupEnabled) {
      setError("Local signup is disabled. Continue with Google Sign-In.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await register(values);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Create Account"
      subtitle={
        blockedByMissingGoogle
          ? "Google Sign-In is required, but it is not configured yet."
          : localSignupEnabled
          ? "Use Google Sign-In or create a local account."
          : "Use Google Sign-In to create a verified account."
      }
      fields={
        localSignupEnabled
          ? [
              {
                name: "name",
                label: "Display Name",
                type: "text",
                autoComplete: "name",
                placeholder: "Your name",
              },
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
                autoComplete: "new-password",
                placeholder: "At least 6 characters",
              },
            ]
          : []
      }
      values={values}
      onChange={onChange}
      onSubmit={onSubmit}
      error={error}
      submitLabel={
        blockedByMissingGoogle
          ? "Google Sign-In not configured"
          : localSignupEnabled
          ? "Register"
          : "Use Google Sign-In"
      }
      submitDisabled={blockedByMissingGoogle}
      footerText="Already registered?"
      footerLink="/login"
      footerLinkLabel="Sign in"
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
