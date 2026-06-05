export const metadata = {
  title: 'LifeSim — Iași',
  description: '10 NPC-uri care trăiesc o săptămână în Iași',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body style={{ margin: 0, fontFamily: 'monospace', background: '#111', color: '#eee', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
