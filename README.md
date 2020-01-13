collapse-yarn-lockfile
=================

Collapse redundant dependencies in yarn lockfile.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/collapse-yarn-lockfile.svg)](https://npmjs.org/package/collapse-yarn-lockfile)
[![Downloads/week](https://img.shields.io/npm/dw/collapse-yarn-lockfile.svg)](https://npmjs.org/package/collapse-yarn-lockfile)
[![License](https://img.shields.io/npm/l/collapse-yarn-lockfile.svg)](https://github.com/michaelbrewerdavis/collapse-yarn-lockfile/blob/master/package.json)

This package analyzes a yarn lockfile for dependencies that could be met by a pre-existing resolution and outputs
a new lockfile which uses that dependency.

# Usage
```sh-session
QUICK START
  $ npx collapse-yarn-lockfile yarn.lock > yarn.lock

  # remove orphaned dependencies
  $ yarn

USAGE
  $ collapse-yarn-lockfile [FILE]

OPTIONS
  -d, --downgrade  Allow resolutions to be downgraded to a pre-existing resolution
  -h, --help       show CLI help
  -v, --verbose
  --version        show CLI version
```
