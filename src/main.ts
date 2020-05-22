import * as core from '@actions/core'
import * as github from '@actions/github'
import * as io from '@actions/io'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

async function run(): Promise<void> {
  try {
    let properties = ''
    const ref = github.context.ref
    const pr = github.context.payload.pull_request?.number

    core.info(`Build sisyphus in ref '${ref}'.`)
    if (ref.startsWith('refs/heads/')) {
      const branch = ref.substring(11)
      core.exportVariable('BRANCH_NAME', branch)
      core.info(`Build sisyphus as branch '${branch}' snapshot.`)
    } else if (ref.startsWith('refs/tags/')) {
      const tag = ref.substring(10)
      core.exportVariable('TAG_NAME', tag)
      core.info(`Build sisyphus as tag '${tag}' release.`)
    } else if (pr != null) {
      const prName = `PR-${pr}`
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

    const release = core.getInput('release')
    const config = core.getInput('config')
    const docker = core.getInput('docker')
    const snapshot = core.getInput('snapshot')
    const dependency = core.getInput('dependency')
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
      'snapshot'
    ]

    const registeredReposiotriesName = embeddedRepositories.concat(
      release.split(','),
      snapshot.split(','),
      dependency.split(','),
      config.split(','),
      docker.split(',')
    )

    for (const element of registeredReposiotriesName) {
      if (element) {
        const url = core.getInput(`${element}-url`)
        if (url) {
          repositories[element] = {
            url,
            username: core.getInput(`${element}-username`),
            password: core.getInput(`${element}-password`)
          }
          core.info(`Repository '${element}' registered.`)
        }
      }
    }

    for (const key in repositories) {
      if (repositories.hasOwnProperty(key)) {
        const element = repositories[key]
        properties += `sisyphus.repositories.${key}.url=${element.url}\n`
        if (element.username && element.password) {
          properties += `sisyphus.repositories.${key}.username=${element.username}\n`
          properties += `sisyphus.repositories.${key}.password=${element.password}\n`
        }
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

    const gradlePortalKey = core.getInput('gradle-portal-key')
    if (gradlePortalKey) {
      properties += `gradle.publish.key=${gradlePortalKey}\n`
    }
    const gradlePortalSecret = core.getInput('gradle-portal-secret')
    if (gradlePortalSecret) {
      properties += `gradle.publish.secret=${gradlePortalSecret}\n`
    }

    const gpgKeyName = core.getInput('gpg-key-name')
    if (gpgKeyName) {
      properties += `signing.gnupg.executable=gpg\n`
      properties += `signing.gnupg.keyName=${gpgKeyName}\n`
    }

    core.debug(`Properties generated:\n${properties}`)

    const gradleUserHome =
      process.env['GRADLE_USER_HOME'] || path.resolve(os.homedir(), '.gradle')

    await io.mkdirP(gradleUserHome)
    const propertiesFile = path.resolve(gradleUserHome, 'gradle.properties')
    fs.writeFile(propertiesFile, properties, () => {
      core.info(`Properties wrote to '${propertiesFile}'.`)
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
