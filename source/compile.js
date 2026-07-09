const generateExe = require('./make.js')

const sourceFileName = process.argv[2]
const destinationFileName = process.argv[3]

generateExe(sourceFileName,destinationFileName)