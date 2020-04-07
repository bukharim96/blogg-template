const { promises: fs } = require("fs");
const core = require("@actions/core");
const github = require("@actions/github");
const marked = require("marked");

async function run() {
  try {
    const githubToken = core.getInput("github_token");
    const filesAdded = JSON.parse(core.getInput("files_added"));
    const filesModified = JSON.parse(core.getInput("files_modified"));
    const filesRemoved = JSON.parse(core.getInput("files_removed"));
    const payload = github.context.payload;

    if (filesAdded.length)
      await handleNewOrModifiedPosts(filesAdded, githubToken, payload);
    if (filesModified.length)
      await handleNewOrModifiedPosts(filesModified, githubToken, payload);
    if (filesRemoved.length)
      await handleRemovedPosts(filesRemoved, githubToken, payload);

    // Get the JSON webhook payload for the event that triggered the workflow
    // const payloadData = JSON.stringify(payload, undefined, 2);
    // console.log(`The event payload: ${payloadData}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

async function handleNewOrModifiedPosts(files, githubToken, payload) {
  const octokit = new github.GitHub(githubToken);
  const username = payload.head_commit.author.username;
  const repo = payload.repository.name;
  const postFiles = {};

  for (const i in files) {
    const filePath = files[i];

    // skip files not in /posts/
    if (!RegExp(/^posts\//).test(filePath)) continue;

    const content = await fs.readFile(`./${filePath}`, "utf8");
    const builtContent = marked(content);
    // const newContent = Buffer.from(builtContent).toString("base64");
    const newFilePath = filePath // public/...html
      .replace(/^posts\//, "public/")
      .replace(/\.md$/, ".html");

    // postFiles[newFilePath] = newContent;
    postFiles[newFilePath] = builtContent;
  }

  if (!postFiles) return;

  const changes = {
    files: postFiles,
    commit: "[DEVIAN: UPDATE POSTS]",
  };

  // push built posts
  push(octokit, {
    owner: username,
    repo: repo,
    base: "master",
    head: "master",
    changes: changes,
  })
    .then((result) => {
      console.log(result);
    })
    .catch((err) => {
      console.error(err);
    });
}

async function handleRemovedPosts(files, githubToken, payload) {
  const octokit = new github.GitHub(githubToken);
  const username = payload.head_commit.author.username;
  const repo = payload.repository.name;
  const postFiles = {};

  for (const i in files) {
    const filePath = files[i];
    console.log(`deleting: ${filePath}`);

    // skip files not in /posts/
    if (!RegExp(/^posts\//).test(filePath)) continue;

    const newFilePath = filePath // public/...html
      .replace(/^posts\//, "public/")
      .replace(/\.md$/, ".html");

    postFiles[newFilePath] = null;
  }

  if (!postFiles) return;

  const changes = {
    files: postFiles,
    commit: "[DEVIAN: REMOVE POSTS]",
  };

  // push built posts
  push(octokit, {
    owner: username,
    repo: repo,
    base: "master",
    head: "master",
    changes: changes,
  })
    .then((result) => {
      console.log(result);
    })
    .catch((err) => {
      console.error(err);
    });
}

async function push(octokit, { owner, repo, base, head, changes }) {
  let response;

  if (!base) {
    response = await octokit.repos.get({ owner, repo });
    // tslint:disable-next-line:no-parameter-reassignment
    base = response.data.default_branch;
  }

  response = await octokit.repos.listCommits({
    owner,
    repo,
    sha: base,
    per_page: 1,
  });
  let latestCommitSha = response.data[0].sha;
  const treeSha = response.data[0].commit.tree.sha;

  response = await octokit.git.createTree({
    owner,
    repo,
    base_tree: treeSha,
    tree: Object.keys(changes.files).map((path) => {
      // shut up the compiler...
      const mode = "100644";
      const content = changes.files[path];
      let treeNode = {
        path,
        mode,
      };
      // add new content else delete post
      if (content) treeNode.content = content;
      else treeNode.sha = null;

      return treeNode;
    }),
  });
  const newTreeSha = response.data.sha;

  response = await octokit.git.createCommit({
    owner,
    repo,
    message: changes.commit,
    tree: newTreeSha,
    parents: [latestCommitSha],
  });
  latestCommitSha = response.data.sha;

  // HttpError: Reference does not exist
  return await octokit.git.updateRef({
    owner,
    repo,
    sha: latestCommitSha,
    ref: `heads/${head}`,
    force: true,
  });

  // // HttpError: Reference already exists
  // return await octokit.git.createRef({
  //   owner,
  //   repo,
  //   sha: latestCommitSha,
  //   ref: `refs/heads/${head}`,
  // });
}
