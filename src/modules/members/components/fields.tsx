import "./um.css";
import type { ReactNode } from "react";

export function UmField({
  name,
  label,
  type = "text",
  value,
  error,
  placeholder,
  autoComplete,
  readOnly,
  help,
  required,
  children,
}: {
  name: string;
  label: string;
  type?: "text" | "password" | "email";
  value?: string;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  readOnly?: boolean;
  help?: string;
  required?: boolean;
  children?: ReactNode;
}) {
  const id = `${name}-um`;
  return (
    <div className={`um-field um-field-${name} um-field-type_${type}`} data-key={name}>
      <div className="um-field-label">
        <label htmlFor={id}>{label}</label>
        <div className="um-clear" />
      </div>
      <div className="um-field-area">
        {children ?? (
          <input
            className={`um-form-field${error ? " um-error" : ""}`}
            type={type}
            name={name}
            id={id}
            defaultValue={value}
            placeholder={placeholder}
            autoComplete={autoComplete ?? (type === "password" ? "current-password" : "off")}
            readOnly={readOnly}
            disabled={readOnly}
            required={required}
            aria-invalid={error ? "true" : "false"}
          />
        )}
      </div>
      {help && <div className="um-field-help">{help}</div>}
      {error && (
        <div className="um-field-error" role="alert">
          <span className="um-field-arrow" />
          {error}
        </div>
      )}
    </div>
  );
}

export function UmSelect({
  name,
  label,
  options,
  value,
  help,
}: {
  name: string;
  label: string;
  options: string[];
  value?: string;
  help?: string;
}) {
  return (
    <UmField name={name} label={label} help={help}>
      <select className="um-form-field" name={name} id={`${name}-um`} defaultValue={value}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </UmField>
  );
}

/** Honeypot field (UM "Only fill in if you are not human"). */
export function Honeypot() {
  return (
    <p className="um-hp" aria-hidden="true">
      <label htmlFor="um_request_hp">Only fill in if you are not human</label>
      <input type="text" name="um_request" id="um_request_hp" tabIndex={-1} autoComplete="off" defaultValue="" />
    </p>
  );
}

export function Notice({ kind, children }: { kind: "err" | "success" | "warning"; children: ReactNode }) {
  return <p className={`um-notice ${kind}`}>{children}</p>;
}

export function Avatar({ src, name, size = 80 }: { src: string | null; name: string; size?: number }) {
  const ini = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span className="um-avatar" style={{ width: size, height: size, fontSize: Math.round(size / 2.6) }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} width={size} height={size} />
      ) : (
        <span>{ini || "?"}</span>
      )}
    </span>
  );
}
