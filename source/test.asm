macro testMacro paramA, paramB
    lea rcx, [paramA]
    mov rdx, [paramB]
end macro

.code
    ;testMacro test, num

    invoke printf, addr test, num

    call startA

    invoke printf, addr testT

    invoke printf, addr testT

    invoke ExitProcess

startA:
    invoke printf, addr testT
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