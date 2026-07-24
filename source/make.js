const fs = require('fs')
const path = require('path')
//const { fileURLToPath, pathToFileURL } from 'url'
const Prepare = require('./prepare.js')
const parseInstruction = require('./mnemonic.js')
const parser = require('./opcode.js')

//const __filename = fileURLToPath(import.meta.url).replace('compile\\compile.js','');
//console.log(__filename);



const sourceFileName = process.argv[2]
const destinationFileName = process.argv[3]







function writeUInt64LE(array, value, offset) {
  // value może być BigInt lub Number — wymuszamy BigInt
  value = BigInt(value);

  array[offset]     = Number(value & 0xFFn);
  array[offset + 1] = Number((value >> 8n) & 0xFFn);
  array[offset + 2] = Number((value >> 16n) & 0xFFn);
  array[offset + 3] = Number((value >> 24n) & 0xFFn);
  array[offset + 4] = Number((value >> 32n) & 0xFFn);
  array[offset + 5] = Number((value >> 40n) & 0xFFn);
  array[offset + 6] = Number((value >> 48n) & 0xFFn);
  array[offset + 7] = Number((value >> 56n) & 0xFFn);
}

function writeUInt32LE(array, value, offset) {
  array[offset] = value & 0xff;
  array[offset + 1] = (value >> 8) & 0xff;
  array[offset + 2] = (value >> 16) & 0xff;
  array[offset + 3] = (value >> 24) & 0xff;
}
function writeInt32LE(array, value, offset) {
  // wymuszenie zakresu signed 32-bit
  value = value | 0; // konwersja do int32 (two's complement)

  array[offset]     = value & 0xFF;
  array[offset + 1] = (value >> 8) & 0xFF;
  array[offset + 2] = (value >> 16) & 0xFF;
  array[offset + 3] = (value >> 24) & 0xFF;
}

function writeUInt16LE(array, value, offset) {
  array[offset] = value & 0xff;
  array[offset + 1] = (value >> 8) & 0xff;
}

