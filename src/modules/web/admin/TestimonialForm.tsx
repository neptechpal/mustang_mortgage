"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TestimonialFormProps {
  testimonial?: {
    id: number;
    clientName: string;
    content: string;
    role: string;
    rating: number;
    approved: boolean;
    published: boolean;
  };
}

export function TestimonialForm({ testimonial }: TestimonialFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    clientName: testimonial?.clientName || "",
    content: testimonial?.content || "",
    role: testimonial?.role || "",
    rating: testimonial?.rating || 5,
    approved: testimonial?.approved || false,
    published: testimonial?.published || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = testimonial ? `/api/admin/testimonials/${testimonial.id}` : "/api/admin/testimonials";
      const method = testimonial ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "An error occurred");
        return;
      }

      router.push("/admin/testimonials");
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 0" }}>
      <div style={{ marginBottom: 20 }}>
        <label className="mw-label" style={{ display: "block", marginBottom: 8 }}>
          Client Name *
        </label>
        <input
          type="text"
          required
          value={formData.clientName}
          onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
          style={{ width: "100%", padding: "10px", border: "1px solid var(--grey-300)", borderRadius: "6px" }}
          disabled={loading}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label className="mw-label" style={{ display: "block", marginBottom: 8 }}>
          Testimonial Content *
        </label>
        <textarea
          required
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={5}
          style={{ width: "100%", padding: "10px", border: "1px solid var(--grey-300)", borderRadius: "6px" }}
          disabled={loading}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label className="mw-label" style={{ display: "block", marginBottom: 8 }}>
          Role/Title (e.g., First Home Buyer)
        </label>
        <input
          type="text"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          style={{ width: "100%", padding: "10px", border: "1px solid var(--grey-300)", borderRadius: "6px" }}
          disabled={loading}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label className="mw-label" style={{ display: "block", marginBottom: 8 }}>
          Rating (1-5)
        </label>
        <select
          value={formData.rating}
          onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
          style={{ width: "100%", padding: "10px", border: "1px solid var(--grey-300)", borderRadius: "6px" }}
          disabled={loading}
        >
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {"★".repeat(r)} ({r})
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 20, display: "flex", gap: 20 }}>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={formData.approved}
            onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
            disabled={loading}
            style={{ marginRight: 8 }}
          />
          Approved
        </label>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={formData.published}
            onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
            disabled={loading}
            style={{ marginRight: 8 }}
          />
          Published (show on site)
        </label>
      </div>

      {error && <div style={{ marginBottom: 20, padding: "12px", backgroundColor: "#ffebee", borderRadius: "6px", color: "#c62828" }}>{error}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "var(--gold-600)",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Saving..." : "Save Testimonial"}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          style={{
            padding: "10px 20px",
            backgroundColor: "var(--grey-300)",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
