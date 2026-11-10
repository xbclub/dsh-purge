import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sealSlot } from "../lib/table-key.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// 提示词源按语言分文件存放：default-prompt-inject.<lang>.md。
// 加密槽只承载一份正文（openSlot() 返回单个字符串），因此一次只嵌入一种语言，
// 默认中文；需要英文版时用 DSH_PURGE_PROMPT_LANG=en 覆盖。
const lang = (process.env.DSH_PURGE_PROMPT_LANG || "zh").trim().toLowerCase();
if (!/^[a-z]{2}(-[a-z]{2})?$/.test(lang)) {
  throw new Error(`invalid DSH_PURGE_PROMPT_LANG: ${lang}`);
}
const src = path.join(root, "lib", `default-prompt-inject.${lang}.md`);
const dest = path.join(root, "lib", "asset-table.js");

if (!fs.existsSync(src)) {
  throw new Error(`missing local source: ${src}`);
}

const text = fs.readFileSync(src, "utf8");
if (!text.trim()) throw new Error("local source is empty");

const packed = sealSlot(text);
const chunk = (s, n = 96) => {
  const out = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
};

const out = `const SLOT_ROWS = ${JSON.stringify(chunk(packed.SLOT), null, 2)};

export const SLOT = SLOT_ROWS.join("");
export const MASK = ${JSON.stringify(packed.MASK)};
export const TAG = ${JSON.stringify(packed.TAG)};
export const IV = ${JSON.stringify(packed.IV)};
`;

fs.writeFileSync(dest, out, "utf8");
process.stdout.write(`wrote ${path.relative(root, dest)} bytes=${text.length}\n`);
