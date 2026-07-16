macro testMacro paramA, paramB
    lea rcx, [paramA]
    mov rdx, [paramB]
end macro

.code
    ;testMacro test, num

    invoke printf, addr test, num

    jmp funcA

    rvcall testProc, addr testT

funcA:
    invoke printf, addr testT

    mov rax, [num]
    cmp rax, rax
    je [fnC]

    jmp funcB
fnC:
    invoke printf, addr testT

funcB:

    invoke ExitProcess


    ret

proc testProc paramA
    lea rax, [decl1]
    mov [rbp-8], rax

    invoke printf, [rbp-8]
endp

.data
    testT db 'start',0
    test db 'num=%i',0
    num dq 123
    decl1 db '!!',0

.import
    library kernel32,'KERNEL32.DLL',\
        msvcrt,'MSVCRT.DLL'
    import kernel32,\
        ExitProcess,'ExitProcess'
    import msvcrt,\
        printf,'printf'