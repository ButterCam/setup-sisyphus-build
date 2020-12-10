import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

async function run(): Promise<void> {
  const gradleUserHome =
    process.env['GRADLE_USER_HOME'] || path.resolve(os.homedir(), '.gradle')
  const propertiesFile = path.resolve(gradleUserHome, 'gradle.properties')
  const bakPropertiesFile = path.resolve(
    gradleUserHome,
    'gradle.properties.bak'
  )

  await fs.promises.unlink(propertiesFile)
  if (fs.existsSync(bakPropertiesFile)) {
    await fs.promises.rename(bakPropertiesFile, propertiesFile)
  }
}

run()
