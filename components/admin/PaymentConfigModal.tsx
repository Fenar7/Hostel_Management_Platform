"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, X, CheckCircle, AlertCircle, Upload } from "lucide-react";

interface PaymentConfigModalProps {
  hostelId: string;
  hostelName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentConfigModal({ hostelId, hostelName, open, onClose, onSuccess }: PaymentConfigModalProps) {
  const [upiId, setUpiId] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [existingQrUrl, setExistingQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open, hostelId]);

  useEffect(() => {
    if (!qrFile) {
      setQrPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(qrFile);
    setQrPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [qrFile]);

  const fetchConfig = async () => {
    setFetching(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/hostels/${hostelId}/payment-config`);
      if (res.ok) {
        const data = await res.json();
        setUpiId(data.upiId || "");
        setExistingQrUrl(data.qrCodeUrl || null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load payment configuration");
      }
    } catch {
      setError("Failed to load payment configuration");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("upiId", upiId.trim());
      if (qrFile) {
        formData.append("qrCode", qrFile);
      }

      const res = await fetch(`/api/admin/hostels/${hostelId}/payment-config`, {
        method: "PUT",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save configuration");

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
    setUpiId("");
    setQrFile(null);
    setQrPreviewUrl(null);
    setExistingQrUrl(null);
    setError("");
    setSuccess(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-md w-full rounded-lg border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold">Payment Configuration</h3>
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

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-12 w-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="font-semibold text-green-700 dark:text-green-400">Settings saved successfully!</p>
            </div>
          ) : fetching ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading settings...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Hostel UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. payment@upi"
                    value={upiId}
                    onChange={(e) => { setUpiId(e.target.value); setError(""); }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    UPI ID that will receive payments from onboarding and renewal tenants.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">QR Code Image</label>
                  
                  {/* Current QR Code Display */}
                  {existingQrUrl && !qrPreviewUrl && (
                    <div className="mb-3 text-center border p-2 rounded-lg bg-muted/20">
                      <p className="text-[10px] text-muted-foreground mb-1">Active QR Code:</p>
                      <img src={existingQrUrl} alt="Active QR Code" className="h-28 w-28 object-contain mx-auto border rounded bg-white" />
                    </div>
                  )}

                  {/* New QR Code Upload/Preview */}
                  <div className="border border-dashed rounded-lg p-4 bg-muted/15 flex flex-col items-center justify-center gap-2">
                    {qrFile && qrPreviewUrl ? (
                      <div className="text-center space-y-2">
                        <img
                          src={qrPreviewUrl}
                          alt="QR Preview"
                          className="h-28 w-28 object-contain mx-auto border rounded bg-white"
                        />
                        <span className="text-xs max-w-xs truncate block font-semibold">{qrFile.name}</span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setQrFile(null)}
                        >
                          Remove Image
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-2 py-2">
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                        <span className="text-xs font-medium block">Upload new QR code screenshot</span>
                        <span className="text-[9px] text-muted-foreground block">PNG or JPG (Max 2MB)</span>
                        <div className="relative inline-block mt-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setQrFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Button type="button" size="sm" variant="outline">Browse Files</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4 mt-6">
                <Button type="button" onClick={handleReset} variant="outline" disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
