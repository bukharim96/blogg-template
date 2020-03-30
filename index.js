const core = require("@actions/core");
const github = require("@actions/github");

try {
  const authToken = core.getInput("authToken");
  const payload = github.context.payload;

  if (payload.created) console.log("Created files");
  if (payload.deleted) console.log("Deleted files");
  
  createFile(authToken, payload);

  //   core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payloadData = JSON.stringify(github, undefined, 2);
  console.log(`The event payload: ${payloadData}`);
} catch (error) {
  core.setFailed(error.message);
}

function createFile(authToken, payload) {
  const octokit = new github.GitHub(authToken);
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
