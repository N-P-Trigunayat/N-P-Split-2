import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

export default function UPIPayment({ person, amount, currencySymbol = "$" }) {
  const copyUPI = (upiId) => {
    navigator.clipboard.writeText(upiId);
    toast.success("UPI ID copied!");
  };

  if (!person?.upi_id) return null;

  const upiLink = `upi://pay?pa=${person.upi_id}&pn=${encodeURIComponent(person.full_name || person.email)}&am=${amount}&cu=INR`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <QrCode className="w-4 h-4" />
          Pay via UPI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay {person.full_name || person.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600 mb-1">
              {currencySymbol}{amount?.toFixed(2)}
            </p>
            <p className="text-sm text-slate-500">Amount to pay</p>
          </div>

          {person.upi_qr_code && (
            <div className="flex justify-center p-4 bg-slate-50 rounded-xl">
              <img 
                src={person.upi_qr_code} 
                alt="UPI QR Code" 
                className="w-64 h-64 object-contain"
              />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">UPI ID:</p>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-slate-100 rounded-lg font-mono text-sm">
                {person.upi_id}
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyUPI(person.upi_id)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <a href={upiLink} className="block">
            <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
              <ExternalLink className="w-4 h-4 mr-2" />
              Pay Now via UPI
            </Button>
          </a>

          <p className="text-xs text-slate-400 text-center">
            This will open your UPI app (Google Pay, PhonePe, Paytm, etc.)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}