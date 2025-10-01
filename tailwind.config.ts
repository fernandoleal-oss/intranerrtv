// postcss.config.js (ESM, seu package.json já tem "type":"module")
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default {
  plugins: [
    tailwindcss({ config: "./tailwind.config.ts" }), // <- força usar o TS
    autoprefixer(),
  ],
};
