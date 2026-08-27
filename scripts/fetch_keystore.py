#!/usr/bin/env python3
"""Fetch Android keystore credentials from Expo EAS using pexpect."""
import pexpect
import sys
import os

child = pexpect.spawn(
    'npx eas-cli@latest credentials:configure-build --platform android',
    encoding='utf-8',
    timeout=60,
)
child.logfile_read = sys.stdout

try:
    # Select "production" profile
    child.expect('Which build profile do you want to configure?', timeout=30)
    child.sendline('\x1b[B')  # Arrow down to "production"
    child.expect('production', timeout=10)
    child.sendline('\r')  # Enter

    # Wait for next prompt
    child.expect(pexpect.EOF, timeout=30)
except pexpect.TIMEOUT:
    print("\n\n=== TIMEOUT - Current output so far ===")
    print(child.before)
    print(child.after)
except pexpect.EOF:
    print("\n\n=== EOF - Final output ===")
    print(child.before)
except Exception as e:
    print(f"\n\n=== Error: {e} ===")
    print(child.before if hasattr(child, 'before') else 'N/A')
finally:
    child.close()
    print(f"\nExit status: {child.exitstatus}")
