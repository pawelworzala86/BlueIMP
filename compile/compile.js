import fs from 'fs';

/*import { getSubInstruction } from './instructions/sub.js'
import { getAndInstruction } from './instructions/and.js'
import { getLeaInstruction } from './instructions/lea.js'
import { getXorInstruction } from './instructions/xor.js'
import { getCallInstruction } from './instructions/call.js'
import { getMovInstruction } from './instructions/mov.js'


const INSTR = {
  'sub': getSubInstruction,
  'and': getAndInstruction,
  'lea': getLeaInstruction,
  'xor': getXorInstruction,
  'call': getCallInstruction,
  'mov': getMovInstruction,
}*/
export const INSTR = {};

const files = fs.readdirSync('./compile/instructions/').filter(f => f.endsWith('.js'));
for (const file of files) {
  const mnemonic = file.replace('.js', '');
  const modulePath = './instructions/' + file
  const mod = await import(modulePath)
  const fn = Object.values(mod).find(v => typeof v === 'function')
  if(fn){
    INSTR[mnemonic] = fn
  }
}



function writeUInt32LE(array, value, offset) {
  array[offset] = value & 0xff;
  array[offset + 1] = (value >> 8) & 0xff;
  array[offset + 2] = (value >> 16) & 0xff;
  array[offset + 3] = (value >> 24) & 0xff;
}

function writeUInt16LE(array, value, offset) {
  array[offset] = value & 0xff;
  array[offset + 1] = (value >> 8) & 0xff;
}

