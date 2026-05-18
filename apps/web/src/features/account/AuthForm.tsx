"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FieldError,
  FieldErrors,
  authLoginSchema,
  authRegisterSchema,
  fieldErrorId,
  fieldErrorsFromZod,
  inputClassName,
} from "../validation/form-validation";
import { loginAccount, registerAccount } from "./api-client";

type AuthField = "email" | "password" | "name";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<AuthField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";
  const formId = `auth-${mode}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = (isRegister ? authRegisterSchema : authLoginSchema).safeParse({ email, name, password });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod<AuthField>(parsed.error));
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegister) {
        await registerAccount(parsed.data);
      } else {
        await loginAccount(parsed.data);
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

          <form onSubmit={submit} noValidate className="mt-5 grid gap-4">
            {isRegister ? (
              <label className="grid gap-1 text-sm font-medium text-black/70">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? fieldErrorId(formId, "name") : undefined}
                  className={inputClassName(Boolean(fieldErrors.name))}
                />
                <FieldError id={fieldErrorId(formId, "name")} message={fieldErrors.name} />
              </label>
            ) : null}

            <label className="grid gap-1 text-sm font-medium text-black/70">
              E-Mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? fieldErrorId(formId, "email") : undefined}
                className={inputClassName(Boolean(fieldErrors.email))}
              />
              <FieldError id={fieldErrorId(formId, "email")} message={fieldErrors.email} />
            </label>

            <label className="grid gap-1 text-sm font-medium text-black/70">
              Passwort
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? fieldErrorId(formId, "password") : undefined}
                className={inputClassName(Boolean(fieldErrors.password))}
              />
              <FieldError id={fieldErrorId(formId, "password")} message={fieldErrors.password} />
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
