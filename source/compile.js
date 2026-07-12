const fs = require('fs')
const path = require('path')
const generateExe = require('./make.js')

const sourceFileName = process.argv[2]
const destinationFileName = process.argv[3]

let sourceCode = fs.readFileSync(sourceFileName).toString()
sourceCode = sourceCode.replace(/include .*/gm,match=>{
    let file = match.split('\'')[1].trim()
    try{
        let p = path.resolve(sourceFileName,'../../cache/'+file)
        console.log('include file... ',p)
        const data = fs.readFileSync(p).toString()
        return data
    }catch(e){
        let p = path.resolve(sourceFileName,''+file)
        console.log('include file... ',p)
        const data = fs.readFileSync(p).toString()
        return data
    }
})

generateExe(sourceCode,destinationFileName)