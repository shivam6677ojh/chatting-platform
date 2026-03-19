import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthForm from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (event) => {
    setValues((prev) => ({ ...prev, [event.target.name]: event.target.value }));
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
    />
  );
}
