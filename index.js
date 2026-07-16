const fs = require('fs')

let source = fs.readFileSync('./examples/test.bi').toString()

let lines = source.split('\n').map(l=>l.trim())

function toHex(num, length) {
    return num.toString(16).toUpperCase().padStart(length*2, "0")
}
function floatToHex32(value) {
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    view.setFloat32(0, value, true) // little-endian
    let hex = ""
    for (let i = 0; i < 4; i++) {
        hex += view.getUint8(i).toString(16).padStart(2, "0").toUpperCase()
    }
    return hex
}
function floatToHex64(value) {
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    view.setFloat64(0, value, true) // little-endian
    let hex = ""
    for (let i = 0; i < 8; i++) {
        hex += view.getUint8(i).toString(16).padStart(2, "0").toUpperCase()
    }
    return hex
}
function intToHexSigned(value, bytes) {
    const max = 2 ** (bytes * 8)
    let unsigned = value
    // konwersja ujemnych na two's complement
    if (value < 0) {
        unsigned = max + value
    }
    return unsigned
        .toString(16)
        .toUpperCase()
        .padStart(bytes * 2, "0")
}
function numToHex(num,bytes=8){
    if(num.endsWith('f')||(num.indexOf('.')>-1)){
        num = num.replace('f','')
        if(bytes==4){
            return floatToHex32(Number(num))
        }
        return floatToHex64(Number(num))
    }else if(num.endsWith('i')){
        num = num.replace('i','')
        return intToHexSigned(Number(num),bytes)
    }else if(parseInt(num.replace('u',''))||(Number(num)==0)){
        num = num.replace('u','')
        return toHex(Number(num),bytes)
    }
    return null
}

function formatHex(hex) {
    return hex
        .replace(/[^0-9A-Fa-f]/g, "")   // usuń śmieci
        .match(/.{1,2}/g)               // grupy po 2 znaki
        .join(' ')                      // separator
        .toUpperCase()
}

function txtToHex(text, bytes) {
    let hex = "";

    // konwersja znaków na hex
    for (let i = 0; i < text.length; i++) {
        hex += text.charCodeAt(i)
            .toString(16)
            .toUpperCase()
            .padStart(2, "0");
    }

    // wyrównanie do podanej liczby bajtów
    const needed = bytes * 2 - hex.length;
    if (needed > 0) {
        hex += "0".repeat(needed);
    }

    // formatowanie po 2 znaki
    return hex.match(/.{1,2}/g).join(" ");
}

let newLines = []
let OFFSET = 0
lines.map(line=>{
    const instruction = line.trim().split(/\s+/)[0]
    let parameters = line.replace(instruction,'').trim().split(',')
        .map(p=>p.trim())
    console.log(instruction,parameters)

    let result = ''

    if(['db','dd','dq'].includes(instruction)){
        let bytes = 8
        if(instruction=='dd'){
            bytes = 4
        }else if(instruction=='db'){
            bytes = 1
        }
        parameters = parameters.map(parameter=>{
            const num = numToHex(parameter,bytes)
            if(num===null){
                parameter = parameter.substring(1,parameter.length-1)
                return txtToHex(parameter,bytes)
            }
            return num
        })
        result = parameters.map(formatHex).join(' ')
    }

    OFFSET += result.split(' ').length
    newLines.push(result)
})

source = newLines.join('\n')

fs.writeFileSync('./examples/test.txt', source)