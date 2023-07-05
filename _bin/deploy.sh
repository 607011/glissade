#!/bin/bash

source .env

rsync -rav src/* $REMOTE
