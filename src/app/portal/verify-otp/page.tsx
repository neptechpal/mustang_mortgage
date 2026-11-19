"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Container } from "@/modules/web/components/ui/Container";

export default function VerifyOtpPage() {
  const searchParams = useSearchParams();
  const linkToken = searchParams.get("token") || "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/portal/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkToken, otp }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/portal";
        }, 2000);
      } else {
        setError(data.error || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <div style={{ maxWidth: "500px", margin: "60px auto", padding: "40px", backgroundColor: "var(--white)", borderRadius: "10px" }}>
        <h1 className="mw-h2" style={{ marginBottom: 20 }}>Verify your access</h1>

        {success ? (
          <div style={{ padding: "20px", backgroundColor: "#e8f5e9", borderRadius: "8px", color: "#2e7d32" }}>
            <p className="mw-body">Access verified successfully! Redirecting to your portal...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="mw-body" style={{ marginBottom: 20 }}>
              Enter the 6-digit code sent to your email to access your secure portal.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label className="mw-label" style={{ display: "block", marginBottom: 8 }}>
                Access Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "24px",
                  letterSpacing: "4px",
                  textAlign: "center",
                  border: "2px solid var(--grey-300)",
                  borderRadius: "8px",
                  fontFamily: "monospace",
                }}
                disabled={loading}
              />
            </div>

            {error && (
              <div style={{ marginBottom: 20, padding: "12px", backgroundColor: "#ffebee", borderRadius: "8px", color: "#c62828" }}>
                <p className="mw-small">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={otp.length !== 6 || loading}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: otp.length === 6 && !loading ? "var(--gold-600)" : "var(--grey-300)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: otp.length === 6 && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? "Verifying..." : "Verify Access"}
            </button>
          </form>
        )}
      </div>
    </Container>
  );
}
