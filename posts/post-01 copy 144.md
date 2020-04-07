# Post read

TODO:

```javascript
for (const i in files) {
  const filePath = files[i];

  console.log(filePath);

  // skip files not in /posts/
  if (!RegExp(/^posts\//).test(filePath)) continue;

  const content = await fs.readFile(`./${filePath}`, "utf8");
  const builtContent = marked(content);
  // const newContent = Buffer.from(builtContent).toString("base64");
  const newFilePath = filePath // public/...html
    .replace(/^posts\//, "public/")
    .replace(/\.md$/, ".html");

  postFiles[newFilePath] = builtContent;
}
```

- test this file
- test this file
- test this file
- test this file
- test this file
- test this file
- ...
