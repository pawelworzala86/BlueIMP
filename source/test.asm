.code
    sub rsp, 40
    and rsp, -16

    lea rax, [test]
    mov rcx, rax
    mov rdx, [num]
    xor eax, eax

    call [printf]

    xor ecx, ecx

    call [ExitProcess]

.data
    test db 'num=%i',0
    num dq 123

.import
    library kernel32,'KERNEL32.DLL',\
        msvcrt,'MSVCRT.DLL'
    import kernel32,\
        ExitProcess,'ExitProcess'
    import msvcrt,\
        printf,'printf'