$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
Write-Host "JAVA_HOME set to JDK 17: $env:JAVA_HOME"
npx expo run:android

# to run emulator 
# %LOCALAPPDATA%\Android\Sdk\emulator\emulator -avd Medium_Phone_API_36.1