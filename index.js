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
      await handleNewPosts(filesAdded, githubToken, payload);
    // if (filesModified.length)
    // if (filesRemoved.length)

    // core.setOutput("time", time);
    // Get the JSON webhook payload for the event that triggered the workflow
    // const payloadData = JSON.stringify(payload, undefined, 2);
    // console.log(`The event payload: ${payloadData}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

async function handleNewPosts(filesAdded, githubToken, payload) {
  const octokit = new github.GitHub(githubToken);
  const username = payload.head_commit.author.username;
  const repo = payload.repository.name;
  const builtMarkup = {};

  for (const i in filesAdded) {
    const filePath = filesAdded[i];

    // skip files not in /posts/
    if (RegExp(/^posts\//).test(filePath)) continue;

    const result = await octokit.repos.getContents({
      owner: username,
      repo: repo,
      path: filePath
    });
    // content will be base64 encoded
    const content = Buffer.from(result.data.content, "base64").toString();
    const newFilePath = filePath // build/...html
      .replace(/^posts\//, "")
      .replace(/\.md$/, ".html");

    builtMarkup[newFilePath] = marked(content);
    // builtMarkup[filePath] = Buffer.from(marked(content)).toString("base64");
  }

  const changes = {
    files: {
      'README.md': 'Update from octokit' //Buffer.from('Content from octokit.').toString('base64')
    },
    commit: 'Update from octokit'
  };

  // push built posts
  push(octokit, {
    owner: username,
    repo: repo,
    base: "master",
    head: "master",
    changes: changes
  })
    .then(result => {
      console.log(result);
    })
    .catch(err => {
      console.error(err);
    });

  // update file
  // const commitData = {
  //   owner: username,
  //   repo: repo,
  //   path: `build/${username}.third-post.html`,
  //   // sha: "ee61611dd820f9d275fe35f66216595b71c0535f",
  //   message: "[NEW POST]",
  //   content: Buffer.from(`<!-- dummy post -->`).toString("base64")
  // };

  // octokit.repos.createOrUpdateFile(commitData);
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
    per_page: 1
  });
  let latestCommitSha = response.data[0].sha;
  const treeSha = response.data[0].commit.tree.sha;

  response = await octokit.git.createTree({
    owner,
    repo,
    base_tree: treeSha,
    tree: Object.keys(changes.files).map(path => {
      // shut up the compiler...
      const mode = "100644";
      return {
        path,
        mode,
        content: changes.files[path]
      };
    })
  });
  const newTreeSha = response.data.sha;

  response = await octokit.git.createCommit({
    owner,
    repo,
    message: changes.commit,
    tree: newTreeSha,
    parents: [latestCommitSha]
  });
  latestCommitSha = response.data.sha;

  // HttpError: Reference does not exist
  return await octokit.git.updateRef({
    owner,
    repo,
    sha: latestCommitSha,
    ref: `refs/heads/${head}`,
    force: true
  });

  // HttpError: Reference already exists
  // return await octokit.git.createRef({
  //   owner,
  //   repo,
  //   sha: latestCommitSha,
  //   ref: `refs/heads/${head}`
  // })
}
