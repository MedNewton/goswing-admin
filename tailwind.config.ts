import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        status: {
          published: "#10B981",
          draft: "#F59E0B",
          pending: "#F59E0B",
          confirmed: "#10B981",
          completed: "#3B82F6",
          cancelled: "#EF4444",
        },
      },
    },
  },
  plugins: [],
};

export default config;
