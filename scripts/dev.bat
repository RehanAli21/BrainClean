@echo off
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot
echo JAVA_HOME set to JDK 17: %JAVA_HOME%
npx expo run:android

@REM to run emulator 
@REM %LOCALAPPDATA%\Android\Sdk\emulator\emulator -avd Medium_Phone_API_36.1