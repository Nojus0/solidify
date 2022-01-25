import path from "path";
import rollup from "rollup";
import fs from "fs";
import { Component } from "solid-js";

export async function build(srcDir: string) {
  const pagesDir = path.join(srcDir, "pages");
  const publicDir = path.join(srcDir, "public");

  const pages = await getPages(pagesDir);

  console.log(pages);
}

async function getPages(pagesDir: string) {
  const pages = new Set((await fs.promises.readdir(pagesDir)) || []);

  return pages;
}
