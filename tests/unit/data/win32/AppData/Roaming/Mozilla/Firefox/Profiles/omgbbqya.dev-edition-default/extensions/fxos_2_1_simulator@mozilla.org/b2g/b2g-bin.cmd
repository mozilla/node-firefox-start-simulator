@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\..\..\..\..\..\..\..\..\..\..\..\mock-b2g-bin.js" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\\..\..\..\..\..\..\..\..\..\..\..\mock-b2g-bin.js" %*
)
