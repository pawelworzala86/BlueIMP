del out\%1.exe

node compile\compile.js %1

cd out
.\%1.exe
cd ..