import localFont from "next/font/local";

export const raleway = localFont({
  src: "./fonts/Raleway-variable.ttf",
  variable: "--font-raleway",
  weight: "100 900",
  display: "swap",
  preload: false,
  fallback: ["Arial", "sans-serif"],
});
