#!/bin/bash

set -o allexport
source .env
set +o allexport

rsync -rav src/* $REMOTE
