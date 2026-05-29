# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.yoga.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.yoga.**

# Expo
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# Reanimated
-keep class com.swmansion.reanimated.** { *; }
-dontwarn com.swmansion.reanimated.**

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.gesturehandler.**

# Network / Axios / OkHttp (Zustand and Axios are JS, but OkHttp is used by RN for network)
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# General rules for common React Native packages
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.th3rdwave.safeareacontext.**
-keep class com.reactnativecommunity.** { *; }
-dontwarn com.reactnativecommunity.**
