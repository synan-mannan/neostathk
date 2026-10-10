import { apiFetch } from "@/lib/api";

export default function HomePage() {

  

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50 text-slate-900">
      <h1 className="text-4xl font-bold tracking-tight">NeoStats Hackathon</h1>
      <p className="mt-4 text-base text-slate-600 max-w-md">
        Clean full-stack starter ready for challenge implementation.
      </p>
    </main>
  );
}
