import type { Metadata } from "next";
import ConsentForm from "@/components/anonymization/ConsentForm";

export const metadata: Metadata = {
  title: "Choose Your Privacy Level",
};

export default function ConsentPage() {
  return (
    <div className="flex-1 flex flex-col px-6 pt-10 pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 mb-4">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">One-time setup</span>
        </div>
        <h1 className="text-white font-serif text-3xl font-black leading-tight mb-3">
          How do you want<br />
          <span className="text-ghana-gold">to be known?</span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Choose your privacy level. You can change this later in your profile.
          Your phone number is never shown — this controls only what appears on your reports.
        </p>
      </div>

      <ConsentForm />
    </div>
  );
}
