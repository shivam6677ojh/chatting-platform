import { Link } from "react-router-dom";

const defaultFeatures = [
  {
    icon: "⚡",
    title: "Real-time messaging",
    description: "Instant delivery and live typing updates across all devices.",
  },
  {
    icon: "🔒",
    title: "End-to-end encryption",
    description: "Private conversations secured from sender to receiver.",
  },
  {
    icon: "👥",
    title: "Group chats",
    description: "Collaborate in team spaces with smooth participant management.",
  },
  {
    icon: "📞",
    title: "Voice/video calls",
    description: "Switch from text to high-quality calls in one tap.",
  },
];

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
  submitDisabled,
  googleSection,
  features = defaultFeatures,
}) {
  return (
    <section className="auth-shell">
      <div className="auth-layout fade-rise">
        <aside className="auth-hero">
          <p className="auth-kicker">ChatSphere</p>
          <h2>Connect. Chat. Collaborate. Instantly.</h2>
          <p className="auth-hero-copy">
            Real-time communication built for modern teams, communities, and friends.
          </p>

          <h3 className="features-title">Key Features</h3>
          <div className="feature-grid" aria-label="Key Features">
            {features.map((feature) => (
              <article key={feature.title} className="feature-card">
                <span className="feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>

        <div className="auth-card">
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
            <button type="submit" disabled={loading || submitDisabled}>
              {loading ? "Please wait..." : submitLabel}
            </button>
            {googleSection ? (
              <>
                <div className="auth-divider" aria-hidden="true">
                  <span>or</span>
                </div>
                <div className="google-auth-wrap">{googleSection}</div>
              </>
            ) : null}
          </form>
          <p className="auth-foot">
            {footerText} <Link to={footerLink}>{footerLinkLabel}</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
