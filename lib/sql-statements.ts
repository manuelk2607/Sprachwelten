/** Split trusted PostgreSQL migration files under standard_conforming_strings.
 * Semicolons inside function bodies, literals, identifiers or comments are data. */
export function sqlStatements(source: string) {
  const statements: string[] = [];
  let start = 0,
    quote = "",
    dollar = "",
    block = 0,
    line = false,
    escaped = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i],
      next = source[i + 1];
    if (line) {
      if (c === "\n") line = false;
      continue;
    }
    if (block) {
      if (c === "/" && next === "*") {
        block++;
        i++;
      } else if (c === "*" && next === "/") {
        block--;
        i++;
      }
      continue;
    }
    if (dollar) {
      if (source.startsWith(dollar, i)) {
        i += dollar.length - 1;
        dollar = "";
      }
      continue;
    }
    if (quote) {
      if (escaped && c === "\\") {
        i++;
        continue;
      }
      if (c === quote) {
        if (next === quote) i++;
        else quote = "";
      }
      continue;
    }
    if (c === "-" && next === "-") {
      line = true;
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      block = 1;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      escaped =
        c === "'" &&
        /[eE]/.test(source[i - 1] ?? "") &&
        !/[A-Za-z0-9_$]/.test(source[i - 2] ?? "");
      continue;
    }
    if (c === "$" && !/[A-Za-z0-9_$]/.test(source[i - 1] ?? "")) {
      const tag = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(source.slice(i));
      if (tag) {
        dollar = tag[0];
        i += dollar.length - 1;
        continue;
      }
    }
    if (c === ";") {
      const sql = source.slice(start, i).trim();
      if (sql) statements.push(sql);
      start = i + 1;
    }
  }
  if (quote || dollar || block)
    throw new Error("Unterminated SQL migration literal or comment");
  const last = source.slice(start).trim();
  if (last) statements.push(last);
  return statements;
}
