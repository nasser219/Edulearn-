import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "Next.js iOS Sidebar Demo",
  description: "A premium collapsible sidebar using React hooks and inline styles.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: "#f4f4f7",
        fontFamily: '-apple-system, "SF Pro Display", sans-serif',
      }}>
        <div style={{
          display: "flex",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #c9d6ff 0%, #e2c9f7 50%, #ffd6cc 100%)",
        }}>
          {/* ── Sidebar ── */}
          <Sidebar />

          {/* ── Main Content ── */}
          <main style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            padding: "24px",
          }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
