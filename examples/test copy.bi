PE64






sub rsp, 40
;and rsp, -16

;lea rcx, [helloTxt]
xor eax, eax
;call [printf]
invoke printf, addr helloTxt

xor rax, rax 
;call [ExitProcess]
invoke ExitProcess




ALIGN 512

OFFSET = 4096


ExitProcess:
hex 80 20 00 00    ;Wskaźnik do ExitProcess Hint/Name
hex 00 00 00 00 00 00 00 00 00 00 00 00
printf:
hex 94 20 00 00    ;Wskaźnik do printf Hint/Name
hex 00 00 00 00 00 00 00 00 00 00 00 00

hex 60 20 00 00    ;ILT RVA
hex 00 00 00 00 00 00 00 00
dd 4096 + kernel32_dll_name         ;Nazwa DLL RVA ("kernel32.dll")
hex 00 20 00 00    ;IAT RVA

hex 70 20 00 00    ;ILT RVA
hex 00 00 00 00 00 00 00 00
dd 4096 + msvcrt_dll_name         ;Nazwa DLL RVA ("msvcrt.dll")
hex 10 20 00 00    ;IAT RVA

hex 00 00 00 00 00 00 00 00
hex 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00

hex 80 20 00 00    ;kernel32 ILT
hex 00 00 00 00 00 00 00 00 00 00 00 00
hex 94 20 00 00    ;msvcrt ILT
hex 00 00 00 00 00 00 00 00 00 00 00 00


db 0,0,'ExitProcess',0

hex 00 00 00 00 00 00 

db 0,0,'printf',0

hex 00 00 00 

kernel32_dll_name:
db 'kernel32.dll',0
msvcrt_dll_name:
db 'msvcrt.dll',0

hex 00 00 00 00 00 00 00 00



helloTxt:
db 'Hello World!',0
hex 00


ALIGN 512