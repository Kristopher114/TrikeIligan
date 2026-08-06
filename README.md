# Trike Iligan - Development Session Summary

This document serves as a complete log of everything we accomplished during our development session for the **Trike Iligan** React Native / Expo application.

## 1. Environment & Metro Bundler Fixes

- **Vector Icons Resolution**: Fixed initial Metro bundler errors where `@expo/vector-icons` and `FontAwesome6` font files were failing to resolve.
- **Platform OS Crash**: Fixed a red-screen crash in `home.tsx` by importing the `Platform` module from `react-native`.
- **SafeAreaView Update**: Replaced the deprecated `SafeAreaView` from `react-native` with the modern, recommended version from `react-native-safe-area-context` to remove yellow warning boxes.
- **Syntax Error Resolution**: Fixed a broken `</View>` closing tag in `signup.tsx` that was causing the Metro Bundler to fail with a parsing error.

## 2. Dev Client & Network Troubleshooting

- **Tunneling Issues**: Diagnosed a `CommandError: failed to start tunnel` issue caused by an Ngrok outage/network block.
- **Connection Alternatives**: Provided instructions on how to bypass Wi-Fi and Tunnel issues by utilizing a direct USB connection (`adb` reverse proxy) to run `--dev-client` builds flawlessly.
- **Java NullPointerException**: Explained and resolved a native Android crash (`ReactActivityDelegate.onKeyDown`) that occurred when hardware keys were pressed while the app was disconnected from the bundler.

## 3. Sign Up Screen Improvements

- **Password Visibility Toggle**: Implemented the logic and state (`useState`) to toggle password visibility (changing dots to text) when clicking the eye icon.
- **Layout Alignment**: Fixed the Flexbox styling (`flexDirection: 'row'`) so the password text input and the eye icon sit perfectly side-by-side in a unified container.
- **Stationary Headers**: Restructured the layout so that the "Create an Account" title and subtitle remain securely pinned at the top of the screen, while the input forms scroll beneath them.
- **Keyboard Avoidance**: Installed `react-native-keyboard-aware-scroll-view` to replace the standard `ScrollView`. This automatically pushes the password input up when tapped, preventing the keyboard from covering the input field on Android devices.

## 4. Home Screen (Map & Bottom Sheet) Overhaul

- **Search Bar UI**: Changed the red `location-sharp` icon to a green magnifying glass (`search`) and perfectly aligned it horizontally with the placeholder text.
- **Interactive Search Input**: Upgraded the static "Where are you going?" text into a fully functional and interactive `<TextInput>` component.
- **Custom Draggable Bottom Sheet**:
  - Overhauled the static bottom sheet to behave like a standard navigation app (e.g., Google Maps).
  - Used React Native's built-in `Animated` and `PanResponder` APIs to create a highly performant, custom draggable drawer from scratch (avoiding heavy external libraries).
  - **Full Screen Map**: Adjusted the map placeholder to take up the entire background (`StyleSheet.absoluteFillObject`).
  - **Snap Points**: Implemented logic so the sheet defaults to 58% down the screen, but smoothly snaps to 15% from the top (expanding fully) when the user grabs the newly-added grey drag handle and swipes up.

## 5. Sign Up Screen Validations

- **Email Validation**: Bound the email input to a state variable and implemented a robust Regex check inside the `handleSignUp` function to ensure valid email formats (e.g. requires `@` and `.`).
- **Dynamic Error UI**: Added visual feedback for invalid emails. If the email is empty or invalid, the input border turns red and a helper text appears below it.
- **Confirm Password**: Added a second password field and bound it correctly to `confirmPassword` state.
- **Password Matching & Length**: Implemented a validation check to ensure that `password` strictly equals `confirmPassword`, and that the chosen password is at least 6 characters long (`password.length < 6`), utilizing native `Alert` dialogs to inform the user of errors.
- **Keyboard Fixes**: Adjusted the `KeyboardAwareScrollView` with an `extraScrollHeight={20}` padding to ensure the new "Confirm Password" input box clearly clears the keyboard when pushed up.
