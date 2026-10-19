import ts from "typescript";
import { readFile, readdir } from "node:fs/promises";
import { english } from "../lib/translations";
import { gameModes } from "../lib/modes";
import { modeGuides } from "../lib/mode-guides";
import { kindLabels } from "../lib/content";
const texts = new Set<string>();
async function scan(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      await scan(path);
      continue;
    }
    if (
      !/\.tsx?$/.test(entry.name) ||
      /translations|seeds|localization|language-registry/.test(entry.name)
    )
      continue;
    const content = await readFile(path, "utf8"),
      file = ts.createSourceFile(
        entry.name,
        content,
        ts.ScriptTarget.Latest,
        true,
        entry.name.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
    function strings(node: ts.Node) {
      if (
        ts.isStringLiteral(node) &&
        /[A-ZÄÖÜa-zäöüß]/.test(node.text) &&
        node.text.length > 1
      )
        texts.add(node.text);
      else if (ts.isConditionalExpression(node)) {
        strings(node.whenTrue);
        strings(node.whenFalse);
      }
    }
    function visit(node: ts.Node) {
      if (
        (ts.isCallExpression(node) &&
          (node.expression.getText(file) === "t" ||
            node.expression.getText(file) === "GameError")) ||
        (ts.isNewExpression(node) &&
          node.expression.getText(file) === "GameError")
      )
        for (const argument of node.arguments ?? []) strings(argument);
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
}
await Promise.all(["components", "lib", "db", "app"].map(scan));
for (const mode of gameModes)
  for (const key of [
    "title",
    "description",
    "headline",
    "intro",
    "details",
    "rule",
    "promptLabel",
    "question",
    "hint",
    "revealTitle",
    "scoreLabel",
  ] as const)
    if (mode[key]) texts.add(mode[key]);
for (const guide of Object.values(modeGuides))
  for (const text of [
    guide.category,
    guide.scoring,
    guide.tip,
    ...guide.steps.flatMap((step) => [step.title, step.text]),
  ])
    texts.add(text);
Object.values(kindLabels).forEach((value) => texts.add(value));
const missing = [...texts].filter((text) => !english[text]).sort();
if (missing.length) {
  console.log(missing.join("\n"));
  if (process.argv.includes("--check")) process.exitCode = 1;
} else if (process.argv.includes("--check"))
  console.log("All checked interface texts have an English translation.");
