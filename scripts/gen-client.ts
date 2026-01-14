import { createFromRoot } from "codama";
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { renderVisitor as renderRustVisitor } from "@codama/renderers-rust";
import { renderVisitor as renderJavaScriptVisitor } from "@codama/renderers-js";
import { command, run, string, positional } from "cmd-ts";
import { readFileSync } from "fs";

const cmd = command({
  name: "gen-client",
  description: "Generate Codama clients (Rust and TypeScript)",
  version: "1.0.0",
  args: {
    idl_path: positional({ type: string, displayName: "idl-path" }),
    rust_path: positional({ type: string, displayName: "rust-output-path" }),
    ts_path: positional({ type: string, displayName: "ts-output-path" }),
  },
  handler: async (args) => {
    await createClient(args.idl_path, args.rust_path, args.ts_path);
  },
});

async function createClient(
  idl_path: string,
  rust_path: string,
  ts_path: string
) {
  const json = JSON.parse(readFileSync(idl_path).toString());
  // @ts-ignore
  const codama = createFromRoot(rootNodeFromAnchor(json));

  console.log(`Generating Rust client at: ${rust_path}`);
  // @ts-ignore
  codama.accept(renderRustVisitor(rust_path));

  console.log(`Generating TypeScript client at: ${ts_path}`);
  // @ts-ignore
  await codama.accept(renderJavaScriptVisitor(ts_path));
}

run(cmd, process.argv.slice(2))
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
