const fs = require('fs')

let source = fs.readFileSync('./examples/test.bi').toString()

let lines = source.split('/n').map(l=>l.trim())

lines = lines.map(line=>{
    const parts = line.trim().split(/\s+/)
    console.log(parts)
    return line
})

source = lines.join('\n')

fs.writeFileSync('./examples/test.txt', source)