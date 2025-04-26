// postcss.config.cjs
/** @type {import('postcss').ProcessOptions} */
module.exports = {
  plugins: {
    // Use the dedicated Tailwind PostCSS plugin
    "@tailwindcss/postcss": {},
    // Keep autoprefixer if you still need vendor prefixes
    autoprefixer: {},
  },
}
