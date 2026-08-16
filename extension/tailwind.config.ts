import type { Config } from "tailwindcss";

export default {
  content: [
    "./sidepanel.html",
    "./popup.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          blurple: "#5865f2",
          "blurple-dark": "#4752c4",
          green: "#57f287",
          yellow: "#fee75c",
          fuchsia: "#eb459e",
          red: "#ed4245",
          white: "#ffffff",
          black: "#23272a",
        },
        surface: {
          900: "#111214",
          800: "#1e1f22",
          700: "#2b2d31",
          600: "#313338",
          500: "#383a40",
          400: "#404249",
          300: "#4e5058",
        },
        text: {
          primary: "#f2f3f5",
          secondary: "#b5bac1",
          muted: "#949ba4",
          link: "#00a8fc",
        },
        channel: {
          text: "#b5bac1",
          voice: "#57f287",
          stage: "#eb459e",
          forum: "#fee75c",
          announcement: "#f0b132",
          media: "#5865f2",
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans"', "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-in": "slideIn 0.25s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "progress-bar": "progressBar 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        progressBar: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
