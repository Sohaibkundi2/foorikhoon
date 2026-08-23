/**
 * `npm run test:report` — runs the suite and prints a per-file pass/fail table.
 *
 * Jest's own output is per-suite but not tallied per file, which is what you want when
 * reporting "N tests, M passing" or checking that a newly configured test database brought
 * the integration suites to life. Exits with Jest's exit code so CI still sees failures.
 */

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const backendRoot = path.resolve(__dirname, '..', '..')
const resultsPath = path.join(backendRoot, 'jest-results.json')

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const jest = spawnSync(npx, ['jest', '--json', `--outputFile=${resultsPath}`, ...process.argv.slice(2)], {
  cwd: backendRoot,
  stdio: ['inherit', 'inherit', 'inherit'],
  shell: process.platform === 'win32'
})

if (!fs.existsSync(resultsPath)) {
  console.error('\nNo results file was produced — see the Jest output above.')
  process.exit(jest.status ?? 1)
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'))
fs.unlinkSync(resultsPath)

const rows = results.testResults
  .map(suite => {
    const relative = suite.name.split('backend').pop().replace(/\\/g, '/').replace(/^\//, '')
    const passed = suite.assertionResults.filter(a => a.status === 'passed').length
    const failed = suite.assertionResults.filter(a => a.status === 'failed').length
    return { relative, passed, failed, total: passed + failed }
  })
  .sort((a, b) => a.relative.localeCompare(b.relative))

const width = Math.max(...rows.map(r => r.relative.length))

console.log('')
for (const row of rows) {
  console.log(
    `${row.relative.padEnd(width)}  total ${String(row.total).padStart(3)}` +
    `  |  pass ${String(row.passed).padStart(3)}` +
    `  |  fail ${String(row.failed).padStart(3)}`
  )
}

console.log('')
console.log(`TOTAL ${results.numTotalTests}  |  pass ${results.numPassedTests}  |  fail ${results.numFailedTests}`)

const failures = results.testResults.flatMap(suite =>
  suite.assertionResults.filter(a => a.status === 'failed').map(a => a.fullName)
)

if (failures.length) {
  console.log('\nFailing:')
  for (const name of failures) console.log(`  ${name}`)
}

process.exit(jest.status ?? 0)
