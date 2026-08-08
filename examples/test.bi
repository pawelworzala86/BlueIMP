PE64

OFFSET = 0

start:
    sub rsp, 40
    and rsp, -16 

    lcall [funcA]

    sub rsp, 40
    lea rcx, [helloTxt]
    xor eax, eax
    call [printf]
    add rsp, 40

    xor ecx, ecx
    sub rsp, 40
    call [ExitProcess]
    add rsp, 40


funcA:
    sub rsp, 40
    lea rcx, [helloTxt]
    xor eax, eax
    call [printf]
    add rsp, 40
    ret


ALIGN 512
OFFSET = 4096




dd 4096 + kernel32_ilt    ;OriginalFirstThunk (ILT) dla kernel32.dll
dd 0    ;TimeDateStamp
dd 0    ;ForwarderChain
dd 4096 + kernel32_dll_name    ;Name RVA dla kernel32.dll
dd 4096 + kernel32_iat    ;FirstThunk (IAT) dla kernel32.dll

dd 4096 + msvcrt_ilt    ;OriginalFirstThunk (ILT) dla msvcrt.dll
dd 0    ;TimeDateStamp
dd 0    ;ForwarderChain
dd 4096 + msvcrt_dll_name   ;Name RVA dla msvcrt.dll
dd 4096 + msvcrt_iat    ;FirstThunk (IAT) dla msvcrt.dll

dd 0    ;Null Import Descriptor
dd 0    ;Null Import Descriptor
dd 0    ;Null Import Descriptor
dd 0    ;Null Import Descriptor
dd 0    ;Null Import Descriptor

kernel32_iat:
ExitProcess:
IAT_kernel32_ExitProcess = 4096 + ExitProcess_name
dd IAT_kernel32_ExitProcess
;hex 5C 20 00 00    ;IAT Entry: kernel32.dll!ExitProcess
hex 00 00 00 00
hex 00 00 00 00    ;IAT NULL Terminator dla kernel32.dll
hex 00 00 00 00
kernel32_ilt:
;hex 5C 20 00 00    ;ILT Entry: kernel32.dll!ExitProcess
dd IAT_kernel32_ExitProcess
hex 00 00 00 00
hex 00 00 00 00    ;ILT NULL Terminator dla kernel32.dll

hex 00 00 00 00 00 00
ExitProcess_name:
db 'ExitProcess',0
kernel32_dll_name:
db 'kernel32.dll',0

msvcrt_iat:
printf:
IAT_msvcrt_printf = 4096 + printf_name
dd IAT_msvcrt_printf
;hex A7 20 00 00    ;IAT Entry: msvcrt.dll!printf
hex 00 00 00 00
malloc:
IAT_msvcrt_malloc = 4096 + malloc_name
dd IAT_msvcrt_malloc
;hex B1 20 00 00    ;IAT Entry: msvcrt.dll!malloc
hex 00 00 00 00
hex 00 00 00 00    ;IAT NULL Terminator dla msvcrt.dll
hex 00 00 00 00
msvcrt_ilt:
;hex A7 20 00 00    ;ILT Entry: msvcrt.dll!printf
dd IAT_msvcrt_printf
hex 00 00 00 00
;hex B1 20 00 00    ;ILT Entry: msvcrt.dll!malloc
dd IAT_msvcrt_malloc
hex 00 00 00 00
hex 00 00 00 00    ;ILT NULL Terminator dla msvcrt.dll

hex 00 00 00 00 00 00 
printf_name:
db 'printf',0
hex 00 00 00 
malloc_name:
db 'malloc',0
hex 00 
msvcrt_dll_name:
db 'msvcrt.dll',0

helloTxt:
db 'HelloWorld!',0

ALIGN 512