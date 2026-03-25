import { Router, Request, Response } from "express";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = join(__dirname, "../../schema.yaml");

router.get("/schema.yaml", (_req: Request, res: Response) => {
  const schema = readFileSync(schemaPath, "utf-8");
  res.type("text/yaml").send(schema);
});

router.get("/api-docs", (_req: Request, res: Response) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <title>API Documentation</title>
    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css" />
    <style>
      html, body { height: 100%; margin: 0; }
    </style>
  </head>
  <body>
    <elements-api
      apiDescriptionUrl="/schema.yaml"
      router="hash"
      layout="sidebar"
    />
  </body>
</html>`);
});

export default router;
