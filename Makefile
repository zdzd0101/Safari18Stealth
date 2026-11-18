TARGET := iphone:clang:latest:15.0
# RootHide A12+ package: arm64 build slice with arm64e Debian architecture.
ARCHS := arm64
THEOS_PACKAGE_SCHEME := roothide

include $(THEOS)/makefiles/common.mk

TWEAK_NAME = Safari18Stealth
Safari18Stealth_FILES = Tweak.xm
Safari18Stealth_CFLAGS = -fobjc-arc -O2 -Wall -Wextra
Safari18Stealth_FRAMEWORKS = Foundation UIKit WebKit
Safari18Stealth_INSTALL_PATH = /Library/MobileSubstrate/DynamicLibraries

include $(THEOS_MAKE_PATH)/tweak.mk

# Stage runtime scripts into the RootHide package's jbroot-relative layout.
before-package::
	mkdir -p "$(THEOS_STAGING_DIR)/Library/Application Support/Safari18Stealth"
	cp Engine/Bootstrap.js "$(THEOS_STAGING_DIR)/Library/Application Support/Safari18Stealth/Bootstrap.js"
	cp Polyfills/Polyfills.js "$(THEOS_STAGING_DIR)/Library/Application Support/Safari18Stealth/Polyfills.js"
	cp CSS/CSSCompat.js "$(THEOS_STAGING_DIR)/Library/Application Support/Safari18Stealth/CSSCompat.js"
	cp Diagnostics/Diagnostics.js "$(THEOS_STAGING_DIR)/Library/Application Support/Safari18Stealth/Diagnostics.js"
