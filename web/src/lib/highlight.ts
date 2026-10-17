/**
 * 轻量 Python 语法着色器（展示用途，非完整解析器）
 * 将一行代码切分为 [{text, cls}] 片段供 <CodeView> 渲染
 */

export interface Token {
  text: string;
  cls?: string;
}

const KEYWORDS = new Set([
  "import", "from", "as", "def", "class", "return", "if", "elif", "else", "for",
  "while", "in", "not", "and", "or", "is", "with", "try", "except", "finally",
  "raise", "pass", "break", "continue", "lambda", "global", "nonlocal", "assert",
  "yield", "del", "None", "True", "False", "self", "super", "async", "await",
]);

const TOKEN_RE =
  /(#[^\n]*)|('''[\s\S]*?'''|"""[\s\S]*?"""|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(@[A-Za-z_][\w.]*)|(\b\d[\d_.]*(?:e[+-]?\d+)?\b)|([A-Za-z_][\w]*)/g;

export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line)) !== null) {
    if (m.index > last) tokens.push({ text: line.slice(last, m.index) });
    const [full, comment, str, dec, num, word] = m;
    if (comment) tokens.push({ text: full, cls: "tok-com" });
    else if (str) tokens.push({ text: full, cls: "tok-str" });
    else if (dec) tokens.push({ text: full, cls: "tok-dec" });
    else if (num) tokens.push({ text: full, cls: "tok-num" });
    else if (word) {
      if (KEYWORDS.has(word)) tokens.push({ text: full, cls: "tok-kw" });
      else {
        // 后跟 '(' 的标识符视为函数/类调用
        const rest = line.slice(m.index + full.length);
        if (/^\s*\(/.test(rest)) {
          const prev = line.slice(last, m.index).trimEnd();
          const isClassDef = /class\s+$/.test(prev);
          tokens.push({ text: full, cls: isClassDef ? "tok-cls" : undefined });
        } else {
          const prev = line.slice(last, m.index).trimEnd();
          if (/class\s+$/.test(prev)) tokens.push({ text: full, cls: "tok-cls" });
          else tokens.push({ text: full });
        }
      }
    }
    last = m.index + full.length;
  }
  if (last < line.length) tokens.push({ text: line.slice(last) });
  return tokens;
}
