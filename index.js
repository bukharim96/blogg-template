const core = require("@actions/core");
const github = require("@actions/github");

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

  console.log(`filesAdded: ${filesAdded}`);

  for (const i in filesAdded) {
    const filePath = filesAdded[i];

    console.log(filePath);
    const result = await octokit.repos.getContents({
      owner: username,
      repo: repo,
      path: filePath
    });
    // content will be base64 encoded
    const content = Buffer.from(result.data.content, "base64").toString();
    console.log(`${filePath}: ${content}`);
  }

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
