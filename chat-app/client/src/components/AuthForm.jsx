import { Link } from "react-router-dom";

export default function AuthForm({
  title,
  subtitle,
  fields,
  values,
  onChange,
  onSubmit,
  error,
  submitLabel,
  footerText,
  footerLink,
  footerLinkLabel,
  loading,
}) {
  return (
    <section className="auth-shell">
      <div className="auth-card fade-rise">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <form onSubmit={onSubmit} className="auth-form">
          {fields.map((field) => (
            <label key={field.name} className="field">
              <span>{field.label}</span>
              <input
                type={field.type}
                name={field.name}
                value={values[field.name]}
                onChange={onChange}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                required
              />
            </label>
          ))}
          {error && <div className="error-box">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : submitLabel}
          </button>
        </form>
        <p className="auth-foot">
          {footerText} <Link to={footerLink}>{footerLinkLabel}</Link>
        </p>
      </div>
    </section>
  );
}
