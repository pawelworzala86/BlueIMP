set FILENAME=%~n1

del out\%FILENAME%.exe

node %~dp0\compile\compile.js %1 %2

IF ERRORLEVEL 1 GOTO koniec

cd out
.\%FILENAME%.exe
cd ..

:koniec