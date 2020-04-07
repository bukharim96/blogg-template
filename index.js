const { promises: fs } = require("fs");
const core = require("@actions/core");
const github = require("@actions/github");
const marked = require("marked");
const createPullRequest = require("octokit-create-pull-request");

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

// @TODO: push multiple files in single request
async function handleNewPosts(filesAdded, githubToken, payload) {
  const octokit = new github.GitHub(githubToken);
  // const CPR_Octokit = github.GitHub.plugin(createPullRequest);
  // const octokit = new CPR_Octokit({
  //   auth: githubToken,
  // });
  const username = payload.head_commit.author.username;
  const repo = payload.repository.name;
  const builtPosts = {};

  for (const i in filesAdded) {
    const filePath = filesAdded[i];
    console.log(filePath);

    // skip files not in /posts/
    if (!RegExp(/^posts\//).test(filePath)) continue;

    const content = await fs.readFile(`./${filePath}`, "utf8");
    const builtContent = marked(content);
    const newContent = Buffer.from(builtContent).toString("base64");
    const newFilePath = filePath // public/...html
      .replace(/^posts\//, "public/")
      .replace(/\.md$/, ".html");
    // console.log(`    ${newFilePath}`);
    // console.log(`    ${newContent}`);

    builtPosts[newFilePath] = newContent;
  }

  if (!builtPosts) return;

  const changes = {
    files: builtPosts,
    commit: "[NEW BLOGG POSTS]"
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

  // const prBody = `Adding new posts to: ${JSON.stringify(
  //   Object.keys(builtPosts),
  //   undefined,
  //   2
  // )}`;

  // // Returns a normal Octokit PR response
  // // See https://octokit.github.io/rest.js/#octokit-routes-pulls-create
  // octokit
  //   .createPullRequest({
  //     owner: username,
  //     repo: repo,
  //     title: "[NEW BLOGG POSTS]",
  //     body: prBody,
  //     // base: "master" /* optional: defaults to default branch */,
  //     head: `blogg-builds`,
  //     changes: {
  //       files: builtPosts,
  //       commit: "[NEW BLOGG POSTS]",
  //     },
  //   })
  //   .then(pr => {
  //     // const latestCommitSha = pr.data.sha;
  //     // // HttpError: Reference does not exist
  //     // octokit.git
  //     //   .updateRef({
  //     //     owner: username,
  //     //     repo: repo,
  //     //     sha: latestCommitSha,
  //     //     ref: `refs/heads/master`,
  //     //     force: true
  //     //   })
  //     //   .then(result => console.log(result))
  //     //   .catch(e => console.error(e));
  //   })
  //   .catch((e) => console.error(e));
}

// // update file
// const commitData = {
//   owner: username,
//   repo: repo,
//   path: newFilePath,
//   // sha: "ee61611dd820f9d275fe35f66216595b71c0535f",
//   message: `[NEW BLOGG POST]: ${filePath}`,
//   content: newContent
// };
// octokit.repos.createOrUpdateFile(commitData).catch(e => console.error(e));

// octokit.repos
//   .getContents({
//     owner: username,
//     repo: repo,
//     path: filePath
//   })
//   .then(result => {
//     const content = Buffer.from(result.data.content, "base64").toString();
//     console.log(`    content: ${content}`);
//   }).error(e => console.log(e));

// content will be base64 encoded
// const content = Buffer.from(result.data.content, "base64").toString();
// console.log(`    content: ${content}`);

// {
//   // const changes = {
//   //   files: builtPosts,
//   //   commit: "[NEW BLOGG POSTS]"
//   // };

//   // // push built posts
//   // push(octokit, {
//   //   owner: username,
//   //   repo: repo,
//   //   base: "master",
//   //   head: "master",
//   //   changes: changes
//   // })
//   //   .then(result => {
//   //     console.log(result);
//   //   })
//   //   .catch(err => {
//   //     console.error(err);
//   //   });
// }

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
