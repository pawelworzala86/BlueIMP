.code
    sub rsp, 40
    and rsp, -16

    call [start]

    lea rcx, [test]
    mov rdx, [num]
    xor eax, eax
    call [printf]

    xor ecx, ecx

    call [ExitProcess]

start:
    lea rcx, [testT]
    xor eax, eax
    call [printf]
ret

.data
    testT db 'start',0
    test db 'num=%i',0
    num dq 123

.import
    library kernel32,'KERNEL32.DLL',\
        msvcrt,'MSVCRT.DLL'
    import kernel32,\
        ExitProcess,'ExitProcess'
    import msvcrt,\
        printf,'printf'