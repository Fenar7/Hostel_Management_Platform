"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Loader2, Shield, X, CheckCircle, AlertCircle } from "lucide-react";

interface AssignWardenModalProps {
  hostelId: string;
  hostelName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignWardenModal({ hostelId, hostelName, open, onClose, onSuccess }: AssignWardenModalProps) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    setError("");
    if (!phone) { setError("Phone number is required"); return; }
    if (!phone.startsWith("+")) { setError("Phone must start with country code (e.g. +91XXXXXXXXXX)"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/hostels/${hostelId}/warden`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          email: email || null,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign warden");

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleReset();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPhone("");
    setEmail("");
    setPassword("");
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-md w-full rounded-lg border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold">Assign Warden</h3>
              <p className="text-xs text-muted-foreground">{hostelName}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-12 w-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="font-semibold text-green-700 dark:text-green-400">Warden assigned successfully!</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone Number *</label>
                  <PhoneInput
                    value={phone}
                    onChange={(val) => { setPhone(val); setError(""); }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Email (optional)</label>
                  <input
                    type="email"
                    placeholder="warden@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Password *</label>
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          {!success && (
            <>
              <Button onClick={handleReset} variant="outline" disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !phone || password.length < 8}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? "Creating..." : "Assign Warden"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
