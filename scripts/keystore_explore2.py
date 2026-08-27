#!/usr/bin/env python3
"""Explore EAS credentials options - improved version with better output capture."""
import pexpect
import sys
import os
import time

child = pexpect.spawn(
    'npx eas-cli@latest credentials:configure-build --platform android',
    encoding='utf-8',
    timeout=120,
    maxread=4000,
)
child.logfile_read = sys.stdout

try:
    # Select "production" profile
    child.expect('Which build profile do you want to configure?', timeout=30)
    child.sendline('\x1b[B')  # Arrow down to production
    time.sleep(1)
    child.sendline('\r')  # Enter

    # Wait and read all output
    time.sleep(10)
    
    # Try to read more
    try:
        child.expect([pexpect.EOF, pexpect.TIMEOUT], timeout=15)
    except:
        pass
    
    print("\n\n=== ALL OUTPUT CAPTURED ===")
    # Print everything we captured
    if hasattr(child, 'buffer'):
        print("Buffer:", child.buffer)
    print("Before:", child.before)

except pexpect.TIMEOUT as e:
    print(f"\n\n=== TIMEOUT ===")
    print("Before:", child.before if hasattr(child, 'before') else 'N/A')
    print("After:", child.after if hasattr(child, 'after') else 'N/A')
except pexpect.EOF:
    print(f"\n\n=== EOF ===")
    print("Before:", child.before)
except Exception as e:
    print(f"\n\n=== Error: {e} ===")
    import traceback
    traceback.print_exc()
    print("Before:", child.before if hasattr(child, 'before') else 'N/A')
finally:
    child.close()
    print(f"\nExit status: {child.exitstatus}")
