macro TestA propA, propB
    if propB!=NULL
        propB:
          dq 123
    end if
    propA:
      dq 100
end macro

TestA nameA, nameB