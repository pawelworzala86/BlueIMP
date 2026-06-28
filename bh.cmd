del out\%1.exe

node compile\compile.js %1

IF ERRORLEVEL 1 GOTO koniec

cd out
.\%1.exe
cd ..

:koniec