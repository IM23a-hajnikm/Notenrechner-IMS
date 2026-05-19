import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Notenrechner v2",
  description: "Swiss grade calculator for students with BMS, EFZ, and required-grade support.",
};

const themeBootstrapScript = `
(function () {
  try {
    var key = "notenrechner-theme";
    var stored = window.localStorage.getItem(key);
    var preference = stored === "light" || stored === "dark" ? stored : "system";
    var systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var resolvedTheme = preference === "system" ? systemTheme : preference;
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch (_) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.themePreference = "system";
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de-CH" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
