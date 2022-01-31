import fs from "fs";
import path from "path";

export interface IPage {
  path: string;
  component: string;
}

export interface IPageManifest {
  pages: IPage[];
}

export async function getPageManifest(pagesDir: string): Promise<IPageManifest> {
  const routes = new Set<IPage>([]);

  for (let file of fs.readdirSync(pagesDir)) {
    let Path = path.basename(file, path.extname(file)).toLocaleLowerCase();

    if (Path === "index") {
      Path = "/";
    } else {
      Path = `/${Path}`;
    }

    routes.add({
      path: Path,
      component: path.join(pagesDir, file),
    });
  }

  return {
    pages: Array.from(routes),
  };
}
