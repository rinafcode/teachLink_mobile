# TeachLink Android ProGuard / R8 keep rules
# Issue: #239 — RN, Expo, Zustand (JS), Axios (OkHttp), and third-party native modules

# --- React Native core ---
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.facebook.soloader.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**
-dontwarn com.facebook.yoga.**

# --- Expo modules ---
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# --- React Native Reanimated ---
-keep class com.swmansion.reanimated.** { *; }
-dontwarn com.swmansion.reanimated.**

# --- React Native Gesture Handler ---
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.gesturehandler.**

# --- React Native Screens ---
-keep class com.swmansion.rnscreens.** { *; }
-dontwarn com.swmansion.rnscreens.**

# --- Safe Area Context ---
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.th3rdwave.safeareacontext.**

# --- React Native Community packages ---
-keep class com.reactnativecommunity.** { *; }
-dontwarn com.reactnativecommunity.**

# --- Axios / OkHttp / Okio (native networking layer used by RN) ---
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**

# --- Sentry crash reporting ---
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# --- React Native IAP ---
-keep class com.dooboolab.** { *; }
-keep class com.android.vending.billing.** { *; }
-dontwarn com.dooboolab.**

# --- Async Storage ---
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-dontwarn com.reactnativecommunity.asyncstorage.**

# --- SVG ---
-keep class com.horcrux.svg.** { *; }
-dontwarn com.horcrux.svg.**

# --- General serialization / reflection (common RN crash source) ---
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# Zustand and Axios are JavaScript-only libraries; R8 does not strip JS bundles.
# Hermes bytecode is handled separately by Metro bundler minification in production.