export function generateExecutable(outputPath) {
  const fileSize = 0x600; 
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
  writeUInt32LE(exe, 0x00000200, secOffset + 16); // Size of Raw Data
  writeUInt32LE(exe, 0x00000200, secOffset + 20); // Pointer to Raw Data (0x200)
  writeUInt32LE(exe, 0x60000020, secOffset + 36); // CODE | EXECUTE | READ

  // Sekcja .idata
  secOffset += 40;
  exe.set(new TextEncoder().encode('.idata\0\0'), secOffset);
  writeUInt32LE(exe, 0x00001000, secOffset + 8);  // Virtual Size
  writeUInt32LE(exe, 0x00002000, secOffset + 12); // Virtual Address (RVA 0x2000)
  writeUInt32LE(exe, 0x00000200, secOffset + 16); // Size of Raw Data
  writeUInt32LE(exe, 0x00000400, secOffset + 20); // Pointer to Raw Data (0x400)
  writeUInt32LE(exe, 0xC0000040, secOffset + 36); // INITIALIZED_DATA | READ | WRITE




  const ADDR = {}






  // --- 5. SEKCJA KODU .text (Raw = 0x200, RVA = 0x1000) ---
  // Definiujemy docelowe adresy struktur w pamięci (RVA)
  const RVA_TEXT_START = 0x1000;
  const RVA_STRING_HELLO = 0x20C0;

  ADDR.hello = RVA_STRING_HELLO




  const IAT = [
    { dll: 'kernel32.dll', functions: [{ name: 'ExitProcess' }] },
    { dll: 'msvcrt.dll', functions: [{ name: 'printf' },{ name: 'malloc' }] },
  ];

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

  //const RVA_IAT_EXIT_PROCESS = importByName.ExitProcess.iatRva;
  //const RVA_IAT_PRINTF = importByName.printf.iatRva;

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
    
    /*if(asm=='sub rsp, 40'){
      result = '48 83 EC 28'
    }*/
    //if(asm=='and rsp, -16'){
    //  result = '48 83 E4 F0'
    //}
    if(ins=='lea'){//(asm=='lea rcx, [hello]'){
      let dataName = ''
      if(params[2].indexOf('[')>-1){
        dataName = params[2].replace(/\[|\]/gm,'')
        params[2] = '[0x00000000]'
      }
      result = INSTR['lea'](params)//'48 8D 0D 00 00 00 00'
      REPL.push({
        name: dataName,//'hello',
        offset: OFFSET,
        length: result.replace(/\ /gm,'').length/2,
        addr: OFFSET+3,
      })
    }
    //if(asm=='xor eax, eax'){
    //  result = '31 C0'
    //}
    if(ins=='call'){//if(asm=='call [printf]'){
      //result = 'FF 15 00 00 00 00'
      let dataName = ''
      if(params[1].indexOf('[')>-1){
        dataName = params[1].replace(/\[|\]/gm,'')
        params[1] = '[0x00000000]'
      }
      result = INSTR['call'](params)
      REPL.push({
        name: dataName,//'printf',
        offset: OFFSET,
        length: result.replace(/\ /gm,'').length/2,
        addr: OFFSET+2,
      })
    }
    //if(asm=='xor ecx, ecx'){
    //  result = '31 C9'
    //}
    /*if(asm=='call [ExitProcess]'){
      result = 'FF 15 00 00 00 00'
      REPL.push({
        name: 'ExitProcess',
        offset: OFFSET,
        length: result.replace(/\ /gm,'').length/2,
        addr: OFFSET+2,
      })
    }*/
    if(ins=='mov'){//if(asm=='call [printf]'){
      //result = 'FF 15 00 00 00 00'
      let dataName = ''
      if(params[1].indexOf('[')>-1){
        dataName = params[1].replace(/\[|\]/gm,'')
        params[1] = '[0x00000000]'
        result = INSTR['mov'](params)
        REPL.push({
          name: dataName,//'printf',
          offset: OFFSET,
          length: result.replace(/\ /gm,'').length/2,
          addr: OFFSET+3,
        })
      }else if(params[2].indexOf('[')>-1){
        dataName = params[2].replace(/\[|\]/gm,'')
        params[2] = '[0x00000000]'
        result = INSTR['mov'](params)
        REPL.push({
          name: dataName,//'printf',
          offset: OFFSET,
          length: result.replace(/\ /gm,'').length/2,
          addr: OFFSET+3,
        })
      }else{
        result = INSTR['mov'](params)
      }
    }

    

    if(INSTR[ins]&&!result.length){
      result = INSTR[ins](params)
    }

    OFFSET += result.split(' ').length
    return result
  }


  //console.log(importEntries)

  let code = fs.readFileSync('./source/test.asm').toString()/*`sub rsp, 40
    and rsp, -16

    lea rax, [hello]
    mov rcx, rax
    xor eax, eax
    
    call [printf]
    
    xor ecx, ecx
    
    call [ExitProcess]
  `*/
  let lines = code.split('\n').map(line=>{
    if(line.length){
      return getHex(line)
    }
    return line
  })
  code = lines.join('\n')
  code = code.replace(/\n|\ /gm,'')
  //console.log(code)

  function hexToU8(hex) {
    const arr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return arr;
  }

  // Szkielet instrukcji assemblera
  code = hexToU8(code)/*new Uint8Array([
    0x48, 0x83, 0xEC, 0x28,                         // 0x1000: sub rsp, 40          ; Rezerwacja shadow space i podstawowe wyrównanie
    0x48, 0x83, 0xE4, 0xF0,                         // 0x1004: and rsp, -16         ; Wymuszenie twardego wyrównania stosu do 16 bajtów
    
    // lea rcx, [RIP + offset] -> Załaduj adres format stringu
    0x48, 0x8D, 0x0D, 0x00, 0x00, 0x00, 0x00,       // 0x1008: lea rcx, [RIP + ?]   ; Miejsce na offset (będzie pod indeksem 0x100B)
    0x31, 0xC0,                                     // 0x100F: xor eax, eax         ; AL = 0 (brak argumentów XMM)
    
    // call [RIP + offset] -> Wywołaj printf z IAT
    0xFF, 0x15, 0x00, 0x00, 0x00, 0x00,             // 0x1011: call [RIP + ?]       ; Miejsce na offset (będzie pod indeksem 0x1013)
    
    // xor ecx, ecx -> Kod wyjścia = 0
    0x31, 0xC9,                                     // 0x1017: xor ecx, ecx         
    
    // call [RIP + offset] -> Wywołaj ExitProcess z IAT
    0xFF, 0x15, 0x00, 0x00, 0x00, 0x00              // 0x1019: call [RIP + ?]       ; Miejsce na offset (będzie pod indeksem 0x101B)
  ]);*/



  console.log(REPL)

  for(const RP of REPL){
    const ripAfterLea = RVA_TEXT_START + RP.offset + RP.length
    const offsetToUse = ADDR[RP.name] - ripAfterLea
    writeUInt32LE(code, offsetToUse, RP.addr)
  }

  // --- DYNAMICZNE OBLICZANIE OFFSETÓW RIP-RELATIVE ---
  
  /*// 1. Obliczenie offsetu dla LEA RCX (String "Hello World!\n")
  // RIP po wykonaniu instrukcji LEA (rozmiar instrukcji to 7 bajtów) = RVA_TEXT_START + 0x08 + 7 = 0x100F
  const ripAfterLea = RVA_TEXT_START + 0x08 + 7; //OFFSET=8
  const offsetToHello = ADDR.hello - ripAfterLea;
  writeUInt32LE(code, offsetToHello, 0x0B);

  // 2. Obliczenie offsetu dla CALL PRINTF
  // RIP po wykonaniu instrukcji CALL (rozmiar instrukcji to 6 bajtów) = RVA_TEXT_START + 0x11 + 6 = 0x1017
  const ripAfterPrintf = RVA_TEXT_START + 0x11 + 6;  //OFFSET=0x11 = 17
  const offsetToPrintf = ADDR.printf - ripAfterPrintf;
  writeUInt32LE(code, offsetToPrintf, 0x13);

  // 3. Obliczenie offsetu dla CALL EXITPROCESS
  // RIP po wykonaniu instrukcji CALL (rozmiar instrukcji to 6 bajtów) = RVA_TEXT_START + 0x19 + 6 = 0x101F
  const ripAfterExit = RVA_TEXT_START + 0x19 + 6;  //OFFSET=0x19 = 25
  const offsetToExit = ADDR.ExitProcess - ripAfterExit;
  writeUInt32LE(code, offsetToExit, 0x1B);
*/
  // Zapisanie gotowego kodu do pliku
  exe.set(code, 0x200);


















  // --- 6. SEKCJA IMPORTÓW .idata (Raw = 0x400, RVA = 0x2000) ---
  const idataRaw = 0x400;

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

  // Tekst przekazywany do printf (0x0A to nowa linia \n)
  exe.set(enc.encode('Hello World!\n\0'), idataRaw + 0xC0);

  fs.writeFileSync(outputPath, exe);
  console.log(`[+] Plik wygenerowany pomyślnie: ${outputPath}`);
}

const fileName = process.argv[2]
generateExecutable('./out/'+fileName+'.exe');