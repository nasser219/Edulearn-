"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Icons (inline SVG as requested) ──────────────────────────────────────
const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  ),
  updates: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  ),
  alerts: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.02 7.02 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  ),
};

// ─── Constants ─────────────────────────────────────────────────────────────
const NAV = [
  { label: "Dashboard", href: "/", icon: "dashboard", badge: null },
  {
    label: "Notifications",
    href: "/notifications",
    icon: "bell",
    badge: 5,
    children: [
      { label: "All Items", href: "/notifications/all", icon: "dashboard", badge: "12.3k" },
      { label: "Updates", href: "/notifications/updates", icon: "updates", badge: "12.2k" },
      { label: "Critical Alerts", href: "/notifications/alerts", icon: "alerts", badge: "12.3k" },
    ],
  },
  { label: "Settings", href: "/settings", icon: "settings", badge: null },
];

// ─── Nav Item Component ────────────────────────────────────────────────────
function NavLink({ item, collapsed, depth = 0 }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
  const [isOpen, setIsOpen] = useState(isActive);
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = item.children?.length > 0;

  return (
    <li style={{ listStyle: "none", position: "relative" }}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: collapsed ? "12px 0" : "10px 14px",
          margin: "4px 0",
          borderRadius: "14px",
          cursor: "pointer",
          backgroundColor: isActive ? "rgba(0,122,255,0.12)" : isHovered ? "rgba(0,0,0,0.04)" : "transparent",
          color: isActive ? "#007AFF" : "#3c3c43",
          transition: "all 0.25s ease",
          justifyContent: collapsed ? "center" : "flex-start",
          overflow: "hidden",
          transform: isHovered ? "scale(1.02)" : "scale(1)",
        }}
      >
        {/* Icon Wrapper */}
        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          backgroundColor: isActive ? "#007AFF" : "rgba(120,120,128,0.12)",
          color: isActive ? "#fff" : "#636366",
          transition: "background 0.3s",
        }}>
          {icons[item.icon]}
        </div>

        {/* Label & Badge (Hidden when collapsed) */}
        <div style={{
          display: "flex",
          alignItems: "center",
          flex: 1,
          opacity: collapsed ? 0 : 1,
          maxWidth: collapsed ? 0 : "300px",
          transition: "opacity 0.2s, max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          whiteSpace: "nowrap",
          pointerEvents: collapsed ? "none" : "auto",
        }}>
          <span style={{ flex: 1, fontSize: "14px", fontWeight: isActive ? 600 : 400 }}>
            {item.label}
          </span>
          {item.badge && (
            <span style={{
              background: isActive ? "#007AFF" : "rgba(120,120,128,0.15)",
              color: isActive ? "#fff" : "#636366",
              borderRadius: "20px",
              padding: "1px 8px",
              fontSize: "11px",
              fontWeight: 600,
              marginLeft: "6px",
            }}>
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <span style={{
              transform: isOpen ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              marginLeft: "8px",
              opacity: 0.5,
            }}>
              {icons.chevronLeft}
            </span>
          )}
        </div>

        {/* CSS Tooltip for Collapsed State */}
        {collapsed && isHovered && (
          <div style={{
            position: "absolute",
            left: "76px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            pointerEvents: "none",
          }}>
            {item.label}
          </div>
        )}
      </div>

      {/* Children slide-out */}
      {!collapsed && hasChildren && (
        <ul style={{
          listStyle: "none",
          padding: "0 0 0 20px",
          margin: 0,
          overflow: "hidden",
          maxHeight: isOpen ? "400px" : "0",
          transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}>
          {item.children.map(child => (
            <NavLink key={child.href} item={child} collapsed={false} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Sidebar Component ──────────────────────────────────────────────────────
export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setIsMobileOpen(false), [pathname]);

  const width = isCollapsed ? "68px" : "260px";

  const sidebarStyle = {
    width: width,
    minHeight: "100vh",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.78)",
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",
    borderRight: "1px solid rgba(255,255,255,0.6)",
    display: "flex",
    flexDirection: "column",
    padding: "20px 10px",
    transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    flexShrink: 0,
    zIndex: 50,
    overflow: "visible",
    fontFamily: '-apple-system, "SF Pro Display", sans-serif',
  };

  const ambientBlob1 = {
    position: "absolute", top: "-50px", left: "-50px",
    width: "250px", height: "250px",
    background: "radial-gradient(circle, rgba(0,122,255,0.12) 0%, transparent 70%)",
    borderRadius: "50%", pointerEvents: "none", zIndex: -1,
  };

  const ambientBlob2 = {
    position: "absolute", bottom: "-50px", right: "-50px",
    width: "250px", height: "250px",
    background: "radial-gradient(circle, rgba(255,45,85,0.1) 0%, transparent 70%)",
    borderRadius: "50%", pointerEvents: "none", zIndex: -1,
  };

  const sidebarContent = (
    <div style={sidebarStyle} className="sidebar-container">
      <div style={ambientBlob1} />
      <div style={ambientBlob2} />

      {/* Floating Arrow Toggle Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        onMouseEnter={(e) => e.currentTarget.style.transform = `translateY(-50%) scale(1.1) ${isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'}`}
        onMouseLeave={(e) => e.currentTarget.style.transform = `translateY(-50%) scale(1) ${isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'}`}
        style={{
          position: "absolute",
          right: "-14px",
          top: "20%",
          transform: `translateY(-50%) ${isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'}`,
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          backgroundColor: "#fff",
          border: "1px solid rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          transition: "transform 300ms ease, background 0.2s",
          color: "#636366",
        }}
      >
        <div style={{ transition: "transform 300ms ease" }}>
          {icons.chevronLeft}
        </div>
      </button>

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isCollapsed ? "center" : "flex-start",
        marginBottom: "32px",
        padding: "0 8px",
      }}>
        {!isCollapsed && (
          <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c1c1e", letterSpacing: "-0.5px" }}>
            Educator Hub
          </span>
        )}
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1 }}>
        <ul style={{ padding: 0, margin: 0 }}>
          {NAV.map(item => (
            <NavLink key={item.href} item={item} collapsed={isCollapsed} />
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div style={{
          padding: "16px 8px",
          borderTop: "1px solid rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
          }}>EH</div>
          <div style={{ overflow: "hidden" }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#1c1c1e" }}>Admin Account</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#8e8e93" }}>admin@platform.com</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop View */}
      <div className="sidebar-desktop" style={{ display: "block" }}>
        {sidebarContent}
      </div>

      {/* Mobile Toggle */}
      <button
        className="mobile-hamburger"
        onClick={() => setIsMobileOpen(true)}
        style={{
          position: "fixed", top: "16px", left: "16px", zIndex: 60,
          width: "44px", height: "44px", borderRadius: "12px", border: "none",
          backgroundColor: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
          color: "#1c1c1e", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          display: "none", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        {icons.menu}
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)", zIndex: 90,
          }}
        />
      )}

      {/* Mobile Drawer */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100,
        width: "280px",
        transform: isMobileOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: isMobileOpen ? "auto" : "none",
      }}>
        <div style={{ position: "relative", height: "100%" }}>
          <button
            onClick={() => setIsMobileOpen(false)}
            style={{
              position: "absolute", top: "16px", right: "-50px",
              width: "40px", height: "40px", borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.9)", border: "none",
              color: "#333", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {icons.close}
          </button>
          
          <aside style={{ ...sidebarStyle, width: "100%", backgroundColor: "rgba(255,255,255,0.95)" }}>
             <div style={{ padding: "10px" }}>
                <span style={{ fontWeight: 800, fontSize: "20px", color: "#1c1c1e", letterSpacing: "-0.5px" }}>
                  Educator Hub
                </span>
             </div>
             <nav style={{ flex: 1, marginTop: "20px" }}>
               {NAV.map(item => <NavLink key={item.href} item={item} collapsed={false} />)}
             </nav>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .mobile-hamburger { display: flex !important; }
        }
        .sidebar-container::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
    </>
  );
}
