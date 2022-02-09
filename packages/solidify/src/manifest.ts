import fs, { stat } from "fs";
import path from "path/posix";

export interface IPage {
  path: string;
  component: string;
}

export interface IPageManifest {
  pages: IPage[];
  customDocument?: string;
  customApp?: string;
}

export async function getPageManifest(
  pagesDir: string
): Promise<IPageManifest> {
  const manifest: IPageManifest = {
    pages: [],
  };

  const dfs = (directory: string) => {
    const files = fs.readdirSync(directory);

    for (let file of files) {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      const isFolder = stats.isDirectory();

      if (isFolder) {
        dfs(filePath);
      } else {
        const { name, dir } = path.parse(filePath);

        if (name == "_document") {
          manifest.customDocument = path.join(directory, file);
          continue;
        } else if (name == "_app") {
          manifest.customApp = path.join(directory, file);
          continue;
        }

        const relative = path.relative(pagesDir, dir);

        if (/^\[.*|.*\]$/gm.test(name)) {
          let transformed = `:${name.replace(/\[|\]/gm, "")}`;

          manifest.pages.push({
            component: filePath,
            path: relative ? `/${relative}/${transformed}` : `/${transformed}`,
          });
          continue;
        }

        manifest.pages.push({
          component: filePath,
          path:
            name === "index"
              ? "/"
              : relative
              ? `/${relative}/${name}`
              : `/${name}`,
        });
      }
    }
  };

  dfs(pagesDir);
  console.log(manifest);
  return manifest;
}
