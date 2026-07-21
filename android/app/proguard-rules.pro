# MeInspect - ProGuard/R8 Rules for Capacitor App

# Preserve line numbers for crash reporting
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor core - keep all Capacitor plugin classes
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }

# WebView JavaScript interface (required for Capacitor)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor bridge
-keep class com.getcapacitor.internal.bridge.** { *; }

# Keep Cordova/Capacitor plugin classes
-keep class org.apache.cordova.** { *; }

# Preserve annotations
-keepattributes *Annotation*

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Keep Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Don't warn about missing classes from Capacitor
-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**
