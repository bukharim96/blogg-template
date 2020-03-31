const core = require("@actions/core");
const github = require("@actions/github");

try {
  const githubToken = core.getInput("github_token");
  const filesAdded = core.getInput("files_added");
  const filesModified = core.getInput("files_modified");
  const filesRemoved = core.getInput("files_removed");
  const payload = github.context.payload;

  console.log(`filesAdded: ${filesAdded}`);
  console.log(`filesModified: ${filesModified}`);
  console.log(`filesRemoved: ${filesRemoved}`);
  
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
