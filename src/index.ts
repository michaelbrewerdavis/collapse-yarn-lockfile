import * as fs from 'fs'
import {Command, flags} from '@oclif/command'
import * as lockfile from '@yarnpkg/lockfile'
import * as semver from 'semver'

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
    help: flags.help({char: 'h'}),
    verbose: flags.boolean({char: 'v'}),
  }

  static args = [{name: 'file'}]

  isVerbose = true

  verbose(...args: any[]) {
    if (this.isVerbose) {
      this.log(args.join(' '))
    }
  }

  async run() {
    const {args, flags} = this.parse(CollapseLockfile)
    this.isVerbose = flags.verbose

    const filename = args.file
    const file = fs.readFileSync(filename, 'utf8')
    const json: lockfile.LockFileObject = lockfile.parse(file).object

    const packages: PackageResolutionSet = {}

    Object.keys(json).forEach(key => {
      const at = key.lastIndexOf('@')
      const name = key.slice(0, at)
      const constraint = key.slice(at + 1)
      const dependency: lockfile.FirstLevelDependency = json[key]
      const version = dependency.version

      packages[name] = packages[name] || {}
      packages[name][version] = packages[name][version] || {dependency, constraints: []}
      packages[name][version].constraints.push(constraint)
    })

    Object.keys(packages).forEach(pkg => {
      const versions = packages[pkg]
      this.verbose('visiting', pkg, Object.keys(versions).join(','))
      Object.keys(versions).sort((a, b) => semver.compare(a, b)).forEach(version => {
        const constraints = versions[version].constraints
        this.verbose(' version', version, constraints)
        Object.keys(versions).forEach(otherVersion => {
          if (version === otherVersion) {
            return
          }
          const constraints = versions[version]?.constraints
          if (!constraints) {
            return
          }

          const otherVersionSatisfies = constraints.every(constraint =>
            semver.satisfies(otherVersion, constraint))
          this.verbose('  satisfies', otherVersionSatisfies, version, otherVersion)

          if (otherVersionSatisfies && semver.lt(version, otherVersion)) {
            this.verbose('  replacing', pkg, version, 'with', otherVersion)
            versions[otherVersion].constraints.push(...constraints)
            delete versions[version]
          }
        })
      })
    })

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
    // this.log(JSON.stringify(packages, null, ' '))
    // this.log(JSON.stringify(newJson, null, ' '))
    this.log(lockfile.stringify(newJson))
  }
}

export = CollapseLockfile
