Fly Pie Launcher
&middot;
[![Android](https://img.shields.io/badge/Android-3DDC84?logo=android&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](#)
[![Kotlin](https://img.shields.io/badge/Kotlin-%237F52FF.svg?logo=kotlin&logoColor=white)](#)
[![React Native](https://img.shields.io/badge/React_Native-%2320232a.svg?logo=react&logoColor=%2361DAFB)](#)
[![npm](https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=fff)](#)
<a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg"></a>
=====

An Android launcher that lets you navigate within a pie menu, allowing you to use categories of apps organised within the layers of the pie.

🏗️ Built with **React Native** and **Kotlin**

ℹ️ This project is inspired by [@markusfisch's](https://github.com/markusfisch) [PieLauncher](https://github.com/markusfisch/PieLauncher)

## Screenshots

<div style="display: flex">
<img src="https://github.com/user-attachments/assets/50f0259e-8498-4a04-ab41-3f9ecf9a72eb" width="200" alt="showcase" />

<img src="https://github.com/user-attachments/assets/0a6cb2bc-ad14-4c7d-a3c1-b30749f6eaf7" width="200" />
</div>

## Roadmap

-   [x] Show a pie containing list of apps
-   [x] Add layer navigation links within the pie to allow grouping/categorization of apps
-   [x] Persist layer configuration
-   [x] Add basic layer editing via JSON
-   [x] Browsers should have dedicated search action using the search engine
-   [ ] Make layers properly customizable via UI
-   [ ] Add sweet animations
-   [ ] Build alpha release APK for public use -- **v0.1**
-   [x] A one-tap gesture displays a grid of all your apps. The app below the location you tap will open.
-   [x] add themed app icons
-   [ ] Widgets support

## Developing

### Pre-Requisites

1. Node >= 18 is installed
2. A working installation of Android Studio.
    1. Android build tools 35.0.0
    2. minimum android 7.0 device or emulator (API level 24, target API level 35)
    3. OpenJDK v20
    4. Kotlin >=2
3. Preferably have an Android device connected via USB. Enable USB debugging beforehand.

### Steps

1. Clone the repository & install dependencies:

```sh
git clone https://github.com/jgoedde/Fly-Pie-Launcher.git
cd Fly-Pie-Launcher
npm i
```

_Optional_: make sure all required environmental variables are set by running

```sh
npx react-native doctor
```

3. Start the app for development

```sh
npm run android
```

### Building an apk

Use the build script to output an apk. From the repository root, run

```sh
./scripts/create-release-apk.sh
```
