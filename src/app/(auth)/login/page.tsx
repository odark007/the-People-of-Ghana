import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to People of Ghana",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="flex-1 flex flex-col px-6 pt-12 pb-8">
      {/* Branding */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex flex-col w-8 h-6 rounded overflow-hidden flex-shrink-0">
            <div className="flex-1 bg-ghana-red" />
            <div className="flex-1 bg-ghana-gold" />
            <div className="flex-1 bg-ghana-green" />
          </div>
          <span className="text-white font-serif text-xl font-bold">
            People of <span className="text-ghana-gold">Ghana</span>
          </span>
        </div>
        <h1 className="text-white font-serif text-4xl font-black leading-tight mb-3">
          Your voice.<br />
          <span className="text-ghana-gold">Your leaders.</span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Civic transparency for every Ghanaian. Sign in or create a free account.
        </p>
      </div>

      <LoginForm
        redirectTo={searchParams.next ?? "/dashboard"}
        error={searchParams.error}
      />
    </div>
  );
}
