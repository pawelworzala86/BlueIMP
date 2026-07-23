macro testMacro paramA, paramB
    lea rcx, [paramA]
    mov rdx, [paramB]
end macro

.code

    invoke printf, addr testDataA

    invoke printf, addr testDataA

    jmp [funcA]
  funcA:

    rvcall testProc;, addr testT

    invoke printf, addr testDataA

    invoke ExitProcess

proc testProc; paramA
    ;lea rax, [decl1]
    ;mov [rbp-8], rax

    invoke printf, addr testT
endp

.data
    testDataA db 'start',0
    testT db 'hello',0
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