const core = require("@actions/core");
const github = require("@actions/github");
const getChangedFiles = require("./getChangedFiles");

try {
  const payload = github.context.payload;
  const githubToken = core.getInput("github_token");
  // const filesAdded = core.getInput("files_added");
  // const filesDeleted = core.getInput("files_deleted");
  // const filesRenamed = core.getInput("files_renamed");
  // const filesModified = core.getInput("files_modified");

  // console.log(`filesAdded: ${filesAdded}`);
  // console.log(`filesDeleted: ${filesDeleted}`);
  // console.log(`filesRenamed: ${filesRenamed}`);
  // console.log(`filesModified: ${filesModified}`);

  console.log(JSON.stringify(getChangedFiles(), undefined, 2));

  //   createFile(githubToken, payload);

  //   core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payloadData = JSON.stringify(github, undefined, 2);
  console.log(`The event payload: ${payloadData}`);
} catch (error) {
  core.setFailed(error.message);
}

function createFile(githubToken, payload) {
  const octokit = new github.GitHub(githubToken);
  const username = payload.head_commit.author.username;
  const repo = payload.repository.name;
  const commitData = {
    owner: username,
    repo: repo,
    path: `build/${username}.third-post.html`,
    // sha: "ee61611dd820f9d275fe35f66216595b71c0535f",
    message: "[NEW POST]",
    content: Buffer.from(`<!-- dummy post -->`).toString("base64")
  };

  octokit.repos.createOrUpdateFile(commitData);
}
