"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  Calendar,
  User,
  Phone,
  Mail,
  Home,
  CheckCircle2,
  Download,
  Eye,
  ShieldCheck,
  CreditCard,
  Building2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EnrichedPaymentHistoryItem {
  id: string;
  receiptNumber: number;
  amountPaidPaise: number;
  amount: number;
  paymentMode: string;
  transactionRefNo: string | null;
  paymentStatus: string;
  notes: string | null;
  createdAt: string;
  verifiedAt: string | null;
  verifiedByUser: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  tenant: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    emergencyContactPhone: string | null;
  };
  bed: {
    id: string;
    label: string;
    roomNumber: string;
    floorName?: string;
  };
  stay: {
    id: string;
    status: string;
    joiningDate: string;
    endDate: string;
    monthlyRentPaise: number;
    monthlyRent: number;
  };
  screenshotDocumentId: string | null;
}

interface PaymentDetailModalProps {
  payment: EnrichedPaymentHistoryItem | null;
  onClose: () => void;
}

export function PaymentDetailModal({ payment, onClose }: PaymentDetailModalProps) {
  const [showScreenshot, setShowScreenshot] = useState(false);

  if (!payment) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formattedReceiptNo = `#RCP-${String(payment.receiptNumber).padStart(5, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1f1f1f] text-white border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-[#58ff48]/10 text-[#58ff48] border border-[#58ff48]/20">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold tracking-tight text-white">{formattedReceiptNo}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#58ff48]/20 text-[#58ff48] border border-[#58ff48]/30">
                  <CheckCircle2 className="mr-1 size-3" />
                  {payment.paymentStatus}
                </span>
              </div>
              <p className="text-xs text-gray-400">Payment Transaction Record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main Amount Card */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-gray-900 to-black text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Amount Paid</p>
              <p className="text-3xl font-extrabold text-[#58ff48] tracking-tight mt-1">
                ₹{payment.amount.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-md text-xs font-semibold bg-white/10 text-white border border-white/20">
                <CreditCard className="inline mr-1 size-3.5" />
                {payment.paymentMode}
              </span>
              {payment.transactionRefNo && (
                <span className="px-3 py-1 rounded-md text-xs font-mono bg-white/10 text-gray-300 border border-white/10">
                  Ref: {payment.transactionRefNo}
                </span>
              )}
            </div>
          </div>

          {/* Grid Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tenant Information */}
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2">
                <User className="size-4 text-gray-500" />
                <span>Tenant Profile</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="font-semibold text-gray-900">{payment.tenant.fullName}</p>
                </div>
                {payment.tenant.phone && (
                  <div className="flex items-center text-gray-700">
                    <Phone className="size-3.5 mr-2 text-gray-400" />
                    <span>{payment.tenant.phone}</span>
                  </div>
                )}
                {payment.tenant.email && (
                  <div className="flex items-center text-gray-700">
                    <Mail className="size-3.5 mr-2 text-gray-400" />
                    <span className="truncate">{payment.tenant.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Room & Stay Details */}
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2">
                <Home className="size-4 text-gray-500" />
                <span>Room & Stay Context</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Room / Bed</p>
                    <p className="font-semibold text-gray-900">
                      Room {payment.bed.roomNumber} - Bed {payment.bed.label}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Floor</p>
                    <p className="font-medium text-gray-800">{payment.bed.floorName || "Main Floor"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Stay Period</p>
                  <p className="font-medium text-gray-800 text-xs">
                    {formatShortDate(payment.stay.joiningDate)} → {formatShortDate(payment.stay.endDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Audit Log */}
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2">
              <ShieldCheck className="size-4 text-gray-500" />
              <span>Verification Audit Trail</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Payment Date & Time</p>
                <p className="font-medium text-gray-900">{formatDate(payment.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Verified By</p>
                <p className="font-medium text-gray-900">
                  {payment.verifiedByUser ? payment.verifiedByUser.fullName : "System / Self"}
                </p>
                {payment.verifiedAt && (
                  <p className="text-xs text-gray-500">{formatDate(payment.verifiedAt)}</p>
                )}
              </div>
            </div>
            {payment.notes && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">Notes</p>
                <p className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-200 mt-1">
                  {payment.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 border-t border-gray-200 gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {payment.screenshotDocumentId && (
              <button
                onClick={() => setShowScreenshot(!showScreenshot)}
                className="flex items-center justify-center px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors w-full sm:w-auto"
              >
                <Eye className="mr-1.5 size-4" />
                {showScreenshot ? "Hide Screenshot" : "View UPI Screenshot"}
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <a
              href={`/api/pdf/receipt/${payment.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-4 py-2 text-xs font-semibold text-black bg-[#58ff48] hover:bg-[#48ee38] border border-[#38dd28] rounded-lg transition-colors shadow-sm w-full sm:w-auto"
            >
              <Download className="mr-1.5 size-4" />
              Download Official Receipt PDF
            </a>
          </div>
        </div>

        {/* Screenshot Overlay Drawer */}
        {showScreenshot && payment.screenshotDocumentId && (
          <div className="p-4 bg-gray-900 border-t border-gray-800 text-center animate-in slide-in-from-bottom duration-200">
            <p className="text-xs font-semibold text-gray-400 mb-2">Uploaded Payment Screenshot</p>
            <div className="max-h-64 overflow-auto rounded-lg border border-gray-700 bg-black p-2 flex justify-center">
              <img
                src={`/api/pdf/download/${payment.screenshotDocumentId}`}
                alt="Payment Screenshot"
                className="max-h-56 object-contain rounded"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
