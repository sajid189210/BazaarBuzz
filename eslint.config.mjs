import globals from "globals";
import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { languageOptions: { globals: { ...globals.browser, Swal: "writable", Cropper: "writable", ntc: "writable" } } },
  pluginJs.configs.recommended,
];