function generateExecutable(sourceCode,outputPath) {
  function writePEHeader(fileSize,textSize,textPointer,idataSize,idataPointer){
    //const fileSize = 0x800; 
    const exe = new Uint8Array(fileSize);

    // --- 1. DOS HEADER ---
    exe[0] = 0x4D; exe[1] = 0x5A; // 'MZ'
    writeUInt32LE(exe, 0x00000080, 0x3C); // e_lfanew = 0x80

    // --- 2. PE HEADER (COFF) ---
    const peOffset = 0x80;
    exe[peOffset] = 0x50; exe[peOffset + 1] = 0x45; // 'PE\0\0'
    writeUInt16LE(exe, 0x8664, peOffset + 4);     // Machine: AMD64 (64-bit)
    writeUInt16LE(exe, 2, peOffset + 6);          // Number of Sections: 2 (.text, .idata)
    writeUInt32LE(exe, 0x60000000, peOffset + 8); // TimeDateStamp
    writeUInt16LE(exe, 0xF0, peOffset + 20);      // Size of Optional Header (240 bajtów)
    writeUInt16LE(exe, 0x0022, peOffset + 22);    // Characteristics: EXECUTABLE_IMAGE | LARGE_ADDRESS_AWARE

    // --- 3. OPTIONAL HEADER (PE32+) ---
    const optOffset = peOffset + 24;
    writeUInt16LE(exe, 0x020B, optOffset);          // Magic: PE32+ (64-bit)
    
    writeUInt32LE(exe, 0x00000200, optOffset + 4);  // Size of Code
    writeUInt32LE(exe, 0x00000200, optOffset + 8);  // Size of Initialized Data
    
    writeUInt32LE(exe, 0x00001000, optOffset + 16);  // Address of Entry Point (RVA)
    writeUInt32LE(exe, 0x00001000, optOffset + 20);  // Base Of Code
    
    writeUInt32LE(exe, 0x00400000, optOffset + 24);  // ImageBase (0x00400000)

    writeUInt32LE(exe, 0x00001000, optOffset + 32);  // Section Alignment (0x1000)
    writeUInt32LE(exe, 0x00000200, optOffset + 36);  // File Alignment (0x200)
    writeUInt16LE(exe, 6, optOffset + 40);          // Major OS Version
    writeUInt16LE(exe, 0, optOffset + 42);          // Minor OS Version
    writeUInt16LE(exe, 6, optOffset + 48);          // Major Subsystem Version
    writeUInt16LE(exe, 0, optOffset + 50);          // Minor Subsystem Version
    writeUInt32LE(exe, 0x00003000, optOffset + 56);  // Size of Image
    writeUInt32LE(exe, 0x00000200, optOffset + 60);  // Size of Headers
    writeUInt16LE(exe, 3, optOffset + 68);          // Subsystem: 3 = Windows CUI (Konsola)
    
    writeUInt32LE(exe, 0x00100000, optOffset + 72); // Stack Reserve
    writeUInt32LE(exe, 0x00001000, optOffset + 80); // Stack Commit
    writeUInt32LE(exe, 0x00100000, optOffset + 88); // Heap Reserve
    writeUInt32LE(exe, 0x00001000, optOffset + 96); // Heap Commit
    writeUInt32LE(exe, 16, optOffset + 108);        // Number of Data Directories

    // Data Directory #1: Import Table (RVA 0x2020)
    writeUInt32LE(exe, 0x00002020, optOffset + 120); 
    writeUInt32LE(exe, 0x0000003C, optOffset + 124); 

    // Data Directory #12: IAT (RVA 0x2000)
    writeUInt32LE(exe, 0x00002000, optOffset + 208); 
    writeUInt32LE(exe, 0x00000020, optOffset + 212); 

    // --- 4. SECTION HEADERS ---
    let secOffset = optOffset + 240;

    // Sekcja .text
    exe.set(new TextEncoder().encode('.text\0\0\0'), secOffset);
    writeUInt32LE(exe, 0x00001000, secOffset + 8);  // Virtual Size
    writeUInt32LE(exe, 0x00001000, secOffset + 12); // Virtual Address (RVA 0x1000)
    writeUInt32LE(exe, textSize, secOffset + 16); // Size of Raw Data
    writeUInt32LE(exe, textPointer, secOffset + 20); // Pointer to Raw Data (0x200)
    writeUInt32LE(exe, 0x60000020, secOffset + 36); // CODE | EXECUTE | READ

    // Sekcja .idata
    secOffset += 40;
    exe.set(new TextEncoder().encode('.idata\0\0'), secOffset);
    writeUInt32LE(exe, 0x00001000, secOffset + 8);  // Virtual Size
    writeUInt32LE(exe, 0x00002000, secOffset + 12); // Virtual Address (RVA 0x2000)
    writeUInt32LE(exe, idataSize, secOffset + 16); // Size of Raw Data
    writeUInt32LE(exe, idataPointer, secOffset + 20); // Pointer to Raw Data (0x400)
    writeUInt32LE(exe, 0xC0000040, secOffset + 36); // INITIALIZED_DATA | READ | WRITE

    return exe
  }






  console.log('sourceFileName... ',sourceFileName)

  //let sourceCode = fs.readFileSync(sourceFileName).toString()

  console.log('sourceCode... ',sourceCode)
  
  sourceCode = sourceCode.replace(/\;.*/gm,'')

  sourceCode = Prepare(sourceCode)

  console.log('sourceCode... ',sourceCode)

  const SECTIONS = {
    code:'',
    data:'',
    import:'',
  }
  let activeSection = 'TEXT'
  let codeLines = sourceCode.split('\n')
  codeLines.map(line=>{
    if(line.trim()=='.code'){
      activeSection = 'code'
    }else if(line.trim()=='.data'){
      activeSection = 'data'
    }else if(line.trim()=='.import'){
      activeSection = 'import'
    }else{
      SECTIONS[activeSection]+=line+'\n'
    }
  })




  function IntToHex8(value) {
    // Upewnij się, że pracujemy na liczbie całkowitej 32‑bitowej
    const v = value >>> 0; // konwersja do nieznakowanej liczby 32‑bitowej

    // Zamiana na hex
    let hex = v.toString(16).toUpperCase();

    // Dopełnienie zerami z przodu do długości 8
    while (hex.length < 8) {
      hex = "0" + hex;
    }

    return hex;
  }





  const ADDR = {}

  const DATA = []

  const FUNCS = {}
  //  {name:'hello',kind:'db',value:'Hello World!\n\0'},
  //  {name:'test',kind:'db',value:'test!\n\0'},
  //]

  SECTIONS.data.split('\n').map(line=>{
    if(line.trim().length){
      const parts = line.trim().split(' ')
      if(parts[1]=='db'){
        let value = line.replace(parts[0]+' '+parts[1],'').trim()
        value = value.replace(',0','').replace(/\'/gm,'')
        DATA.push({
          name: parts[0],
          kind: parts[1],
          value: value+'\0',
        })
      }else if(parts[1]=='dq'){
        DATA.push({
          name: parts[0],
          kind: parts[1],
          value: '0x'+IntToHex8(parts[2]) +'',
        })
      }
    }
  })




  // --- 5. SEKCJA KODU .text (Raw = 0x200, RVA = 0x1000) ---
  // Definiujemy docelowe adresy struktur w pamięci (RVA)
  const RVA_TEXT_START = 0x1000;
  const RVA_STRING_HELLO = 0x20C0;

  let dataOffset = 0
  for(const DTA of DATA){
    ADDR[DTA.name] = RVA_STRING_HELLO+dataOffset
    if(DTA.kind=='db'){
      dataOffset += DTA.value.length
    }else if(DTA.kind=='dq'){
      dataOffset += 8
    }
  }



  const IAT = []

  function addDLL(name,dll){
      IAT.push({name,dll,functions:[]})
  }
  function addDllFunc(name,from,target){
    let dll = null
    IAT.map(i=>{
      if(i.name==name){
        dll = i
      }
    })
    dll.functions.push({name:from})
  }

  function importFromData(data){
    data=data.replace(/\,\\\r\n/gm,',')
    data=data.replace(/\,\\\n/gm,',')
    data=data.replace(/\'/gm,'')
    data.replace(/library.*/gm,match=>{
        let parts = match.replace('library','').trim().split(',').map(p=>p.trim())
        //console.log(parts)
        for(let i=0;i<parts.length;i+=2){
            addDLL(parts[i],parts[i+1])
        }
    })
    console.log('import',data)
    data.replace(/import.*/gm,match=>{
        let parts = match.replace('import','').trim().split(',').map(p=>p.trim())
        console.log(parts)
        let name = parts[0]
        for(let i=1;i<parts.length;i+=2){
            //if(new RegExp('\\['+parts[i]+'\\]','gm').exec(data)){
                addDllFunc(name,parts[i],parts[i+1])
            //}
        }
    })
    //console.log(data)
  }
  importFromData(SECTIONS.import)
  console.log('IAT',IAT)



  const importEntries = [];
  const importByName = {};
  let nextHintNameRva = 0x2080;
  let nextIatRva = 0x2000;
  let nextDllNameRva = 0x20A0;

  for (const dllEntry of IAT) {
    for (const fn of dllEntry.functions) {
      const entry = {
        dll: dllEntry.dll,
        name: fn.name,
        hintNameRva: nextHintNameRva,
        iatRva: nextIatRva,
        dllNameRva: nextDllNameRva,
      };
      importEntries.push(entry);
      importByName[fn.name] = entry;
      nextHintNameRva += 0x14;
      nextIatRva += 0x10;
    }
    nextDllNameRva += dllEntry.dll.length + 1;
  }

  ADDR.ExitProcess = importByName.ExitProcess.iatRva
  ADDR.printf = importByName.printf.iatRva

  const REPL = []

  let OFFSET = 0
  function getHex(asm){
    asm = asm.trim()
    if(asm.length==0){
      return ''
    }
    let result = ''

    let params = asm.replace(/\,/gm,'').trim().split(' ')
    let ins = params[0]
    let parameters = asm.replace(ins,'').trim().split(',')
        .map(p=>p.trim())
    
    if(ins=='ret'){
      result = 'C3'
      OFFSET++
      return result
    }

    if(ins.endsWith(':')){
      const name = ins.trim().replace(':','')
      FUNCS[name] = OFFSET
      return ''
    }

    if((result.length==0)&&(ins.length)){
        console.log('instruction',ins)

        let name
        if(parameters[0].indexOf('[')>-1){
            name = parameters[0].substring(1,parameters[0].length-1)
            if(FUNCS[name]==undefined){
                parameters[0] = '[0x00000000]'
            }
        }
        if(parameters[1]&&parameters[1].indexOf('[')>-1){
            name = parameters[1].substring(1,parameters[1].length-1)
            if(FUNCS[name]==undefined){
                parameters[1] = '[0x00000000]'
            }
        }

        

        const pi = parseInstruction(ins+' '+(parameters.join(', ')))
        console.log('...',pi,parameters)
        if(pi.indexOf(', imm')>-1){
            parameters[1] = Number(parameters[1])
        }
        console.log('...',pi,parameters)

        if((parameters[0].indexOf('[')>-1)&&((parameters[0].indexOf('-')==-1)&&(parameters[0].indexOf('+')==-1))){
            parameters[0] = '0x00000000'
        }
        if(parameters[1]&&((parameters[0].indexOf('-')==-1)&&(parameters[0].indexOf('+')==-1))&&parameters[1].length&&(parameters[1].indexOf('[')>-1)){
            parameters[1] = '0x00000000'
        }
        console.log(parameters);
        const code = parser.encode(pi, parameters);
        console.log([...code]);
        if(((pi.indexOf('r/m64')>-1)||(pi.indexOf('rel32')>-1))&&name){
            REPL.push({
                //kind: 'addr',
                OFFSET: OFFSET,
                length: code.length,
                name,
                addr: OFFSET+(code.length-4),
                local: FUNCS[name]!==undefined,//(ins=='jmp')||(pi.indexOf('rel32')>-1)//code.length==4
            })
        }
        result = code.join(' ')

        if(ins=='jmp'){
          console.log('CODE:',result)
        }

    }

    OFFSET += result.split(' ').length
    return result
  }


  //console.log(importEntries)

  let code = SECTIONS.code
  code.replace(/(.*)\:/gm,match=>{
    const name = match.replace(':','').trim()
    FUNCS[name] = 0
    return match
  })
  
  let lines = code.split('\n').map(line=>{
    if(line.length){
      return getHex(line)
    }
    return line
  })
  code = lines.join('\n')
  console.log(code)
  code = code.replace(/\n|\ /gm,'')
  

  function hexToU8(hex) {
    const arr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return arr;
  }

  // Szkielet instrukcji assemblera
  code = hexToU8(code)


  console.log(REPL)
  console.log(FUNCS)
  //process.exit()

  for(const RP of REPL){
    if(RP.local){
      const localOffset = FUNCS[RP.name] - (RP.OFFSET + RP.length)
      console.log('localOffset',localOffset)
      //process.exit()
      writeInt32LE(code, localOffset, RP.addr)
    }else{
      const ripAfterLea = RVA_TEXT_START + RP.OFFSET + RP.length
      const offsetToUse = ADDR[RP.name] - ripAfterLea
      writeUInt32LE(code, offsetToUse, RP.addr)
    }
  }
  


  dataOffset = 0
  for(const DTA of DATA){
    //exe.set(enc.encode(DTA.value), idataRaw + 0xC0 + dataOffset);
    if(DTA.kind=='db'){
      dataOffset += DTA.value.length
    }else if(DTA.kind=='dq'){
      dataOffset += 8
    }
  }
  console.log(0xC0 + dataOffset)
  const iatSize = Math.ceil((0xC0 + dataOffset)/512)*512
  console.log('iatSize', iatSize)



  const codeSize = Math.ceil(code.length/512)*512
  console.log(codeSize)



  let idataRaw = codeSize+512

  const exe = writePEHeader(512+codeSize+iatSize,
    codeSize,512,
    iatSize,idataRaw,
  )

  exe.set(code, 0x200);















  for (const entry of importEntries) {
    writeUInt32LE(exe, entry.hintNameRva, idataRaw + (entry.iatRva - 0x2000));
  }

  const dirOff = idataRaw + 0x20;
  for (let i = 0; i < IAT.length; i += 1) {
    const dllEntry = IAT[i];
    const dirEntryOffset = dirOff + i * 20;
    const firstEntry = importEntries.find((entry) => entry.dll === dllEntry.dll);
    const dllNameRva = firstEntry ? firstEntry.dllNameRva : 0x20A0 + i * 0x10;

    writeUInt32LE(exe, 0x00002060 + i * 0x10, dirEntryOffset + 0);
    writeUInt32LE(exe, dllNameRva, dirEntryOffset + 12);
    writeUInt32LE(exe, 0x00002000 + i * 0x10, dirEntryOffset + 16);
  }

  let iltOffset = idataRaw + 0x60;
  for (const entry of importEntries) {
    writeUInt32LE(exe, entry.hintNameRva, iltOffset);
    iltOffset += 0x10;
  }

  const enc = new TextEncoder();
  for (const entry of importEntries) {
    exe.set(enc.encode(`\0\0${entry.name}\0`), idataRaw + (entry.hintNameRva - 0x2000));
  }

  for (const dllEntry of IAT) {
    const firstEntry = importEntries.find((entry) => entry.dll === dllEntry.dll);
    if (firstEntry) {
      exe.set(enc.encode(`${dllEntry.dll}\0`), idataRaw + (firstEntry.dllNameRva - 0x2000));
    }
  }

  dataOffset = 0
  for(const DTA of DATA){
    if(DTA.kind=='db'){
      exe.set(enc.encode(DTA.value), idataRaw + 0xC0 + dataOffset);
      dataOffset += DTA.value.length
    }else if(DTA.kind=='dq'){
      //exe.set(enc.encode(DTA.value), idataRaw + 0xC0 + dataOffset);
      writeUInt32LE(exe, DTA.value, idataRaw + 0xC0 + dataOffset);
      dataOffset += 8
    }
  }

  console.log(0xC0 + dataOffset)


  fs.writeFileSync(outputPath, exe);
  console.log(`[+] Plik wygenerowany pomyślnie: ${outputPath}`);
}

module.exports = generateExecutable