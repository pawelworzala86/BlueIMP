.code

    invoke printf, addr testDataA

    invoke printf, addr testDataA

    jmp [funcA]
  funcA:

    invoke printf, addr testDataA

    invoke ExitProcess

.data
    testDataA db 'start',0

.import
    library kernel32,'KERNEL32.DLL',\
        msvcrt,'MSVCRT.DLL'
    import kernel32,\
        ExitProcess,'ExitProcess'
    import msvcrt,\
        printf,'printf'