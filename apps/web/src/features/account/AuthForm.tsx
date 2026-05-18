"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { loginAccount, registerAccount } from "./api-client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await registerAccount({
          email,
          password,
          ...(name.trim() ? { name: name.trim() } : {}),
        });
      } else {
        await loginAccount({ email, password });
      }
      router.push("/account");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die Anmeldung ist fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7]">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-alpine">
          Notenrechner v2
        </Link>
        <div className="mt-6 rounded-lg border border-black/10 bg-white p-6 shadow-soft">
          <h1 className="text-2xl font-semibold text-ink">{isRegister ? "Account erstellen" : "Einloggen"}</h1>
          <p className="mt-2 text-sm leading-6 text-black/60">
            {isRegister
              ? "Speichere Faecher, Semester und Noten dauerhaft in der Datenbank."
              : "Melde dich an, um deine gespeicherten Noten zu verwalten."}
          </p>

          <form onSubmit={submit} className="mt-5 grid gap-4">
            {isRegister ? (
              <label className="grid gap-1 text-sm font-medium text-black/70">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  className="rounded-md border border-black/15 px-3 py-2"
                />
              </label>
            ) : null}

            <label className="grid gap-1 text-sm font-medium text-black/70">
              E-Mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="rounded-md border border-black/15 px-3 py-2"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-black/70">
              Passwort
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={8}
                required
                className="rounded-md border border-black/15 px-3 py-2"
              />
            </label>

            {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            <button
              disabled={isSubmitting}
              className="rounded-md bg-alpine px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#176653] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Bitte warten..." : isRegister ? "Account erstellen" : "Einloggen"}
            </button>
          </form>

          <p className="mt-5 text-sm text-black/60">
            {isRegister ? "Schon ein Konto?" : "Noch kein Konto?"}{" "}
            <Link href={isRegister ? "/account/login" : "/account/register"} className="font-semibold text-alpine">
              {isRegister ? "Einloggen" : "Account erstellen"}
            </Link>
          </p>
          <p className="mt-2 text-sm text-black/60">
            Erst ausprobieren?{" "}
            <Link href="/demo" className="font-semibold text-alpine">
              Demo starten
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
