#!/bin/bash
# CloudBase CLI wrapper for WorkBuddy (Mac)
# Usage: bash .workbuddy/scripts/tcb.sh <command>

NODE="/Users/wenhua/.workbuddy/binaries/node/versions/22.22.2/bin/node"
TCB="/Users/wenhua/.workbuddy/binaries/node/workspace/node_modules/@cloudbase/cli/bin/tcb"

"$NODE" "$TCB" "$@"
