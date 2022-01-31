import fs from "fs";
import path from "path";

export interface IPage {
  path: string;
  component: string;
}

export interface IPageManifest {
  pages: IPage[];
  customDocument?: string;
}

export async function getPageManifest(
  pagesDir: string
): Promise<IPageManifest> {
  const manifest: IPageManifest = {
    pages: [],
  };

  for (let file of fs.readdirSync(pagesDir)) {
    let Path = path.basename(file, path.extname(file)).toLocaleLowerCase();

    if (Path === "index") {
      Path = "/";
    } else if (Path == "_document") {
      manifest.customDocument = path.join(pagesDir, file);
      continue;
    } else {
      Path = `/${Path}`;
    }

    manifest.pages.push({
      path: Path,
      component: path.join(pagesDir, file),
    });
  }

  return manifest;
}
