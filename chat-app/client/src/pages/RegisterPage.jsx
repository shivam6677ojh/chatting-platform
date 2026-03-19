import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthForm from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
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
      subtitle="Start chatting instantly with secure authentication."
      fields={[
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
      ]}
      values={values}
      onChange={onChange}
      onSubmit={onSubmit}
      error={error}
      submitLabel="Register"
      footerText="Already registered?"
      footerLink="/login"
      footerLinkLabel="Sign in"
      loading={loading}
    />
  );
}
