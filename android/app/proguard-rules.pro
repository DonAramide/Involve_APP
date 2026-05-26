# Image Cropper (uCrop)
-keep class com.yalantis.ucrop** { *; }
-keep interface com.yalantis.ucrop** { *; }

# OkHttp3 (dependency of uCrop)
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Avoid R8 Missing Class Warnings
-dontwarn javax.xml.stream.**
-dontwarn java.lang.invoke.StringConcatFactory
