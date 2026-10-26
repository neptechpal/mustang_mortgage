import { Lato, Montserrat, Poppins, Roboto } from "next/font/google";

// Fonts used by the Elementor kit/widgets. The generated Elementor CSS refers to
// them as var(--font-poppins) etc. (see tools/build_site_assets.py).
export const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--font-poppins", display: "swap" });
export const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-montserrat", display: "swap" });
export const lato = Lato({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-lato", display: "swap" });
export const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-roboto", display: "swap" });

export const siteFontVars = [poppins.variable, montserrat.variable, lato.variable, roboto.variable].join(" ");
