import * as fs from 'fs'
import {Command, flags} from '@oclif/command'
import * as lockfile from '@yarnpkg/lockfile'
import * as semver from 'semver'
import {prompts} from 'prompts'

interface TypeResolution {
  constraints: string[];
  dependency: lockfile.FirstLevelDependency;
}

interface PackageResolution {
  [version: string]: TypeResolution;
}

interface PackageResolutionSet {
  [name: string]: PackageResolution;
}

class CollapseLockfile extends Command {
  static description = 'Collapse yarn.lock dependencies as allowed'

  static flags = {
    version: flags.version(),
    help: flags.help({ char: 'h' }),
    verbose: flags.boolean({ char: 'v' }),
    interactive: flags.boolean({ char: 'i', description: 'Prompt for each collapsed library', default: false }),
    allowDowngrade: flags.boolean({ char: 'd', description: 'Allow resolutions to be downgraded to a pre-existing resolution', default: false }),
    packageFilter: flags.string({ char: 'f', description: 'Regex filter for packages to be modified' }),
  }

  static args = [{ name: 'file' }]

  isVerbose = false

  isInteractive = false

  verbose(...args: any[]) {
    if (this.isVerbose) {
      this.log(args.join(' '))
    }
  }

  async run() {
    const { args, flags } = this.parse(CollapseLockfile)
    this.isVerbose = flags.verbose
    this.isInteractive = flags.interactive

    const filename = args.file
    const file = fs.readFileSync(filename, 'utf8')
    const json: lockfile.LockFileObject = lockfile.parse(file).object

    const packages: PackageResolutionSet = {}

    for (const key of Object.keys(json)) {
      const at = key.lastIndexOf('@')
      const name = key.slice(0, at)
      const constraint = key.slice(at + 1)
      const dependency: lockfile.FirstLevelDependency = json[key]
      const version = dependency.version

      packages[name] = packages[name] || {}
      packages[name][version] = packages[name][version] || { dependency, constraints: [] }
      packages[name][version].constraints.push(constraint)
    }

    for (const pkg of Object.keys(packages)) {
      if (flags.packageFilter && !pkg.match(flags.packageFilter)) {
        continue
      }
      let hasPrinted = false
      const versions = packages[pkg]
      this.verbose('visiting', pkg, Object.keys(versions).join(','))
      const sortedVersions = Object.keys(versions).sort((a, b) => semver.compare(a, b))
      for (const version of sortedVersions) {
        const constraints = versions[version].constraints
        this.verbose(' version', version, constraints)
        for (const otherVersion of Object.keys(versions)) {
          if (version === otherVersion) {
            continue
          }
          const constraints = versions[version]?.constraints
          if (!constraints) {
            continue
          }

          const otherVersionSatisfies = constraints.every(constraint =>
            semver.satisfies(otherVersion, constraint))
          this.verbose('  satisfies', otherVersionSatisfies, version, otherVersion)

          if (otherVersionSatisfies && (flags.allowDowngrade || semver.lt(version, otherVersion))) {
            let replace: any = true
            // eslint-disable-next-line max-depth
            if (this.isInteractive) {
              // eslint-disable-next-line max-depth
              if (!hasPrinted) {
                this.log(`${pkg}:\n  ${
                  sortedVersions.map(v => {
                    return `${v}:\n      ${versions[v].constraints}`
                  }).join('\n  ')}`)
                hasPrinted = true
              }
              // eslint-disable-next-line no-await-in-loop
              replace = (await prompts.confirm({
                name: 'replace',
                type: 'confirm',
                message: `Replace ${pkg} v${version} with ${otherVersion}?`,
                initial: false,
              }))
            }
            // eslint-disable-next-line max-depth
            if (replace) {
              this.verbose('  replacing', pkg, version, 'with', otherVersion)
              versions[otherVersion].constraints.push(...constraints)
              delete versions[version]
            }
          }
        }
      }
    }

    const newJson: lockfile.LockFileObject = {}
    Object.keys(packages).forEach(pkg => {
      Object.keys(packages[pkg]).forEach(version => {
        const resolution = packages[pkg][version]
        resolution.constraints.forEach(constraint => {
          const key = `${pkg}@${constraint}`
          newJson[key] = resolution.dependency
        })
      })
    })
    fs.writeFileSync(filename, lockfile.stringify(newJson))
  }
}

export = CollapseLockfile
