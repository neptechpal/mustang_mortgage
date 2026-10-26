import "../styles/site.css";
import "../styles/elementor.css";
import { getCf7ClientProps } from "../cf7/registry";
import { html as footerHtml } from "../content/footer";
import { html as floatingHtml } from "../content/floating";
import { siteFontVars } from "../fonts";
import ElementorHtml from "./ElementorHtml";
import SiteHeader from "./SiteHeader";

/**
 * Site-wide chrome rendered around every public page (WordPress theme-builder
 * header 183 + footer 173 + floating contact button 2380), on the Elementor kit 1450.
 */
export default async function SiteChrome({ children }: { children: React.ReactNode }) {
  const enquiry = await getCf7ClientProps(1767);
  return (
    <div className={`mm-site elementor-default elementor-kit-1450 ${siteFontVars}`}>
      <SiteHeader enquiryForm={enquiry} />
      {children}
      <ElementorHtml html={footerHtml} />
      <ElementorHtml html={floatingHtml} />
    </div>
  );
}
