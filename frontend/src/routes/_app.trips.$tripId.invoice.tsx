import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, MapPin, Printer, FileText, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TripSubNav } from "@/components/trip-sub-nav";
import { api, ApiError, API_URL, getToken } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/trips/$tripId/invoice")({
  head: () => ({ meta: [{ title: "Invoice — Traveloop" }] }),
  component: Invoice,
});

interface InvoiceItem {
  category: string;
  description: string;
  quantity_or_details: string;
  unit_cost: number;
  amount: number;
}

interface InvoiceData {
  id: string;
  trip_id: string;
  invoice_number: string;
  generated_date: string | null;
  status: "pending" | "paid" | "cancelled";
  items: InvoiceItem[];
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  discount: number;
  grand_total: number;
  traveler_details: Record<string, string>;
}

function Invoice() {
  const { tripId } = Route.useParams();
  const qc = useQueryClient();

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () =>
      api<{
        name: string;
        description: string | null;
        start_date: string | null;
        end_date: string | null;
      }>(`/trips/${tripId}`),
  });

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["invoice", tripId],
    queryFn: () => api<InvoiceData>(`/trips/${tripId}/invoice`),
    retry: false,
  });

  const regenerate = useMutation({
    mutationFn: () => api<InvoiceData>(`/trips/${tripId}/invoice/generate`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", tripId] });
      toast.success("Invoice regenerated from latest expenses");
    },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  const markPaid = useMutation({
    mutationFn: () =>
      api(`/invoices/${invoice!.id}/mark-paid`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", tripId] });
      toast.success("Invoice marked as paid");
    },
  });

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      const url = `${API_URL}/invoices/${invoice.id}/pdf`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `traveloop-invoice-${invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  };

  const invoiceDate = invoice?.generated_date
    ? format(new Date(invoice.generated_date), "MMM d, yyyy")
    : format(new Date(), "MMM d, yyyy");

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/trips"><ArrowLeft className="mr-1 h-4 w-4" /> All trips</Link>
        </Button>
        <h1 className="font-display text-3xl font-bold">Invoice</h1>
        {trip?.description && (
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {trip.description}</div>
        )}
      </div>

      <TripSubNav tripId={tripId} />

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
          {(error as ApiError).detail ?? "Could not load invoice"}
        </div>
      ) : invoice ? (
        <>
          {/* Invoice Header */}
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="bg-gradient-hero p-6 text-primary-foreground">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-5 w-5" />
                    <span className="font-display text-lg font-bold">Traveloop</span>
                  </div>
                  <p className="text-sm text-white/80">Travel Invoice</p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">Invoice #{invoice.invoice_number}</div>
                  <div className="text-white/80">Date: {invoiceDate}</div>
                  <Badge
                    variant={invoice.status === "paid" ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {invoice.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div className="border-b border-border p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Billed To</div>
                  <div className="font-medium">{invoice.traveler_details.name ?? "Traveler"}</div>
                  <div className="text-sm text-muted-foreground">{invoice.traveler_details.email ?? ""}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Trip Details</div>
                  <div className="font-medium">{invoice.traveler_details.trip_name ?? trip?.name}</div>
                  {invoice.traveler_details.travel_dates && (
                    <div className="text-sm text-muted-foreground">{invoice.traveler_details.travel_dates}</div>
                  )}
                  {invoice.traveler_details.destination && (
                    <div className="text-sm text-muted-foreground">{invoice.traveler_details.destination}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Unit cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No expenses logged for this trip yet.{" "}
                      <Link
                        to="/trips/$tripId/budget"
                        params={{ tripId }}
                        className="font-medium text-primary underline"
                      >
                        Open Budget tab
                      </Link>{" "}
                      to log expenses or auto-sync from your activities, then come back and click Regenerate.
                    </td></tr>
                  ) : (
                    invoice.items.map((item, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-base">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">{item.description}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.quantity_or_details}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">${item.unit_cost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium">${item.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-border bg-muted/20 p-5">
              <div className="ml-auto max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({invoice.tax_percent}%)</span>
                  <span>${invoice.tax_amount.toFixed(2)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span>-${invoice.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                  <span>Grand Total</span>
                  <span className="text-primary">${invoice.grand_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleDownloadPDF} className="shadow-soft">
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
              <RefreshCw className="mr-1 h-4 w-4" /> Regenerate
            </Button>
            {invoice.status !== "paid" && (
              <Button
                variant="outline"
                onClick={() => markPaid.mutate()}
                disabled={markPaid.isPending}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" /> Mark as paid
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
