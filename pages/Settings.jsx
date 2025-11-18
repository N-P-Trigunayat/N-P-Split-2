import React, { useState, useEffect } from "react";
import { localDB, exportAllData, importData, clearAllData } from "@/components/LocalStorageDB";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import LoadingScreen from "../components/LoadingScreen.jsx";

const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Złoty", symbol: "zł" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
  { code: "CLP", name: "Chilean Peso", symbol: "CLP$" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "COP", name: "Colombian Peso", symbol: "COL$" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
];

export default function Settings() {
  const [exporting, setExporting] = useState(false);
  const [user, setUser] = useState(null);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [upiId, setUpiId] = useState("");
  const [uploadingQR, setUploadingQR] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    localDB.auth.me().then(u => {
      setUser(u);
      setDefaultCurrency(u.default_currency || "USD");
      setUpiId(u.upi_id || "");
      setTimeout(() => setIsInitialLoading(false), 600);
    }).catch(() => {
      setIsInitialLoading(false);
    });
  }, []);

  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => localDB.entities.Expense.list('-date'),
    initialData: [],
  });

  const { data: settlements } = useQuery({
    queryKey: ['settlements'],
    queryFn: () => localDB.entities.Settlement.list('-date'),
    initialData: [],
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => localDB.auth.updateMe(data),
    onSuccess: () => {
      toast.success("Settings updated!");
      localDB.auth.me().then(setUser);
    },
  });

  const handleCurrencyChange = (currency) => {
    setDefaultCurrency(currency);
    updateUserMutation.mutate({ default_currency: currency });
  };

  const handleUpiUpdate = () => {
    updateUserMutation.mutate({ upi_id: upiId });
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingQR(true);
    try {
      const { file_url } = await localDB.integrations.Core.UploadFile({ file });
      updateUserMutation.mutate({ upi_qr_code: file_url });
      toast.success("UPI QR code uploaded!");
    } catch (error) {
      toast.error("Failed to upload QR code");
    }
    setUploadingQR(false);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          importData(data);
          toast.success("Data imported successfully!");
          window.location.reload();
        } catch {
          toast.error("Invalid import file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      if (expenses.length === 0) {
        toast.error("No expenses to export");
        setExporting(false);
        return;
      }

      const csvData = expenses.map(exp => {
        const payer = exp.payers?.[0]?.email || exp.payers?.[0] || '';
        const splitWith = exp.splits?.map(s => s.email).join('; ') || '';
        
        return {
          'Date': exp.date,
          'Description': exp.description,
          'Amount': exp.amount,
          'Currency': exp.currency || 'USD',
          'Category': exp.category,
          'Paid By': payer,
          'Split With': splitWith,
          'Split Method': exp.split_method || 'equal',
          'Payment Method': exp.payment_method || '',
          'Group ID': exp.group_id || '',
          'Due Date': exp.due_date || '',
          'Created Date': exp.created_date ? format(new Date(exp.created_date), 'yyyy-MM-dd HH:mm:ss') : ''
        };
      });

      // Add settlements to the export
      const settlementData = settlements.map(settlement => ({
        'Date': settlement.date,
        'Description': 'Payment Settlement',
        'Amount': settlement.amount,
        'Currency': settlement.currency || 'USD',
        'Category': 'settlement',
        'Paid By': settlement.from_user,
        'Split With': settlement.to_user,
        'Split Method': 'settlement',
        'Payment Method': settlement.payment_method || '',
        'Group ID': settlement.group_id || '',
        'Due Date': '',
        'Created Date': settlement.created_date ? format(new Date(settlement.created_date), 'yyyy-MM-dd HH:mm:ss') : ''
      }));

      const allData = [...csvData, ...settlementData].sort((a, b) => 
        new Date(b.Date) - new Date(a.Date)
      );

      const headers = Object.keys(allData[0]);
      const csvRows = allData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      );

      const csvContent = [headers.join(','), ...csvRows].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `splitease_complete_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${expenses.length} expenses and ${settlements.length} settlements!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export");
    }
    setExporting(false);
  };

  const exportToJSON = () => {
    setExporting(true);
    try {
      const jsonData = exportAllData();

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `splitease_backup_${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Complete backup created!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to backup");
    }
    setExporting(false);
  };

  if (isInitialLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your preferences and data</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>UPI Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upi_id">UPI ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="upi_id"
                    placeholder="yourname@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                  <Button onClick={handleUpiUpdate} disabled={updateUserMutation.isPending}>
                    Save
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Your UPI ID will be shown to people who owe you money for easy payments
                </p>
              </div>

              <div className="space-y-2">
                <Label>UPI QR Code</Label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQRUpload}
                    className="hidden"
                    id="qr-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('qr-upload').click()}
                    disabled={uploadingQR}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingQR ? "Uploading..." : user?.upi_qr_code ? "Change QR Code" : "Upload QR Code"}
                  </Button>
                  {user?.upi_qr_code && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open(user.upi_qr_code, '_blank')}
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>

              {user?.upi_id && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm text-emerald-900 font-medium mb-2">Payment Link:</p>
                  <a
                    href={`upi://pay?pa=${user.upi_id}&pn=${encodeURIComponent(user.full_name)}`}
                    className="text-sm text-emerald-700 underline break-all"
                  >
                    upi://pay?pa={user.upi_id}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Currency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select your preferred default currency</Label>
                <Select value={defaultCurrency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {CURRENCIES.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{currency.symbol}</span>
                          <span>{currency.code}</span>
                          <span className="text-slate-500 text-sm">- {currency.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  This will be the default currency for new expenses. You can still change it per expense.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export & Backup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold">Export All Data to CSV</p>
                  <p className="text-sm text-slate-500">Download expenses and settlements in spreadsheet format</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {expenses.length} expenses • {settlements.length} settlements
                  </p>
                </div>
                <Button 
                  onClick={exportToCSV} 
                  disabled={exporting || (expenses.length === 0 && settlements.length === 0)} 
                  variant="outline"
                  className="shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold">Complete Backup (JSON)</p>
                  <p className="text-sm text-slate-500">Download complete data backup with all metadata</p>
                  <p className="text-xs text-slate-400 mt-1">Full backup with metadata</p>
                </div>
                <Button 
                  onClick={exportToJSON} 
                  disabled={exporting} 
                  variant="outline"
                  className="shrink-0"
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Backup JSON
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold">Import Data</p>
                  <p className="text-sm text-slate-500">Restore data from a JSON backup file</p>
                  <p className="text-xs text-slate-400 mt-1">Import previously exported data</p>
                </div>
                <Button 
                  onClick={handleImport} 
                  variant="outline"
                  className="shrink-0"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-red-50 transition-colors border-red-200">
                <div>
                  <p className="font-semibold text-red-700">Clear All Data</p>
                  <p className="text-sm text-red-600">Delete all local data permanently</p>
                  <p className="text-xs text-red-400 mt-1">This action cannot be undone</p>
                </div>
                <Button 
                  onClick={clearAllData} 
                  variant="outline"
                  className="shrink-0 border-red-300 text-red-600 hover:bg-red-50"
                >
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">SplitEase</span> - A comprehensive expense splitting application
                </p>
                <p className="text-xs text-slate-400">Version 1.0.0</p>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold">Multi-currency support:</span> {CURRENCIES.length}+ currencies available
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="font-semibold">Storage:</span> All data stored locally in your browser
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="font-semibold">Export formats:</span> CSV (combined), JSON (full backup)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}