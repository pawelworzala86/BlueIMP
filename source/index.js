const fs = require('fs')

let fileName = process.argv[2]

let source = fs.readFileSync('./examples/'+fileName+'.bi').toString()

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

function hexToLE(hex) {
    // usuń ewentualne "0x"
    hex = hex.replace(/^0x/, "");

    // dopaduj do parzystej długości
    if (hex.length % 2 !== 0) hex = "0" + hex;

    // podziel na bajty
    const bytes = hex.match(/.{2}/g);

    // odwróć kolejność
    return bytes.reverse().join("");
}




let newLines = []
let OFFSET = 0
let ADDR = {}
lines.map(line=>{
    line = line.replace(/\;.*/gm,'').trim()

    const instruction = line.trim().split(/\s+/)[0]
    let parameters = line.replace(instruction,'').trim().split(',')
        .map(p=>p.trim())
    //console.log(instruction,parameters)

    let result = ''

    if(['db','dw','dd','dq'].includes(instruction)){
        let bytes = 8
        if(instruction=='dd'){
            bytes = 4
        }else if(instruction=='dw'){
            bytes = 2
        }else if(instruction=='db'){
            bytes = 1
        }
        parameters = parameters.map(parameter=>{
            const num = numToHex(parameter,bytes)
            if(num===null){
                parameter = parameter.substring(1,parameter.length-1)
                return txtToHex(parameter,bytes)
            }
            return hexToLE(num)
        })
        result = parameters.map(formatHex).join(' ')
    }
    if(instruction=='OFFSET'){
        OFFSET = Number(parameters[0])
        return
    }
    if(instruction.endsWith(':')){
        const name = instruction.substring(0,instruction.length-1)
        ADDR[name] = OFFSET
        return
    }
    if(result.length==0){
        result = line
    }

    OFFSET += result.split(' ').length
    newLines.push(result)
})

console.log('ADDR',ADDR)

source = newLines.join('\n')

fs.writeFileSync('./examples/'+fileName+'.txt', source)

let exeTxt = source.replace(/\ |\n/gm,'')

function hexToUint8Array(hex) {
    hex = hex.replace(/\s+/g, ""); // usuń spacje/newline jeśli są
    const len = hex.length / 2;
    const arr = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        arr[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return arr;
}

fs.writeFileSync('./examples/'+fileName+'.exe', hexToUint8Array(exeTxt))