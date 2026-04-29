import type { Metadata } from "next";
import ReportForm from "@/components/reporting/ReportForm";

export const metadata: Metadata = { title: "Report an Issue" };

export default function NewReportPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-ghana-red px-5 pt-6 pb-7">
        <p className="text-red-200 text-xs font-semibold uppercase tracking-widest mb-2">
          Community Reporting
        </p>
        <h1 className="text-white font-serif text-3xl font-black leading-tight mb-2">
          Report an Issue
        </h1>
        <p className="text-red-100 text-sm leading-relaxed">
          Photo and GPS location are required. Your identity is protected.
        </p>
      </div>

      <ReportForm />
    </div>
  );
}
