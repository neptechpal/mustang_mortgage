"use client";

import { useState, useEffect } from "react";
import { Container } from "@/modules/web/components/ui/Container";

export function EnquiryEmailSettings() {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    try {
      const response = await fetch("/api/admin/settings/enquiry-emails");
      const data = await response.json();
      setRecipients(data.recipients || []);
    } catch (error) {
      console.error("Error fetching recipients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = () => {
    if (!newEmail || recipients.includes(newEmail)) return;
    setRecipients([...recipients, newEmail]);
    setNewEmail("");
  };

  const handleRemoveEmail = (email: string) => {
    setRecipients(recipients.filter((e) => e !== email));
  };

  const handleSave = async () => {
    if (recipients.length === 0) {
      setMessage("Please add at least one email address");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/enquiry-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients }),
      });

      if (response.ok) {
        setMessage("Settings saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error saving settings");
      }
    } catch (error) {
      setMessage("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: "600px", margin: "40px 0" }}>
      <h2 className="mw-h3" style={{ marginBottom: 20 }}>
        Enquiry Email Recipients
      </h2>

      <p className="mw-body" style={{ marginBottom: 20 }}>
        Choose which email address(es) receive notifications when someone submits an enquiry form on the website.
      </p>

      <div style={{ marginBottom: 24, padding: "16px", backgroundColor: "var(--sand)", borderRadius: "8px" }}>
        <label className="mw-label" style={{ display: "block", marginBottom: 8 }}>
          Current Recipients:
        </label>
        {recipients.length === 0 ? (
          <p className="mw-small" style={{ color: "var(--grey-600)" }}>No recipients configured</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {recipients.map((email) => (
              <li key={email} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                <span>{email}</span>
                <button
                  onClick={() => handleRemoveEmail(email)}
                  style={{
                    padding: "4px 12px",
                    backgroundColor: "#ffcdd2",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <label className="mw-label" style={{ display: "block", marginBottom: 8 }}>
          Add Email Address:
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@example.com"
            style={{ flex: 1, padding: "10px", border: "1px solid var(--grey-300)", borderRadius: "6px" }}
            onKeyPress={(e) => e.key === "Enter" && handleAddEmail()}
          />
          <button
            onClick={handleAddEmail}
            style={{
              padding: "10px 20px",
              backgroundColor: "var(--gold-600)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px",
            backgroundColor: message.includes("Error") ? "#ffebee" : "#e8f5e9",
            borderRadius: "6px",
            color: message.includes("Error") ? "#c62828" : "#2e7d32",
          }}
        >
          {message}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "10px 20px",
          backgroundColor: "var(--gold-600)",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
