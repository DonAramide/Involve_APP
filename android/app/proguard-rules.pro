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
-dontwarn org.jdom2.**
-dontwarn org.jpos.**
-dontwarn javax.script.**
-dontwarn bsh.engine.**

# Optional / desktop-only classes referenced by MPOS / jPOS / JE JARs
-dontwarn com.sun.nio.file.SensitivityWatchEventModifier
-dontwarn com.yeepay.mpos.money.manager.PosManager
-dontwarn com.yeepay.mpos.money.manager.PosManagerListener
-dontwarn java.beans.BeanInfo
-dontwarn java.beans.FeatureDescriptor
-dontwarn java.beans.IntrospectionException
-dontwarn java.beans.Introspector
-dontwarn java.beans.PropertyDescriptor
-dontwarn java.lang.management.GarbageCollectorMXBean
-dontwarn java.lang.management.ManagementFactory
-dontwarn java.lang.management.MemoryMXBean
-dontwarn java.lang.management.MemoryUsage
-dontwarn java.lang.management.OperatingSystemMXBean
-dontwarn java.lang.management.RuntimeMXBean
-dontwarn java.lang.management.ThreadMXBean
-dontwarn javax.management.MBeanException
-dontwarn javax.management.MBeanServer
-dontwarn javax.management.MBeanServerConnection
-dontwarn javax.management.ReflectionException
-dontwarn javax.transaction.xa.Xid
-dontwarn org.mozilla.universalchardet.CharsetListener
-dontwarn org.mozilla.universalchardet.UniversalDetector

# Keep MoreFun / MPOS open APIs
-keep class com.demo.mpossdk.open.** { *; }
-keep class com.invify.morefunsdk.open.** { *; }
-keep class com.mf.mpos.** { *; }