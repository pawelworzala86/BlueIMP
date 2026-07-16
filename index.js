const fs = require('fs')

let source = fs.readFileSync('./examples/test.bi').toString()

let lines = source.split('/n').map(l=>l.trim())

source = lines.join('\n')

fs.writeFileSync('./examples/test.txt', source)