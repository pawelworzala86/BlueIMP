const fs = require('fs')
const parseInstruction = require('./mnemonic.js')
const parser = require('./opcode.js')
const Prepare = require('./prepare.js')

let fileName = process.argv[2]

let source = fs.readFileSync('./examples/'+fileName+'.bi').toString()

let format = fs.readFileSync('./system/format.bi').toString()

source = format + '\n\n' + source

let prepared = source+' '
while(prepared!=source){
    prepared = source
    source = Prepare(source)
}
source = prepared
fs.writeFileSync('./examples/prepared.bi',prepared)


const FUNCS = {}
source.replace(/([\S]+)\:/gm,match=>{
    let name = match.replace(':','').trim()
    FUNCS[name] = ''
    return match
})


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
    if((num.endsWith('f')||(num.indexOf('.')>-1))&&(parseFloat(num.replace('f','')||(parseFloat(num.replace('f',''))==0)))){
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



const REPL = []
let newLines = []
let OFFSET = 0
let totalOFFSET = 0
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
        parameters=parameters.map(parameter=>{
            if(parameter.indexOf('+')>-1){
                console.log('parameter',parameter)
                const [add,name] = parameter.split('+').map(t=>t.trim())
                REPL.push({
                    kind: 'addrName',
                    OFFSET: totalOFFSET,
                    length: 4,
                    name,
                    off: OFFSET,
                    add: Number(add),
                })
                parameter = '0'
            }
            return parameter
        })
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
        parameters = parameters[0].trim().split(' ')
        console.log('OFFSET',parameters)
        if(parameters[0]=='='){
            OFFSET = Number(parameters[1])
        }
        if(parameters[0]=='-='){
            OFFSET -= Number(parameters[1])
        }
        if(parameters[0]=='+='){
            OFFSET += Number(parameters[1])
        }
        return
    }
    if(instruction.endsWith(':')){
        const name = instruction.substring(0,instruction.length-1)
        console.log(name+': ',toHex(OFFSET))
        ADDR[name] = OFFSET
        return
    }
    if(instruction=='ret'){
        result = 'c3'
    }
    if(instruction=='hex'){
        result = line.replace('hex','').trim()
    }
    if(instruction=='ALIGN'){
        const alignValue = Number(parameters[0]) || 1
        console.log('ALIGN', totalOFFSET, 'to', alignValue)
        let max = Math.ceil(totalOFFSET / alignValue) * alignValue
        console.log('max', max)
        const pad = max - totalOFFSET
        if (pad > 0) {
            result = Array(pad).fill('00').join(' ')
        }
    }
    let name = parameters[0].substring(1,parameters[0].length-1)
    if((instruction=='lcall')&&(FUNCS[name]!=undefined)){
        console.log('instruction',instruction)
        result = 'e8 00 00 00 00'
        REPL.push({
            kind: 'addrName',
            OFFSET: totalOFFSET,
            length: result.split(' ').length,
            name,
            off: OFFSET,
            add: 0,
        })
    }

    if((result.length==0)&&(instruction.length)){
        console.log('instruction',instruction)

        let name
        if(parameters[0].indexOf('[')>-1){
            name = parameters[0].substring(1,parameters[0].length-1)
            if(!ADDR[name]){
                parameters[0] = '[0x00000000]'
            }
        }
        if(parameters[1]&&parameters[1].indexOf('[')>-1){
            name = parameters[1].substring(1,parameters[1].length-1)
            if(!ADDR[name]){
                parameters[1] = '[0x00000000]'
            }
        }

        

        let pi = parseInstruction(instruction+' '+(parameters.join(', ')))
        console.log('...',pi,parameters)
        if(pi.indexOf(', imm')>-1){
            parameters[1] = Number(parameters[1])
        }
        /*if(pi.indexOf(' m')>-1){
            pi = pi.replace(' m', ' rel32')
            parameters[0] = '[0x00000000]'
        }*/
        console.log('...',pi,parameters)
        const code = parser.encode(pi, parameters);
        console.log([...code]);
        if((pi.indexOf('r/m64')>-1)&&name){
            REPL.push({
                kind: 'addr',
                OFFSET: totalOFFSET,
                length: code.length,
                name,
                off: OFFSET,
            })
        }
        result = code.join(' ')

        
    }


    if(result.trim().length==0){
        result = line
    }

    const tokenCount = result.trim().length === 0
        ? 0
        : result.trim().split(/\s+/).length

    totalOFFSET += tokenCount
    OFFSET += tokenCount
    newLines.push(result)
})







/*
console.log('ADDR',ADDR)

console.log('call Exit:',25+6)
let addr = 4096-31
console.log('addr',addr,toHex(addr,4))

console.log('call Printf:',17+6)
let addr2 = 4112-23
console.log('addr',addr2,toHex(addr2,4))

console.log('lea helloTxt:',8+7)
let addr3 = 4288-15//-10
console.log('addr',addr3,toHex(addr3,4))

console.log('totalOFFSET',totalOFFSET)

console.log('kernel32_dll_name:',toHex(1024*4+4256,4))
console.log('1024*4*2:',1024*4*2)

console.log('ExitProcess:',toHex(4156,4))

*/


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

const u8array = hexToUint8Array(exeTxt)

function writeUInt32LE(array, value, offset) {
  array[offset] = value & 0xff;
  array[offset + 1] = (value >> 8) & 0xff;
  array[offset + 2] = (value >> 16) & 0xff;
  array[offset + 3] = (value >> 24) & 0xff;
}

for(RP of REPL){
    console.log(RP)
    if(RP.kind=='addrName'){
        let offset = RP.OFFSET + 1
        console.log('ADDR[RP.name]',ADDR[RP.name])
        let addr2 = ADDR[RP.name] - (RP.off + RP.length)
        console.log('addrName',addr2,toHex(addr2,4))
        writeUInt32LE(u8array, addr2, offset);
    }else{
        let offset = RP.OFFSET + (RP.length-4)

        let addr2 = ADDR[RP.name]-(RP.off+RP.length)
        console.log('addr',addr2,toHex(addr2,4))

        writeUInt32LE(u8array, addr2, offset);
    }
}

function uint8ToHexBytes(arr) {
    return Array.from(arr, (value) => value.toString(16).padStart(2, "0").toUpperCase());
}

const hexBytes = uint8ToHexBytes(u8array)
const hex = hexBytes.join('')
fs.writeFileSync('./examples/'+fileName+'.repl.txt', hex)

fs.writeFileSync('./examples/'+fileName+'.exe', u8array)