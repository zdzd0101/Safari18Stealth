TARGET := iphone:clang:latest:15.0
# RootHide's Theos package architecture for A12+ arm64e devices.
ARCHS := arm64
DEB_ARCH := iphoneos-arm64e
THEOS_PACKAGE_SCHEME := roothide

include $(THEOS)/makefiles/common.mk

TWEAK_NAME = Safari18Stealth
Safari18Stealth_FILES = Tweak.x
Safari18Stealth_CFLAGS = -fobjc-arc -O2 -Wall -Wextra
Safari18Stealth_FRAMEWORKS = Foundation UIKit WebKit
Safari18Stealth_INSTALL_PATH = /Library/MobileSubstrate/DynamicLibraries

include $(THEOS_MAKE_PATH)/tweak.mk
