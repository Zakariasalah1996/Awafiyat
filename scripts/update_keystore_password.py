#!/usr/bin/env python3
"""Update the key password in EAS credentials for Google Play Upload Key 2026."""
import pexpect
import sys
import json

# Read credentials from secure file
cred_path = '/home/ubuntu/.awafiyat-secrets/credentials.json'
with open(cred_path) as f:
    creds = json.load(f)

store_pass = creds['keystorePassword']
key_pass = creds['keyPassword']
alias = creds['keyAlias']

# Start EAS credentials manager
cmd = 'EXPO_TOKEN="${EXPO_TOKEN}" npx --yes eas-cli@latest credentials --platform android'
child = pexpect.spawn('/bin/bash', ['-c', cmd], timeout=120, encoding='utf-8', cwd='/home/ubuntu/awafiyat-mobile')
child.logfile_read = sys.stdout

# Select "production" build profile
child.expect('build profile', timeout=60)
child.sendline('\x1b[B')  # Down to "production"
child.sendline('')  # Enter to select

# Wait for the main menu
child.expect('What do you want to do?', timeout=60)
# Options: Set up a new keystore, Change default keystore, Download existing keystore, Delete your keystore, Go back
# Select "Set up a new keystore" (first option - already selected)
child.sendline('')

# Wait for credential name prompt
child.expect('name to your build credentials', timeout=30)
child.sendline('Google Play Upload Key 2026 Fixed')

# Wait for "set as default" prompt
child.expect('default', timeout=30)
child.sendline('y')

# Wait for "Generate a new Android Keystore?" prompt
child.expect('Generate a new Android Keystore', timeout=30)
child.sendline('n')

# Wait for keystore file path prompt
child.expect('Path to the Keystore file', timeout=30)
child.sendline('/home/ubuntu/upload/awafiyat-upload-key.jks')

# Wait for keystore password prompt
child.expect('Keystore password', timeout=30)
child.sendline(store_pass)

# Wait for key alias prompt
child.expect('Key alias', timeout=30)
child.sendline(alias)

# Wait for key password prompt
child.expect('Key password', timeout=30)
child.sendline(key_pass)

# Wait for completion or error
try:
    child.expect(pexpect.EOF, timeout=60)
except pexpect.TIMEOUT:
    pass
print("\n\nDone!")
