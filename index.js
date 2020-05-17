const core = require('@actions/core');
const github = require('@actions/github');
const io = require('@actions/io');
const fs = require('fs');
const path = require('path'); 

const ref = github.context.ref;
const pr = github.context.payload.pull_request ? github.context.payload.pull_request.number : null;

core.info(`Build sisyphus in ref '${ref}'.`)
if (ref.startsWith("refs/heads/")) {
    let branch = ref.substring(11);
    core.exportVariable("BRANCH_NAME", branch);
    core.info(`Build sisyphus as branch '${branch}' snapshot.`)
}
else if (ref.startsWith("refs/tags/")) {
    let tag = ref.substring(10);
    core.exportVariable("TAG_NAME", tag);
    core.info(`Build sisyphus as tag '${tag}' release.`)
}
else if (pr != null) {
    let prName = "PR-" + pr;
    core.exportVariable("BRANCH_NAME", prName);
    core.info(`Build sisyphus as pull request '${prName}' snapshot.`)
}
else {
    let sha = github.context.sha.substring(0, 7);
    core.exportVariable("BRANCH_NAME", sha)
    core.info(`Build sisyphus as head '${sha}' snapshot.`)
}

const developer = core.getInput("developer");
let properties = "";

if (developer) {
    properties += `sisyphus.developer=${developer}\n`
}

const release = core.getInput("release");
const snapshot = core.getInput("snapshot");
const dependency = core.getInput("dependency");
const repositories = {};

for (const element of release.split(',').concat(snapshot.split(',')).concat(dependency.split(','))) {
    if (element) {
        repositories[element] = {
            url: core.getInput(`${element}-url`, { required: true }),
            username: core.getInput(`${element}-username`),
            password: core.getInput(`${element}-password`)
        }

        core.info(`Repository '${element}' registered.`)
    }
}

for (const key in repositories) {
    if (repositories.hasOwnProperty(key)) {
        const element = repositories[key];
        properties += `sisyphus.repositories.${key}.url=${element.url}\n`
        if(element.username && element.password) {
            properties += `sisyphus.repositories.${key}.username=${element.username}\n`
            properties += `sisyphus.repositories.${key}.password=${element.password}\n`
        }
    }
}

if(release) {
    properties += `sisyphus.release.repositories=${release}\n`
}
if(snapshot) {
    properties += `sisyphus.snapshot.repositories=${snapshot}\n`
}
if(dependency) {
    properties += `sisyphus.dependency.repositories=${dependency}\n`
}

core.debug(`Properties generated:\n${properties}`);

const propertiesFile = path.resolve('gradle.properties');
fs.writeFile(propertiesFile, properties, () => {
    core.info(`Properties wrote to '${propertiesFile}'.`);
});