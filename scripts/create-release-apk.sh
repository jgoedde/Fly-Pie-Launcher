cd ../
pwd
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
cd ./android/app/build/outputs/apk/release
pwd

read -p "Press Enter to exit..."

# Then, adb install -r app-release.apk
