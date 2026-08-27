#!/usr/bin/env python3
"""Interact with EAS credentials:configure-build to download keystore."""
import pexpect
import sys
import os
import time

child = pexpect.spawn(
    'npx eas-cli@latest credentials:configure-build --platform android',
    encoding='utf-8',
    timeout=60,
)
child.logfile_read = sys.stdout

try:
    # Select "production" profile
    child.expect('Which build profile do you want to configure?', timeout=30)
    child.sendline('\x1b[B')  # Arrow down
    time.sleep(0.5)
    child.sendline('\r')  # Enter

    # Wait for next prompt
    time.sleep(3)
    print(f"\n\n=== AFTER PROFILE SELECTION ===")
    print(child.before)
    
    # Try to see what comes next
    child.expect([pexpect.EOF, pexpect.TIMEOUT], timeout=10)
    print(f"\n=== FINAL OUTPUT ===")
    print(child.before)

except pexpect.TIMEOUT:
    print("\n\n=== TIMEOUT ===")
    print(child.before)
    print(child.after)
except pexpect.EOF:
    print("\n\n=== EOF ===")
    print(child.before)
except Exception as e:
    print(f"\n\n=== Error: {e} ===")
    print(child.before if hasattr(child, 'before') else 'N/A')
finally:
    child.close()
    print(f"\nExit status: {child.exitstatus}")
