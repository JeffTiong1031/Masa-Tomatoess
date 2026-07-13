Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 1. Automatically find the exact folder where this script is located
ScriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = ScriptPath

' 2. Launch the server via a helper .bat that captures the PID
WshShell.Run "cmd /c """ & ScriptPath & "\start-server.bat""", 0, False

' 3. Wait for Next.js to compile and be ready
WScript.Sleep 5000

' 4. Safely force Windows to launch the URL in your default browser
WshShell.Run "cmd /c start http://localhost:3000", 0, False
