const fs = require('fs')
const parseInstruction = require('./mnemonic.js')
const parser = require('./opcode.js')
const Prepare = require('./prepare.js')
const convert = require('./convert.js')

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

function substituteMacroParameters(line, params, args){
    if(!params || !params.length){
        return line
    }
    if(typeof line === 'string'){
        return params.reduce((current, param, index) => {
            const replacement = args[index] !== undefined ? args[index] : param
            return current.replace(new RegExp('\\b' + param + '\\b', 'g'), replacement)
        }, line)
    }
    if(typeof line === 'object' && line !== null){
        const copy = { ...line }
        if(copy.left){
            copy.left = substituteMacroParameters(copy.left, params, args)
        }
        if(copy.right){
            copy.right = substituteMacroParameters(copy.right, params, args)
        }
        if(Array.isArray(copy.then)){
            copy.then = copy.then.map(item => substituteMacroParameters(item, params, args))
        }
        if(Array.isArray(copy.else)){
            copy.else = copy.else.map(item => substituteMacroParameters(item, params, args))
        }
        return copy
    }
    return line
}



const REPL = []
const DEFINES = {}
let newLines = []
let totalOFFSET = 0
let ADDR = {}

const DATASET = {}
const MACRO = {}
let activeMacros = null

DATASET['OFFSET'] = 0

for(let index=0;index<lines.length;index++){
    let line = lines[index]
    if(!line.trim().length){
        continue
    }
    //console.log('line: ',line)
    let [cmd, ...args] = line.split(/\s+/)

    if(cmd=='macro'){
        let macroName = args[0]
        let params = args.slice(1).map(p => p.replace(/,$/, ''))
        activeMacros = { name: macroName, params, body: [] }
        MACRO[macroName] = activeMacros
        line = ''
    }
    if(activeMacros !== null && cmd !== 'macro' && !(cmd=='end' && args[0]=='macro')){
        if(cmd=='if'){
            let query = line.replace(cmd,'').trim()
            let then = []
            let eelse = []
            let e = false
            let ifIndex = index
            lines[ifIndex] = ''
            while(lines[++index].trim() != 'end if'){
                if(lines[index].trim() === 'else'){
                    e = true
                    lines[index] = ''
                    continue
                }
                if(e){
                    eelse.push(lines[index])
                } else {
                    then.push(lines[index])
                }
                lines[index] = ''
            }
            lines[index] = ''
            let [op,left,operation,right] = /([a-zA-Z0-9\_]+)(\=\=|\!\=|\=|\>\=|\<\=)([a-zA-Z0-9\_]+)/.exec(query)
            let iff = {
                left,operation,right,
                then,
                else:eelse,
                invoke(){
                    //console.log(this)
                    if(evaluateCondition(this.left, this.operation, this.right)){
                        return this.then
                    }else{
                        return this.else
                    }
                }
            }
            activeMacros.body.push(iff)
        }else{
            activeMacros.body.push(line)
        }
    }
    if((cmd=='end')&&(args[0]=='macro')){
        activeMacros = null
        line = ''
    }
    lines[index] = activeMacros ? '' : line
}

console.log(lines)

