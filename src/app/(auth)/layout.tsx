// Layout for auth pages: /login, /consent
// Clean full-screen layout — no navigation chrome

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-ghana-black">
      {/* Ghana flag stripe at very top */}
      <div className="flag-stripe h-1" aria-hidden="true">
        <div />
        <div />
        <div />
      </div>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
