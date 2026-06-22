"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, CreditCard } from "lucide-react";
import { AssignWardenModal } from "@/components/admin/AssignWardenModal";
import { PaymentConfigModal } from "@/components/admin/PaymentConfigModal";

interface AdminDashboardClientProps {
  hostelId: string;
  hostelName: string;
  hasWarden: boolean;
}

export function AdminDashboardClient({ hostelId, hostelName, hasWarden }: AdminDashboardClientProps) {
  const [showWardenModal, setShowWardenModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        {!hasWarden && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWardenModal(true)}
            className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
            Assign Warden
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPaymentModal(true)}
          className="flex items-center gap-1.5"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Payment Config
        </Button>
      </div>

      <AssignWardenModal
        hostelId={hostelId}
        hostelName={hostelName}
        open={showWardenModal}
        onClose={() => setShowWardenModal(false)}
        onSuccess={() => {
          setShowWardenModal(false);
          window.location.reload();
        }}
      />

      <PaymentConfigModal
        hostelId={hostelId}
        hostelName={hostelName}
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
        }}
      />
    </>
  );
}
