// Content wrapper for tool pages: matches the WP "default" page template body
// (theme-builder template 1415 → boxed Elementor container, text #777 14px).
export default function PageShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[1140px] px-[10px] py-10 text-[14px] text-[#777777] ${className}`}>{children}</div>
  );
}
