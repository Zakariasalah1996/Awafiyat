#!/usr/bin/env python3
"""Check iOS credentials status in EAS."""
import pexpect
import sys

cmd = 'EXPO_TOKEN="${EXPO_TOKEN}" npx --yes eas-cli@latest credentials --platform ios'
child = pexpect.spawn('/bin/bash', ['-c', cmd], timeout=120, encoding='utf-8', cwd='/home/ubuntu/awafiyat-mobile')
child.logfile_read = sys.stdout

# Select "production" build profile
child.expect('build profile', timeout=60)
child.sendline('\x1b[B')  # Down to "production"
child.sendline('')  # Enter to select

# Wait for the main menu and read the output
try:
    child.expect('What do you want to do?', timeout=60)
except pexpect.TIMEOUT:
    pass

# Read what's displayed so far
print("\n\n=== iOS Credentials Status ===")

# Exit by selecting "Go back" (last option)
child.sendline('\x1b[B\x1b[B\x1b[B\x1b[B')  # Down 4 times to "Go back"
child.sendline('')

try:
    child.expect(pexpect.EOF, timeout=30)
except pexpect.TIMEOUT:
    pass
print("\nDone!")
