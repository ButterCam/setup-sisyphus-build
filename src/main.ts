import * as core from '@actions/core'
import * as github from '@actions/github'
import * as io from '@actions/io'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {mergeCatalogsToml} from './toml'

async function run(): Promise<void> {
  try {
    let properties = ''
    const ref = github.context.ref
    core.info(`Build sisyphus in ref '${ref}'.`)
    let pr
    let octokit = null
    if (
      core.getInput('github-token') &&
      github.context.payload.pull_request != null
    ) {
      octokit = github.getOctokit(core.getInput('github-token'))
      const {data} = await octokit.rest.pulls.get({
        owner: github.context.payload.repository?.owner?.login ?? '',
        repo: github.context.payload.repository?.name ?? '',
        pull_number: github.context.payload.pull_request.number
      })
      pr = data
    } else {
      pr = github.context.payload.pull_request
    }

    if (ref.startsWith('refs/heads/')) {
      const branch = ref.substring(11)
      core.exportVariable('BRANCH_NAME', branch)
      core.info(`Build sisyphus as branch '${branch}' snapshot.`)
    } else if (ref.startsWith('refs/tags/')) {
      const tag = ref.substring(10)
      core.exportVariable('TAG_NAME', tag)
      core.info(`Build sisyphus as tag '${tag}' release.`)
    } else if (pr) {
      const prName = `PR-${pr.number}`
      core.exportVariable('BRANCH_NAME', prName)
      core.info(`Build sisyphus as pull request '${prName}' snapshot.`)
    } else {
      const sha = github.context.sha.substring(0, 7)
      core.exportVariable('BRANCH_NAME', sha)
      core.info(`Build sisyphus as head '${sha}' snapshot.`)
    }

    const developer = core.getInput('developer')
    if (developer) {
      properties += `sisyphus.developer=${developer}\n`
    }

    const release = core.getInput('release-repositories')
    const config = core.getInput('config-repositories')
    const npm = core.getInput('npm-repositories')
    const docker = core.getInput('docker-repositories')
    const snapshot = core.getInput('snapshot-repositories')
    const dependency = core.getInput('dependency-repositories')
    const repositories: {
      [key: string]: {
        url: string
        username: string
        password: string
      }
    } = {}
    const embeddedRepositories = [
      'local',
      'central',
      'jcenter',
      'portal',
      'release',
      'snapshot',
      'npm'
    ]

    const registeredReposiotriesName = embeddedRepositories.concat(
      release.split(','),
      snapshot.split(','),
      dependency.split(','),
      config.split(','),
      docker.split(',')
    )

    for (const element of registeredReposiotriesName) {
      const name = element.trim()
      if (name) {
        const url = core.getInput(`${name}-url`)
        if (url && !repositories[name]) {
          repositories[name] = {
            url,
            username: core.getInput(`${name}-username`),
            password: core.getInput(`${name}-password`)
          }
          core.info(`Repository '${name}' registered.`)
        }
      }
    }

    for (const key in repositories) {
      if (repositories.hasOwnProperty(key)) {
        const element = repositories[key]
        properties += `sisyphus.repositories.${key}.url=${element.url}\n`
        properties += `sisyphus.repositories.${key}.username=${element.username}\n`
        properties += `sisyphus.repositories.${key}.password=${element.password}\n`
      }
    }

    if (release) {
      properties += `sisyphus.release.repositories=${release}\n`
    }
    if (snapshot) {
      properties += `sisyphus.snapshot.repositories=${snapshot}\n`
    }
    if (dependency) {
      properties += `sisyphus.dependency.repositories=${dependency}\n`
    }
    if (docker) {
      properties += `sisyphus.docker.repositories=${docker}\n`
    }
    if (config) {
      properties += `sisyphus.config.repositories=${config}\n`
    }
    if (config) {
      properties += `sisyphus.npm.repositories=${npm}\n`
    }

    const gradlePortalKey = core.getInput('gradle-portal-key')
    if (gradlePortalKey) {
      properties += `gradle.publish.key=${gradlePortalKey}\n`
    }
    const gradlePortalSecret = core.getInput('gradle-portal-secret')
    if (gradlePortalSecret) {
      properties += `gradle.publish.secret=${gradlePortalSecret}\n`
    }
    const gradleJvmArgs = core.getInput('gradle-jvm-args')
    if (gradleJvmArgs) {
      properties += `org.gradle.jvmargs=${gradleJvmArgs}\n`
    }

    const gpgKeyName = core.getInput('gpg-key-name')
    if (gpgKeyName) {
      properties += `signing.gnupg.executable=gpg\n`
      properties += `signing.gnupg.keyName=${gpgKeyName}\n`
    }

    const prBody = pr?.body
    if (prBody) {
      const matches = prBody.match(/```gradle\.properties([\s\S]+?)```/i)
      if (matches) {
        properties += matches[1].trim()
        core.startGroup('Merge properties from PR description.')
        core.info(matches[1].trim())
        core.endGroup()
        properties += '\n'
      }
    }

    core.debug(`Properties generated:\n${properties}`)

    if (prBody) {
      const matches = prBody.match(/```lib.versions.toml([\s\S]+?)```/i)
      if (matches) {
        const mergingCatalogString = matches[1].trim()

        core.startGroup('Merge version catalog from PR description.')
        core.info(mergingCatalogString)
        core.endGroup()

        let toml = ''
        if (fs.existsSync('./gradle/libs.versions.toml')) {
          toml = await fs.promises.readFile(
            './gradle/libs.versions.toml',
            'utf8'
          )
        }

        const merged = mergeCatalogsToml(toml, mergingCatalogString)
        core.debug(`Version catalog merged:\n${merged}`)

        if (merged.trim().length > 0) {
          await fs.promises.writeFile('./gradle/libs.versions.toml', merged)
        }
      }
    }

    const gradleUserHome =
      process.env['GRADLE_USER_HOME'] || path.resolve(os.homedir(), '.gradle')

    await io.mkdirP(gradleUserHome)
    const propertiesFile = path.resolve(gradleUserHome, 'gradle.properties')
    const bakPropertiesFile = path.resolve(
      gradleUserHome,
      'gradle.properties.bak'
    )

    if (fs.existsSync(propertiesFile)) {
      await fs.promises.copyFile(propertiesFile, bakPropertiesFile)
      await fs.promises.appendFile(propertiesFile, properties)
    } else {
      await fs.promises.writeFile(propertiesFile, properties)
    }

    core.info(`Properties wrote to '${propertiesFile}'.`)
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

// eslint-disable-next-line github/no-then
run().catch(error => {
  core.error(error)
  core.setFailed(error)
})