for(let index=0;index<lines.length;index++){
    let line = lines[index]
    function parseLine(line){
        let result = ''

        line = line.replace(/\;.*/gm,'').trim()

        /*line = stripComment(line)
        const { line: processedLine } = parseLabel(line)
        if(!processedLine || !processedLine.trim()){
            return ''
        }*/

        let [cmd, ...rest] = line.split(/\s+/)
        let restText = rest.join(' ')
        let args = restText.split(',').map(a=>a.trim()).filter(a=>a.length>0)

        if(typeof line=='object'){
            return line.invoke().map(parseLine)
        }

        const instruction = line.trim().split(/\s+/)[0]
        let parameters = line.replace(instruction,'').trim().split(',')
            .map(p=>p.trim())
        //console.log(instruction,parameters)

        if((line.indexOf('=')>-1)&&(line.indexOf('OFFSET')==-1)){
            let [name,params] = line.split('=').map(t=>t.trim())
            let [off,addrName] = params.split('+').map(t=>t.trim())
            DEFINES[name]={
                off:Number(off),addrName
            }
            return ''
        }

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
                if(DEFINES[parameter]!=undefined){
                    REPL.push({
                        kind: 'define',
                        OFFSET: totalOFFSET,
                        length: 4,
                        name: parameter,
                        off: DATASET['OFFSET'],
                        //add: Number(add),
                    })
                    parameter = '0'
                }
                if(parameter.indexOf('+')>-1){
                    console.log('parameter',parameter)
                    const [add,name] = parameter.split('+').map(t=>t.trim())
                    REPL.push({
                        kind: 'addrRVA',
                        OFFSET: totalOFFSET,
                        length: 4,
                        name,
                        off: DATASET['OFFSET'],
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
                DATASET['OFFSET'] = Number(parameters[1])
            }
            if(parameters[0]=='-='){
                DATASET['OFFSET'] -= Number(parameters[1])
            }
            if(parameters[0]=='+='){
                DATASET['OFFSET'] += Number(parameters[1])
            }
            return
        }
        if(instruction.endsWith(':')){
            const name = instruction.substring(0,instruction.length-1)
            console.log(name+': ',toHex(DATASET['OFFSET']))
            ADDR[name] = DATASET['OFFSET']
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
                off: DATASET['OFFSET'],
                add: 0,
            })
        }

        if(MACRO[instruction]!=undefined){
            const macro = MACRO[instruction]
            const invocationArgs = restText.length
                ? restText.split(',').map(a=>a.trim()).filter(a=>a.length>0)
                : []
            let result = []
            for(let bodyLine of macro.body){
                let substituted = substituteMacroParameters(bodyLine, macro.params, invocationArgs)
                result.push(parseLine(substituted))
            }
            return result
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
            console.log('...',pi,parameters,instruction)
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
                    off: DATASET['OFFSET'],
                })
            }
            result = code.join(' ')
        }

        


        if(result.trim().length==0){
            result = line
        }

        return result
    }

    lines[index] = parseLine(line)

    if(!lines[index]){
        lines[index] = ''
    }

    console.log(lines[index])
    //console.log('result',result)
    if(Array.isArray(lines[index])){
        lines[index] = lines[index].flat().map(res=>{
            if(res&&res.length){
                let ress = res.trim().split(' ')//convert.splitHexToPairs(res)
                DATASET['OFFSET'] = Number(DATASET['OFFSET'] || 0) + ress.length
                totalOFFSET += ress.length
                return ress.join(' ')
            }else{
                return ''
            }
        })
    }
    if (typeof lines[index] === 'string' && lines[index].trim().length) {
        let res = lines[index].trim().split(' ')//convert.splitHexToPairs(lines[index])
        DATASET['OFFSET'] = Number(DATASET['OFFSET'] || 0) + res.length
        totalOFFSET += res.length
        lines[index] = res.join(' ')
    }
    //return result

    /*const tokenCount = result.trim().length === 0
        ? 0
        : result.trim().split(/\s+/).length

    totalOFFSET += tokenCount
    OFFSET += tokenCount
    newLines.push(result)*/
}







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


source = lines.flat().join('\n')

fs.writeFileSync('./examples/'+fileName+'.txt', source)

let exeTxt = source.replace(/\ |\n|\r/gm,'')

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

const REPLS = []

for(RP of REPL){
    console.log(RP)
    if(RP.kind=='define'){
        let offset = RP.OFFSET
        console.log('DEFINES[RP.name]',DEFINES[RP.name])

        let addr2 = DEFINES[RP.name].off + ADDR[DEFINES[RP.name].addrName] - 2
        console.log('addrName',addr2,toHex(addr2,4))

        writeUInt32LE(u8array, addr2, offset);
        REPLS.push({offset,value:addr2})
    }else if(RP.kind=='addrName'){
        let offset = RP.OFFSET + 1
        console.log('ADDR[RP.name]',ADDR[RP.name])
        let addr2 = ADDR[RP.name] - (RP.off + RP.length)
        console.log('addrName',addr2,toHex(addr2,4))
        writeUInt32LE(u8array, addr2, offset);
        REPLS.push({offset,value:addr2})
    }else if(RP.kind=='addrRVA'){
        let offset = RP.OFFSET //+ 1
        console.log('ADDR[RP.name]',ADDR[RP.name])
        let addr2 = ADDR[RP.name] + RP.add
        console.log('addrName',addr2,toHex(addr2,4))
        writeUInt32LE(u8array, addr2, offset);
        REPLS.push({offset,value:addr2})
    }else{
        let offset = RP.OFFSET + (RP.length-4)

        let addr2 = ADDR[RP.name]-(RP.off+RP.length)
        console.log('addr',addr2,toHex(addr2,4))

        writeUInt32LE(u8array, addr2, offset);
        REPLS.push({offset,value:addr2})
    }
}

function uint8ToHexBytes(arr) {
    return Array.from(arr, (value) => value.toString(16).padStart(2, "0").toUpperCase());
}

const hexBytes = uint8ToHexBytes(u8array)
const hex = hexBytes.join('')
fs.writeFileSync('./examples/'+fileName+'.repl.txt', hex)

fs.writeFileSync('./examples/'+fileName+'.exe', u8array)

fs.writeFileSync('./repls.json', JSON.stringify(REPLS,null,4))

console.log('ADDR',ADDR)