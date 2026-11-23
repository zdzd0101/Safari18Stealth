TARGET := iphone:clang:latest:16.0
ARCHS := arm64 arm64e

include $(THEOS)/makefiles/common.mk

TWEAK_NAME = Safari18Stealth

Safari18Stealth_FILES = Tweak.x
Safari18Stealth_CFLAGS = -fobjc-arc -O2
Safari18Stealth_LDFLAGS = -fuse-ld=lld
Safari18Stealth_FRAMEWORKS = Foundation UIKit

include $(THEOS_MAKE_PATH)/tweak.mk
