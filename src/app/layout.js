import "./globals.css";

export const metadata = {
  title: "Urbanización Guajojó",
  description: "Comercialización y seguimiento de pagos de lotes",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
