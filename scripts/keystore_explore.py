#!/usr/bin/env python3
"""Explore EAS credentials options to find keystore download/alias update."""
import pexpect
import sys
import os
import time

child = pexpect.spawn(
    'npx eas-cli@latest credentials:configure-build --platform android',
    encoding='utf-8',
    timeout=90,
)
child.logfile_read = sys.stdout

try:
    # Select "production" profile
    child.expect('Which build profile do you want to configure?', timeout=30)
    child.sendline('\x1b[B')  # Arrow down to production
    time.sleep(0.5)
    child.sendline('\r')  # Enter

    # Wait for any next prompt
    time.sleep(5)
    output = child.before
    print(f"\n\n=== AFTER PROFILE SELECTION ===")
    print(output)
    
    # Check if there are more prompts
    index = child.expect([
        'Keystore', 'keystore', 'Google Play', 'Upload', 'Build Credentials',
        'Let EAS', 'Set up', 'new', 'existing', 'Switch', 'Download',
        'What', 'How', 'Would', 'Do you', 'Select', 'Choose',
        pexpect.EOF, pexpect.TIMEOUT
    ], timeout=15)
    
    if index < 14:
        print(f"\n=== FOUND PROMPT (index={index}) ===")
        print(f"Matched: {child.after}")
        print(f"Before: {child.before}")
        # Wait for full prompt
        time.sleep(3)
        print(f"\n=== FULL CONTEXT ===")
        print(child.before)
        print(child.after)
        # Try to see remaining output
        child.expect([pexpect.EOF, pexpect.TIMEOUT], timeout=10)
        print(f"\n=== REMAINING ===")
        print(child.before)
    else:
        print(f"\n=== EOF/TIMEOUT (index={index}) ===")
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
